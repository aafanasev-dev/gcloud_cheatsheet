"""Image storage API (Cloud Run).

Clients never send image bytes through this service. They ask for a V4 signed
URL and PUT the file straight into the uploads bucket. Eventarc then triggers
the processor, which fills in the Firestore document this API reads from.

Signing on Cloud Run uses the IAM signBlob API, so the runtime service account
needs roles/iam.serviceAccountTokenCreator on itself (no key file).
"""
import os
import uuid
from datetime import datetime, timedelta, timezone
from functools import lru_cache

import google.auth
from fastapi import FastAPI, HTTPException, Query
from google.auth.transport import requests as auth_requests
from google.cloud import firestore, storage
from pydantic import BaseModel

ALLOWED = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
URL_TTL = timedelta(minutes=15)

app = FastAPI(title="Image storage API")


@lru_cache
def gcs() -> storage.Client:
    return storage.Client()


@lru_cache
def db() -> firestore.Client:
    return firestore.Client()


def images():
    return db().collection("images")


def sign(bucket: str, name: str, method: str = "GET", content_type: str | None = None) -> str:
    creds, _ = google.auth.default()
    creds.refresh(auth_requests.Request())  # fresh token for the signBlob call
    return gcs().bucket(bucket).blob(name).generate_signed_url(
        version="v4",
        expiration=URL_TTL,
        method=method,
        content_type=content_type,
        service_account_email=creds.service_account_email,
        access_token=creds.token,
    )


class UploadRequest(BaseModel):
    content_type: str
    filename: str | None = None


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.post("/uploads", status_code=201)
def create_upload(req: UploadRequest):
    ext = ALLOWED.get(req.content_type)
    if not ext:
        raise HTTPException(415, f"content_type must be one of {sorted(ALLOWED)}")
    image_id = uuid.uuid4().hex
    obj = f"{image_id}.{ext}"
    bucket = os.environ["UPLOADS_BUCKET"]
    images().document(image_id).set({
        "object": obj,
        "filename": req.filename,
        "content_type": req.content_type,
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
    })
    return {
        "id": image_id,
        "upload_url": sign(bucket, obj, "PUT", req.content_type),
        "method": "PUT",
        "headers": {"Content-Type": req.content_type},
        "expires_in": int(URL_TTL.total_seconds()),
    }


@app.get("/images")
def list_images(tag: str | None = None, limit: int = Query(20, le=100)):
    q = images().where("status", "==", "ready")
    if tag:
        q = q.where("tags", "array_contains", tag.lower())
    q = q.order_by("created_at", direction=firestore.Query.DESCENDING).limit(limit)
    return [{"id": d.id, **{k: d.get(k) for k in ("caption", "tags", "width", "height", "created_at")}} for d in q.stream()]


@app.get("/images/{image_id}")
def get_image(image_id: str):
    doc = images().document(image_id).get()
    if not doc.exists:
        raise HTTPException(404, "image not found")
    data = doc.to_dict()
    if data["status"] == "ready":
        data["original_url"] = sign(os.environ["UPLOADS_BUCKET"], data["object"])
        data["thumbnail_url"] = sign(os.environ["THUMBS_BUCKET"], data["thumbnail"])
        if data.get("variant"):
            data["variant_url"] = sign(os.environ["THUMBS_BUCKET"], data["variant"])
    return {"id": image_id, **data}


@app.delete("/images/{image_id}", status_code=204)
def delete_image(image_id: str):
    ref = images().document(image_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(404, "image not found")
    data = doc.to_dict()
    for bucket, key in ((os.environ["UPLOADS_BUCKET"], "object"), (os.environ["THUMBS_BUCKET"], "thumbnail"),
                        (os.environ["THUMBS_BUCKET"], "variant")):
        if data.get(key):
            gcs().bucket(bucket).blob(data[key]).delete(if_generation_match=None)
    ref.delete()
