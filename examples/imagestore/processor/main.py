"""Image processor (Cloud Run, invoked by Eventarc on object finalize).

For each uploaded image:
  1. make a 320px JPEG thumbnail with Pillow
  2. ask Gemini for a caption, tags and a safety verdict
  3. optionally generate a stylised variant with a Gemini image model
  4. update the Firestore document and append a row to the BigQuery catalog,
     which is shared with other teams through Analytics Hub
"""
import io
import os
from datetime import datetime, timezone
from functools import lru_cache

from fastapi import FastAPI, Request, Response
from google import genai
from google.cloud import bigquery, firestore, storage
from google.genai import types
from PIL import Image
from pydantic import BaseModel

MODEL = os.environ.get("MODEL", "gemini-2.5-flash")
IMAGE_MODEL = os.environ.get("IMAGE_MODEL", "gemini-2.5-flash-image")
STYLE = os.environ.get("VARIANT_STYLE", "")  # e.g. "watercolour painting"; empty disables variants
THUMB_PX = 320

app = FastAPI(title="Image processor")


@lru_cache
def gcs() -> storage.Client:
    return storage.Client()


@lru_cache
def db() -> firestore.Client:
    return firestore.Client()


@lru_cache
def bq() -> bigquery.Client:
    return bigquery.Client()


@lru_cache
def gemini() -> genai.Client:
    return genai.Client()  # configured by GOOGLE_CLOUD_* / GOOGLE_GENAI_USE_* env vars


class Analysis(BaseModel):
    caption: str
    tags: list[str]
    safe: bool


def thumbnail(data: bytes) -> tuple[bytes, int, int]:
    img = Image.open(io.BytesIO(data))
    width, height = img.size
    img = img.convert("RGB")
    img.thumbnail((THUMB_PX, THUMB_PX))
    out = io.BytesIO()
    img.save(out, "JPEG", quality=85)
    return out.getvalue(), width, height


def analyse(uri: str, mime: str) -> Analysis:
    resp = gemini().models.generate_content(
        model=MODEL,
        contents=[
            types.Part.from_uri(file_uri=uri, mime_type=mime),
            "Describe this photo for a searchable image library: a one-sentence caption, "
            "5-10 lowercase single-word tags, and whether it is safe for a general audience.",
        ],
        config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=Analysis),
    )
    return resp.parsed


def stylise(data: bytes, mime: str) -> bytes | None:
    resp = gemini().models.generate_content(
        model=IMAGE_MODEL,
        contents=[types.Part.from_bytes(data=data, mime_type=mime), f"Redraw this image as a {STYLE}."],
        config=types.GenerateContentConfig(response_modalities=["IMAGE"]),
    )
    for part in resp.candidates[0].content.parts:
        if part.inline_data:
            return part.inline_data.data
    return None


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.post("/")
async def handle(request: Request):
    # Eventarc delivers the Cloud Storage object resource as the CloudEvent data.
    obj = await request.json()
    bucket, name, mime = obj["bucket"], obj["name"], obj.get("contentType", "")
    if not mime.startswith("image/"):
        return Response(status_code=204)  # ignore non-images

    image_id = name.rsplit(".", 1)[0]
    thumbs = os.environ["THUMBS_BUCKET"]
    data = gcs().bucket(bucket).blob(name).download_as_bytes()

    thumb, width, height = thumbnail(data)
    thumb_name = f"thumbs/{image_id}.jpg"
    gcs().bucket(thumbs).blob(thumb_name).upload_from_string(thumb, content_type="image/jpeg")

    result = analyse(f"gs://{bucket}/{name}", mime)
    tags = sorted({t.strip().lower() for t in result.tags if t.strip()})

    variant_name = None
    if STYLE and result.safe:
        variant = stylise(data, mime)
        if variant:
            variant_name = f"variants/{image_id}.png"
            gcs().bucket(thumbs).blob(variant_name).upload_from_string(variant, content_type="image/png")

    now = datetime.now(timezone.utc)
    db().collection("images").document(image_id).set({
        "object": name, "content_type": mime, "bytes": len(data), "width": width, "height": height,
        "caption": result.caption, "tags": tags, "safe": result.safe,
        "thumbnail": thumb_name, "variant": variant_name,
        "status": "ready" if result.safe else "flagged", "processed_at": now,
    }, merge=True)

    # row_ids makes Eventarc retries best-effort idempotent in BigQuery.
    errors = bq().insert_rows_json(os.environ["CATALOG_TABLE"], [{
        "id": image_id, "object": f"gs://{bucket}/{name}", "content_type": mime,
        "bytes": len(data), "width": width, "height": height,
        "caption": result.caption, "tags": tags, "safe": result.safe,
        "processed_at": now.isoformat(),
    }], row_ids=[image_id])
    if errors:
        raise RuntimeError(f"BigQuery insert failed: {errors}")  # 500 → Eventarc retries
    return Response(status_code=204)
