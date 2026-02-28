from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.deps import get_current_user_id, get_db
from app.schemas import HistoryResponse


router = APIRouter(prefix="", tags=["history"])


@router.get("/history/{user_id}", response_model=HistoryResponse)
async def get_history(
    user_id: str,
    verified_user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    if user_id != verified_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden user access")

    cursor = db["analysis"].find({"userId": user_id}).sort("createdAt", -1)
    documents = await cursor.to_list(length=200)

    items = []
    for document in documents:
        fertilizer_plan = document.get("fertilizerRecommendation") or {}
        items.append(
            {
                "jobId": document.get("jobId"),
                "userId": document.get("userId"),
                "type": document.get("modelOutput", {}).get("soilType", "Clayey Sand (SC)"),
                "healthScore": document.get("modelOutput", {}).get("healthScore", 0),
                "fertility": document.get("modelOutput", {}).get("fertility", 0),
                "ph": document.get("modelOutput", {}).get("ph", 0),
                "moisture": document.get("modelOutput", {}).get("moisture", 0),
                "gsm": document.get("modelOutput", {}).get("gsm", 0),
                "granuleCount": document.get("modelOutput", {}).get("granuleCount", 0),
                "granuleDensity": document.get("modelOutput", {}).get("granuleDensity", 0),
                "npk": document.get("modelOutput", {}).get("npk", {"n": 0, "p": 0, "k": 0}),
                "weather": {
                    "temperatureC": document.get("temperature", 0),
                    "humidity": document.get("humidity", 0),
                },
                "crops": document.get("topCrops", []),
                "fertilizerPlan": {
                    "ureaKg": fertilizer_plan.get("ureaKg", 0),
                    "recommendation": fertilizer_plan.get("recommendation", "No recommendation available."),
                    "irrigation": fertilizer_plan.get("irrigation", "Every 3 days"),
                },
                "workPlan": document.get("workPlan", []),
                "depthCm": document.get("depthCm"),
                "imageCount": len(document.get("imageUrls", [])),
                "imageUrls": document.get("imageUrls", []),
                "latitude": document.get("latitude"),
                "longitude": document.get("longitude"),
                "createdAt": document.get("createdAt"),
            }
        )

    return {"items": items}
