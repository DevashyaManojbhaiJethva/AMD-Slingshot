from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.deps import get_current_user_id, get_db
from app.schemas import AnalyzeResponse
from app.services.model_service import run_inference
from app.services.storage_service import save_upload_file
from app.services.weather_service import fetch_weather


router = APIRouter(prefix="", tags=["analysis"])
logger = logging.getLogger(__name__)


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_soil(
    latitude: float = Form(...),
    longitude: float = Form(...),
    soil_depth_cm: float = Form(..., alias="soilDepthCm"),
    temperature_c: float | None = Form(default=None, alias="temperatureC"),
    humidity: float | None = Form(default=None, alias="humidity"),
    moisture_pct: float | None = Form(default=None, alias="moisturePct"),
    rainfall_mm: float | None = Form(default=None, alias="rainfallMm"),
    images: list[UploadFile] = File(...),
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    if len(images) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one image is required")
    if len(images) > 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum 4 images are allowed")
    if soil_depth_cm <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Soil depth must be positive")

    try:
        weather = await fetch_weather(latitude=latitude, longitude=longitude)
    except Exception:
        fallback_humidity = humidity if humidity is not None else moisture_pct
        weather = {
            "temperatureC": temperature_c if temperature_c is not None else 27.0,
            "humidity": fallback_humidity if fallback_humidity is not None else 60.0,
            "rainfallMm": rainfall_mm if rainfall_mm is not None else 0.0,
            "source": "fallback",
        }
        logger.exception("Weather fetch failed; using fallback weather values")

    image_bytes_list: list[bytes] = []
    image_urls: list[str] = []
    for image in images:
        image_bytes = await image.read()
        if not image_bytes:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image upload")
        image_bytes_list.append(image_bytes)

        image.file.seek(0)
        image_url = await save_upload_file(image)
        image_urls.append(image_url)

    model_output = run_inference(
        images=image_bytes_list,
        soil_depth_cm=soil_depth_cm,
        temperature_c=weather["temperatureC"],
        humidity=weather["humidity"],
        rainfall_mm=weather.get("rainfallMm"),
    )

    created_at = datetime.now(tz=timezone.utc)
    job_id = uuid4().hex

    analysis_document = {
        "jobId": job_id,
        "userId": user_id,
        "imageUrls": image_urls,
        "depthCm": soil_depth_cm,
        "latitude": latitude,
        "longitude": longitude,
        "temperature": weather["temperatureC"],
        "humidity": weather["humidity"],
        "rainfallMm": weather.get("rainfallMm", 0.0),
        "modelOutput": {
            "soilType": model_output["soilType"],
            "npk": {
                "n": model_output["nutrients"]["n"],
                "p": model_output["nutrients"]["p"],
                "k": model_output["nutrients"]["k"],
            },
            "ph": model_output["nutrients"]["ph"],
            "healthScore": model_output["soilHealth"],
            "fertility": model_output["fertility"],
            "moisture": model_output["moisture"],
            "gsm": model_output["granuleMetrics"]["gsm"],
            "granuleCount": model_output["granuleMetrics"]["granuleCount"],
            "granuleDensity": model_output["granuleMetrics"]["granuleDensity"],
        },
        "topCrops": model_output["crops"],
        "fertilizerRecommendation": model_output["fertilizerRecommendation"],
        "workPlan": model_output["workPlan"],
        "createdAt": created_at,
    }

    await db["analysis"].insert_one(analysis_document)

    response_payload = {
        "jobId": job_id,
        "userId": user_id,
        "type": model_output["soilType"],
        "healthScore": model_output["soilHealth"],
        "fertility": model_output["fertility"],
        "ph": model_output["nutrients"]["ph"],
        "moisture": model_output["moisture"],
        "gsm": model_output["granuleMetrics"]["gsm"],
        "granuleCount": model_output["granuleMetrics"]["granuleCount"],
        "granuleDensity": model_output["granuleMetrics"]["granuleDensity"],
        "npk": {
            "n": model_output["nutrients"]["n"],
            "p": model_output["nutrients"]["p"],
            "k": model_output["nutrients"]["k"],
        },
        "weather": {
            "temperatureC": weather["temperatureC"],
            "humidity": weather["humidity"],
            "rainfallMm": weather.get("rainfallMm", 0.0),
        },
        "crops": model_output["crops"],
        "fertilizerPlan": model_output["fertilizerRecommendation"],
        "workPlan": model_output["workPlan"],
        "depthCm": soil_depth_cm,
        "imageCount": len(images),
        "imageUrls": image_urls,
        "latitude": latitude,
        "longitude": longitude,
        "createdAt": created_at,
    }

    return {"result": response_payload}
