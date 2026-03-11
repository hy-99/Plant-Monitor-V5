import base64
import io
import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Literal

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel


class ImageData(BaseModel):
    mimeType: str
    data: str


class PdddResponse(BaseModel):
    disease_name: str
    disease_confidence: float
    health_status: Literal["Healthy", "Unhealthy"]


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
            disease_name="Model unavailable",
            disease_confidence=0.0,
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
    except Exception as exc:
        print("Failed to decode image for PDDD:", exc)
        return PdddResponse(
            disease_name="Decode error",
            disease_confidence=0.0,
            health_status="Healthy",
        )

    try:
        return run_pddd_model(pil_img)
    except Exception as exc:
        print("PDDD inference failed:", exc)
        return PdddResponse(
            disease_name="Inference error",
            disease_confidence=0.0,
            health_status="Healthy",
        )
