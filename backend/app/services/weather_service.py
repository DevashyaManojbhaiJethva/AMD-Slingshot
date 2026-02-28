from __future__ import annotations

import httpx

from app.config import settings


async def fetch_weather(latitude: float, longitude: float) -> dict:
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,rain",
        "timezone": "auto",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(settings.weather_api_base_url, params=params)
        response.raise_for_status()
        payload = response.json()

    current = payload.get("current", {})
    temperature = float(current.get("temperature_2m", 0.0))
    humidity = float(current.get("relative_humidity_2m", 0.0))
    rainfall_mm = float(current.get("rain", 0.0) or 0.0)

    return {
        "temperatureC": temperature,
        "humidity": humidity,
        "rainfallMm": rainfall_mm,
        "source": "open-meteo",
    }
