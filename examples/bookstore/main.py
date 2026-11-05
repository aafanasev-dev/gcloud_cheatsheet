"""Bookstore API: books in Cloud SQL, orders streamed to BigQuery via Pub/Sub,
blurbs and recommendations written by Gemini.

Runs on Cloud Run as a dedicated service account. Every Google credential comes
from Application Default Credentials. The only secret (the DB password) is
injected from Secret Manager as the DB_PASS env var.
"""
import json
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from functools import lru_cache

import sqlalchemy
from fastapi import FastAPI, HTTPException
from google import genai
from google.cloud import pubsub_v1
from google.cloud.sql.connector import Connector
from google.genai import types
from pydantic import BaseModel, Field

MODEL = os.environ.get("MODEL", "gemini-2.5-flash")
SCHEMA = open(os.path.join(os.path.dirname(__file__), "schema.sql")).read()


# ---------- clients (created lazily so importing the module needs no GCP) ----------

@lru_cache
def engine() -> sqlalchemy.Engine:
    connector = Connector()

    def connect():
        return connector.connect(
            os.environ["INSTANCE_CONNECTION_NAME"],  # PROJECT:REGION:INSTANCE
            "pg8000",
            user=os.environ["DB_USER"],
            password=os.environ["DB_PASS"],
            db=os.environ.get("DB_NAME", "bookstore"),
        )

    return sqlalchemy.create_engine("postgresql+pg8000://", creator=connect, pool_size=5, pool_pre_ping=True)


@lru_cache
def publisher() -> pubsub_v1.PublisherClient:
    return pubsub_v1.PublisherClient()


@lru_cache
def gemini() -> genai.Client:
    # Project/location/backend come from GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION
    # and GOOGLE_GENAI_USE_ENTERPRISE (GOOGLE_GENAI_USE_VERTEXAI on older SDKs).
    return genai.Client()


@asynccontextmanager
async def lifespan(_: FastAPI):
    if os.environ.get("INSTANCE_CONNECTION_NAME"):
        with engine().begin() as conn:
            for stmt in filter(str.strip, SCHEMA.split(";")):
                conn.execute(sqlalchemy.text(stmt))
    yield


app = FastAPI(title="Bookstore", lifespan=lifespan)


# ---------- models ----------

class BookIn(BaseModel):
    title: str
    author: str
    price: float = Field(gt=0)
    description: str | None = None


class Blurb(BaseModel):
    blurb: str
    genres: list[str]


class Suggestion(BaseModel):
    title: str
    author: str
    reason: str


class OrderIn(BaseModel):
    book_id: int
    quantity: int = Field(gt=0, le=100)
    customer: str


# ---------- Gemini helpers ----------

def write_blurb(title: str, author: str) -> Blurb:
    resp = gemini().models.generate_content(
        model=MODEL,
        contents=f'Write a 2-sentence bookstore blurb for "{title}" by {author}, and list up to 3 genres.',
        config=types.GenerateContentConfig(
            response_mime_type="application/json", response_schema=Blurb, temperature=0.7
        ),
    )
    return resp.parsed


def suggest_similar(title: str, author: str) -> list[Suggestion]:
    resp = gemini().models.generate_content(
        model=MODEL,
        contents=f'Recommend 3 real books for a reader who loved "{title}" by {author}.',
        config=types.GenerateContentConfig(
            system_instruction="You are an experienced independent bookseller. Only suggest books that exist.",
            response_mime_type="application/json",
            response_schema=list[Suggestion],
        ),
    )
    return resp.parsed


# ---------- routes ----------

def row_to_book(row) -> dict:
    return dict(row._mapping) | {"price": float(row.price), "genres": json.loads(row.genres or "[]")}


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.get("/books")
def list_books(limit: int = 50):
    with engine().connect() as conn:
        rows = conn.execute(sqlalchemy.text("SELECT * FROM books ORDER BY id DESC LIMIT :l"), {"l": limit})
        return [row_to_book(r) for r in rows]


@app.get("/books/{book_id}")
def get_book(book_id: int):
    with engine().connect() as conn:
        row = conn.execute(sqlalchemy.text("SELECT * FROM books WHERE id = :id"), {"id": book_id}).first()
    if not row:
        raise HTTPException(404, "book not found")
    return row_to_book(row)


@app.post("/books", status_code=201)
def create_book(book: BookIn):
    genres: list[str] = []
    description = book.description
    if not description:
        blurb = write_blurb(book.title, book.author)
        description, genres = blurb.blurb, blurb.genres
    with engine().begin() as conn:
        row = conn.execute(
            sqlalchemy.text(
                "INSERT INTO books (title, author, price, description, genres) "
                "VALUES (:t, :a, :p, :d, :g) RETURNING *"
            ),
            {"t": book.title, "a": book.author, "p": book.price, "d": description, "g": json.dumps(genres)},
        ).first()
    return row_to_book(row)


@app.get("/books/{book_id}/similar")
def similar(book_id: int):
    book = get_book(book_id)
    return [s.model_dump() for s in suggest_similar(book["title"], book["author"])]


@app.post("/orders", status_code=201)
def create_order(order: OrderIn):
    book = get_book(order.book_id)
    event = {
        "order_id": str(uuid.uuid4()),
        "book_id": order.book_id,
        "title": book["title"],
        "quantity": order.quantity,
        "amount": round(book["price"] * order.quantity, 2),
        "customer": order.customer,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    with engine().begin() as conn:
        conn.execute(
            sqlalchemy.text(
                "INSERT INTO orders (id, book_id, quantity, amount, customer) VALUES (:i, :b, :q, :a, :c)"
            ),
            {"i": event["order_id"], "b": order.book_id, "q": order.quantity, "a": event["amount"], "c": order.customer},
        )
    # The BigQuery subscription maps these JSON fields onto table columns.
    topic = publisher().topic_path(os.environ["GOOGLE_CLOUD_PROJECT"], os.environ.get("ORDERS_TOPIC", "orders"))
    publisher().publish(topic, json.dumps(event).encode(), source="bookstore").result(timeout=10)
    return event
