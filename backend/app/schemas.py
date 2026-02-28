from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class CropPrediction(BaseModel):
    name: str
    score: float
    confidence: float


class FertilizerPlan(BaseModel):
    ureaKg: float
    recommendation: str
    irrigation: str


class WeatherInfo(BaseModel):
    temperatureC: float
    humidity: float
    rainfallMm: float | None = None


class NpkInfo(BaseModel):
    n: float
    p: float
    k: float


class AnalysisResult(BaseModel):
    jobId: str
    userId: str
    type: str
    healthScore: float
    fertility: float
    ph: float
    moisture: float
    gsm: float
    granuleCount: int
    granuleDensity: float
    npk: NpkInfo
    weather: WeatherInfo
    crops: list[CropPrediction]
    fertilizerPlan: FertilizerPlan
    workPlan: list[str]
    depthCm: float
    imageCount: int
    imageUrls: list[str]
    latitude: float
    longitude: float
    createdAt: datetime


class AnalyzeResponse(BaseModel):
    result: AnalysisResult


class HistoryResponse(BaseModel):
    items: list[AnalysisResult] = Field(default_factory=list)
