import base64
import hashlib
import io
import json
import os
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from threading import Lock
from typing import Any, Literal
from uuid import uuid4

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


DATA_FILE = Path(__file__).with_name("data.json")
DATA_LOCK = Lock()
STORAGE_LIMIT_BYTES = 25 * 1024 * 1024


def default_store() -> dict[str, Any]:
    return {
        "users": [],
        "tokens": {},
        "plants": [],
        "reminders": [],
        "chat_messages": [],
    }


def load_store() -> dict[str, Any]:
    if not DATA_FILE.exists():
        return default_store()
    try:
        data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            base = default_store()
            base.update(data)
            return base
    except Exception:
        pass
    return default_store()


def save_store(store: dict[str, Any]) -> None:
    DATA_FILE.write_text(json.dumps(store, indent=2), encoding="utf-8")


def with_store(callback):
    with DATA_LOCK:
        store = load_store()
        result = callback(store)
        save_store(store)
        return result


def get_user_id_from_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing auth token.")
    token = authorization.split(" ", 1)[1].strip()
    store = load_store()
    user_id = store["tokens"].get(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid auth token.")
    return user_id


def get_user_record(store: dict[str, Any], user_id: str) -> dict[str, Any]:
    user = next((item for item in store["users"] if item["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


def get_public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user["id"],
        "name": user["name"],
        "username": user["username"],
        "createdAt": user["createdAt"],
    }


def compute_storage_usage(store: dict[str, Any], user_id: str) -> dict[str, int]:
    total = 0
    for plant in store["plants"]:
        if plant["userId"] != user_id:
            continue
        for snapshot in plant["snapshots"]:
            total += len((snapshot.get("imageDataUrl") or "").encode("utf-8"))
    return {
        "bytesUsed": total,
        "bytesLimit": STORAGE_LIMIT_BYTES,
        "bytesRemaining": max(STORAGE_LIMIT_BYTES - total, 0),
    }


class ImageData(BaseModel):
    mimeType: str
    data: str


class PdddResponse(BaseModel):
    disease_name: str
    disease_confidence: float
    health_status: Literal["Healthy", "Unhealthy"]


class RegisterPayload(BaseModel):
    name: str
    username: str
    password: str


class LoginPayload(BaseModel):
    username: str
    password: str


class UpdateUserPayload(BaseModel):
    name: str


class PlantPayload(BaseModel):
    name: str
    imageDataUrl: str


class RenamePlantPayload(BaseModel):
    name: str


class SnapshotPayload(BaseModel):
    imageDataUrl: str


class FeedbackPayload(BaseModel):
    rating: Literal["correct", "incorrect"]
    comment: str | None = None


class ReminderPayload(BaseModel):
    plantId: str | None
    title: str
    notes: str | None = None
    dueAt: str
    recurrence: Literal["none", "daily", "weekly", "monthly"]


class ChatPayload(BaseModel):
    question: str
    plantId: str | None
    mode: Literal["plant", "casual", "web"]
    history: list[dict[str, Any]]


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@lru_cache(maxsize=1)
def load_model_bundle():
    model_path = os.getenv("PDDD_MODEL_PATH")
    labels_path = os.getenv("PDDD_LABELS_PATH")
    healthy_labels = {
        label.strip().lower()
        for label in os.getenv("PDDD_HEALTHY_LABELS", "healthy,normal,no_disease").split(",")
        if label.strip()
    }

    if not model_path or not labels_path:
        return None

    model_file = Path(model_path)
    labels_file = Path(labels_path)
    if not model_file.exists() or not labels_file.exists():
        return None

    labels = json.loads(labels_file.read_text(encoding="utf-8"))
    if not isinstance(labels, list) or not labels:
        raise RuntimeError("PDDD_LABELS_PATH must point to a JSON array of class labels.")

    session = ort.InferenceSession(str(model_file), providers=["CPUExecutionProvider"])
    input_meta = session.get_inputs()[0]
    shape = input_meta.shape
    input_height = int(shape[2] if len(shape) > 2 and isinstance(shape[2], int) else 224)
    input_width = int(shape[3] if len(shape) > 3 and isinstance(shape[3], int) else 224)

    return {
        "session": session,
        "input_name": input_meta.name,
        "width": input_width,
        "height": input_height,
        "labels": labels,
        "healthy_labels": healthy_labels,
    }


def preprocess_image(img: Image.Image, width: int, height: int):
    resized = img.resize((width, height))
    array = np.asarray(resized, dtype=np.float32) / 255.0
    array = np.transpose(array, (2, 0, 1))
    return np.expand_dims(array, axis=0)


def softmax(values: np.ndarray):
    shifted = values - np.max(values)
    exp = np.exp(shifted)
    return exp / np.sum(exp)


def run_pddd_model(img: Image.Image) -> PdddResponse:
    bundle = load_model_bundle()
    if not bundle:
        return PdddResponse(
            disease_name="Healthy",
            disease_confidence=0.64,
            health_status="Healthy",
        )

    tensor = preprocess_image(img, bundle["width"], bundle["height"])
    outputs = bundle["session"].run(None, {bundle["input_name"]: tensor})
    logits = np.asarray(outputs[0]).squeeze()
    probabilities = softmax(logits)
    best_index = int(np.argmax(probabilities))
    disease_name = bundle["labels"][best_index]
    confidence = float(probabilities[best_index])
    health_status: Literal["Healthy", "Unhealthy"] = (
        "Healthy" if disease_name.strip().lower() in bundle["healthy_labels"] else "Unhealthy"
    )

    return PdddResponse(
        disease_name=disease_name,
        disease_confidence=confidence,
        health_status=health_status,
    )


def make_analysis_result(image_data_url: str) -> tuple[dict[str, Any], str]:
    summary = "This looks like a local fallback analysis generated inside Plant Guard V5."
    health = "Healthy"
    disease = None

    try:
        _, encoded = image_data_url.split(",", 1)
        pil_img = Image.open(io.BytesIO(base64.b64decode(encoded))).convert("RGB")
        pddd = run_pddd_model(pil_img)
        health = "Healthy" if pddd.health_status == "Healthy" else "Unhealthy"
        if pddd.health_status != "Healthy":
            disease = {
                "name": pddd.disease_name,
                "severity": "Medium",
                "recommendations": [
                    "Isolate the plant and inspect affected leaves.",
                    "Reduce overhead watering until symptoms settle.",
                    "Monitor the next few days for spread or improvement.",
                ],
            }
        summary = (
            "The plant looks healthy overall."
            if pddd.health_status == "Healthy"
            else f"The plant may be dealing with {pddd.disease_name.lower()}."
        )
    except Exception:
        pass

    analysis = {
        "isPlant": True,
        "confidence": 0.88,
        "plantGateSource": "other",
        "plantGateConfidence": 0.88,
        "species": "Unknown plant",
        "commonName": "Unknown",
        "speciesCandidates": [
            {"name": "Houseplant", "confidence": 0.54},
            {"name": "Foliage plant", "confidence": 0.31},
        ],
        "health": health if health in {"Healthy", "Unhealthy"} else "Unknown",
        "height": None,
        "width": None,
        "disease": disease,
        "advice": [
            {"title": "Light", "description": "Keep the plant in steady indirect light."},
            {"title": "Water", "description": "Check the top soil before watering again."},
            {"title": "Monitoring", "description": "Track new growth and leaf changes over time."},
        ],
    }
    return analysis, summary


@app.get("/pddd/health")
async def health():
    bundle = load_model_bundle()
    return {
        "ok": True,
        "modelLoaded": bool(bundle),
        "modelPath": os.getenv("PDDD_MODEL_PATH"),
        "labelsPath": os.getenv("PDDD_LABELS_PATH"),
    }


@app.post("/pddd/analyze", response_model=PdddResponse)
async def analyze(image: ImageData) -> PdddResponse:
    try:
        img_bytes = base64.b64decode(image.data)
        pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception:
        return PdddResponse(
            disease_name="Decode error",
            disease_confidence=0.0,
            health_status="Healthy",
        )

    try:
        return run_pddd_model(pil_img)
    except Exception:
        return PdddResponse(
            disease_name="Inference error",
            disease_confidence=0.0,
            health_status="Healthy",
        )


@app.post("/auth/register")
async def register(payload: RegisterPayload):
    username = payload.username.strip().lower()
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters.")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    def callback(store: dict[str, Any]):
        if any(user["username"] == username for user in store["users"]):
            raise HTTPException(status_code=400, detail="Username already exists.")
        user = {
            "id": uuid4().hex,
            "name": payload.name.strip() or "Grower",
            "username": username,
            "passwordHash": hash_password(payload.password),
            "createdAt": utc_now(),
        }
        token = uuid4().hex
        store["users"].append(user)
        store["tokens"][token] = user["id"]
        return {"token": token, "user": get_public_user(user)}

    return with_store(callback)


@app.post("/auth/login")
async def login(payload: LoginPayload):
    username = payload.username.strip().lower()
    store = load_store()
    user = next((item for item in store["users"] if item["username"] == username), None)
    if not user or user["passwordHash"] != hash_password(payload.password):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    token = uuid4().hex
    def callback(next_store: dict[str, Any]):
        next_store["tokens"][token] = user["id"]
        return {"token": token, "user": get_public_user(user)}

    return with_store(callback)


@app.get("/auth/me")
async def auth_me(authorization: str | None = Header(default=None, alias="Authorization")):
    user_id = get_user_id_from_token(authorization)
    store = load_store()
    return {"user": get_public_user(get_user_record(store, user_id))}


@app.patch("/auth/me")
async def update_auth_me(payload: UpdateUserPayload, authorization: str | None = Header(default=None, alias="Authorization")):
    user_id = get_user_id_from_token(authorization)

    def callback(store: dict[str, Any]):
        user = get_user_record(store, user_id)
        user["name"] = payload.name.strip() or user["name"]
        return {"user": get_public_user(user)}

    return with_store(callback)


@app.get("/plants")
async def get_plants_route(authorization: str | None = Header(default=None, alias="Authorization")):
    user_id = get_user_id_from_token(authorization)
    store = load_store()
    plants = [
        {"id": plant["id"], "name": plant["name"], "snapshots": plant["snapshots"]}
        for plant in store["plants"]
        if plant["userId"] == user_id
    ]
    return {"plants": plants}


@app.post("/plants")
async def create_plant_route(payload: PlantPayload, authorization: str | None = Header(default=None, alias="Authorization")):
    user_id = get_user_id_from_token(authorization)
    analysis, summary = make_analysis_result(payload.imageDataUrl)
    snapshot = {
        "id": uuid4().hex,
        "imageUrl": payload.imageDataUrl,
        "imageDataUrl": payload.imageDataUrl,
        "analysis": analysis,
        "timestamp": utc_now(),
        "summary": summary,
    }

    def callback(store: dict[str, Any]):
        plant = {
            "id": uuid4().hex,
            "userId": user_id,
            "name": payload.name.strip() or "Untitled plant",
            "snapshots": [snapshot],
        }
        store["plants"].insert(0, plant)
        return {"plant": {"id": plant["id"], "name": plant["name"], "snapshots": plant["snapshots"]}, "usage": compute_storage_usage(store, user_id)}

    return with_store(callback)


@app.patch("/plants/{plant_id}")
async def rename_plant_route(plant_id: str, payload: RenamePlantPayload, authorization: str | None = Header(default=None, alias="Authorization")):
    user_id = get_user_id_from_token(authorization)

    def callback(store: dict[str, Any]):
        plant = next((item for item in store["plants"] if item["id"] == plant_id and item["userId"] == user_id), None)
        if not plant:
            raise HTTPException(status_code=404, detail="Plant not found.")
        plant["name"] = payload.name.strip() or plant["name"]
        return {"plant": {"id": plant["id"], "name": plant["name"]}}

    return with_store(callback)


@app.post("/plants/{plant_id}/snapshots")
async def add_snapshot_route(plant_id: str, payload: SnapshotPayload, authorization: str | None = Header(default=None, alias="Authorization")):
    user_id = get_user_id_from_token(authorization)
    analysis, summary = make_analysis_result(payload.imageDataUrl)
    snapshot = {
        "id": uuid4().hex,
        "imageUrl": payload.imageDataUrl,
        "imageDataUrl": payload.imageDataUrl,
        "analysis": analysis,
        "timestamp": utc_now(),
        "summary": summary,
    }

    def callback(store: dict[str, Any]):
        plant = next((item for item in store["plants"] if item["id"] == plant_id and item["userId"] == user_id), None)
        if not plant:
            raise HTTPException(status_code=404, detail="Plant not found.")
        plant["snapshots"].append(snapshot)
        return {"snapshot": snapshot, "usage": compute_storage_usage(store, user_id)}

    return with_store(callback)


@app.delete("/plants/{plant_id}/snapshots/{snapshot_id}")
async def delete_snapshot_route(plant_id: str, snapshot_id: str, authorization: str | None = Header(default=None, alias="Authorization")):
    user_id = get_user_id_from_token(authorization)

    def callback(store: dict[str, Any]):
        plant = next((item for item in store["plants"] if item["id"] == plant_id and item["userId"] == user_id), None)
        if not plant:
            raise HTTPException(status_code=404, detail="Plant not found.")
        before = len(plant["snapshots"])
        plant["snapshots"] = [snapshot for snapshot in plant["snapshots"] if snapshot["id"] != snapshot_id]
        if len(plant["snapshots"]) == before:
            raise HTTPException(status_code=404, detail="Snapshot not found.")
        if not plant["snapshots"]:
            store["plants"] = [item for item in store["plants"] if item["id"] != plant_id]
        return None

    with_store(callback)
    return {}


@app.patch("/plants/{plant_id}/snapshots/{snapshot_id}/feedback")
async def save_feedback_route(
    plant_id: str,
    snapshot_id: str,
    payload: FeedbackPayload,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    user_id = get_user_id_from_token(authorization)

    def callback(store: dict[str, Any]):
        plant = next((item for item in store["plants"] if item["id"] == plant_id and item["userId"] == user_id), None)
        if not plant:
            raise HTTPException(status_code=404, detail="Plant not found.")
        snapshot = next((item for item in plant["snapshots"] if item["id"] == snapshot_id), None)
        if not snapshot:
            raise HTTPException(status_code=404, detail="Snapshot not found.")
        snapshot["analysis"]["feedback"] = {"rating": payload.rating, "comment": payload.comment}
        return {"snapshot": {"id": snapshot["id"], "analysis": snapshot["analysis"]}}

    return with_store(callback)


@app.get("/storage")
async def get_storage_route(authorization: str | None = Header(default=None, alias="Authorization")):
    user_id = get_user_id_from_token(authorization)
    store = load_store()
    return {"usage": compute_storage_usage(store, user_id)}


@app.get("/reminders")
async def get_reminders_route(authorization: str | None = Header(default=None, alias="Authorization")):
    user_id = get_user_id_from_token(authorization)
    store = load_store()
    reminders = [item for item in store["reminders"] if item["userId"] == user_id]
    return {"reminders": reminders}


def reminder_record(user_id: str, payload: ReminderPayload) -> dict[str, Any]:
    now = utc_now()
    return {
        "id": uuid4().hex,
        "userId": user_id,
        "plantId": payload.plantId,
        "title": payload.title,
        "notes": payload.notes,
        "dueAt": payload.dueAt,
        "recurrence": payload.recurrence,
        "completedAt": None,
        "lastCompletedAt": None,
        "createdAt": now,
        "updatedAt": now,
    }


@app.post("/reminders")
async def create_reminder_route(payload: ReminderPayload, authorization: str | None = Header(default=None, alias="Authorization")):
    user_id = get_user_id_from_token(authorization)

    def callback(store: dict[str, Any]):
        reminder = reminder_record(user_id, payload)
        store["reminders"].append(reminder)
        return {"reminder": reminder}

    return with_store(callback)


@app.patch("/reminders/{reminder_id}")
async def update_reminder_route(reminder_id: str, payload: ReminderPayload, authorization: str | None = Header(default=None, alias="Authorization")):
    user_id = get_user_id_from_token(authorization)

    def callback(store: dict[str, Any]):
        reminder = next((item for item in store["reminders"] if item["id"] == reminder_id and item["userId"] == user_id), None)
        if not reminder:
            raise HTTPException(status_code=404, detail="Reminder not found.")
        reminder.update(
            {
                "plantId": payload.plantId,
                "title": payload.title,
                "notes": payload.notes,
                "dueAt": payload.dueAt,
                "recurrence": payload.recurrence,
                "updatedAt": utc_now(),
            }
        )
        return {"reminder": reminder}

    return with_store(callback)


@app.patch("/reminders/{reminder_id}/complete")
async def complete_reminder_route(reminder_id: str, authorization: str | None = Header(default=None, alias="Authorization")):
    user_id = get_user_id_from_token(authorization)

    def callback(store: dict[str, Any]):
        reminder = next((item for item in store["reminders"] if item["id"] == reminder_id and item["userId"] == user_id), None)
        if not reminder:
            raise HTTPException(status_code=404, detail="Reminder not found.")
        now = utc_now()
        reminder["completedAt"] = now
        reminder["lastCompletedAt"] = now
        reminder["updatedAt"] = now
        return {"reminder": reminder}

    return with_store(callback)


@app.delete("/reminders/{reminder_id}")
async def delete_reminder_route(reminder_id: str, authorization: str | None = Header(default=None, alias="Authorization")):
    user_id = get_user_id_from_token(authorization)

    def callback(store: dict[str, Any]):
        before = len(store["reminders"])
        store["reminders"] = [item for item in store["reminders"] if not (item["id"] == reminder_id and item["userId"] == user_id)]
        if len(store["reminders"]) == before:
            raise HTTPException(status_code=404, detail="Reminder not found.")
        return None

    with_store(callback)
    return {}


@app.get("/chat/history")
async def get_chat_history_route(plantId: str | None = None, authorization: str | None = Header(default=None, alias="Authorization")):
    user_id = get_user_id_from_token(authorization)
    store = load_store()
    messages = [
        item for item in store["chat_messages"]
        if item["userId"] == user_id and item.get("plantId") == plantId
    ]
    return {"messages": messages}


@app.post("/chat")
async def send_chat_route(payload: ChatPayload, authorization: str | None = Header(default=None, alias="Authorization")):
    user_id = get_user_id_from_token(authorization)
    now = utc_now()
    user_message = {
        "id": f"user-{uuid4().hex}",
        "role": "user",
        "content": payload.question,
        "createdAt": now,
        "mode": payload.mode,
        "plantId": payload.plantId,
        "sources": [],
        "userId": user_id,
    }
    assistant_content = (
        f"Ghost assistant heard: {payload.question}"
        if payload.mode != "web"
        else f"Web mode is not connected in this local backend yet, but I received: {payload.question}"
    )
    assistant_message = {
        "id": f"assistant-{uuid4().hex}",
        "role": "assistant",
        "content": assistant_content,
        "createdAt": now,
        "mode": payload.mode,
        "plantId": payload.plantId,
        "sources": [],
        "userId": user_id,
    }

    def callback(store: dict[str, Any]):
        store["chat_messages"].extend([user_message, assistant_message])
        return {
            "answer": assistant_content,
            "sources": [],
            "messages": [
                {k: v for k, v in user_message.items() if k != "userId"},
                {k: v for k, v in assistant_message.items() if k != "userId"},
            ],
        }

    return with_store(callback)


@app.post("/guest/analyze")
async def guest_analyze_route(payload: dict[str, str]):
    image_data_url = payload.get("imageDataUrl", "")
    analysis, summary = make_analysis_result(image_data_url)
    return {"summary": summary, "analysis": analysis}
