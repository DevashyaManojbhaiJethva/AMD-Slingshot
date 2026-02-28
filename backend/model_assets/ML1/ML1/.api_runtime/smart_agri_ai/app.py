# app.py

import streamlit as st
import requests
import torch
from PIL import Image
import torchvision.transforms as transforms
import torchvision.models as models

from hybrid_engine import recommend_crops
from fertilizer_engine import (
    analyze_fertility,
    recommend_npk,
    recommend_fertilizer
)
from pdf_generator import generate_pdf


# -------------------------
# CONFIG
# -------------------------

st.set_page_config(
    page_title="Smart Agriculture AI",
    layout="wide",
)

st.title("Smart Agriculture Hybrid AI System")
st.markdown("AI-powered Soil, Crop & Fertility Intelligence Platform")


# -------------------------
# API KEY
# -------------------------

api_key = "27e0b35ed33a35b74673ea456f7cbc69"  # Replace with your real key


# -------------------------
# LOAD SOIL MODEL
# -------------------------

@st.cache_resource
def load_model():
    model = models.resnet18(pretrained=False)
    model.fc = torch.nn.Linear(model.fc.in_features, 10)
    model.load_state_dict(torch.load("soil_model.pth", map_location="cpu"))
    model.eval()
    return model

model = load_model()


# -------------------------
# SOIL CLASSES
# -------------------------

soil_classes = [
    "alluvial", "arid", "black", "cinder", "clay",
    "laterite", "mountain", "peat", "red", "yellow"
]


# -------------------------
# IMAGE TRANSFORM
# -------------------------

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor()
])


# -------------------------
# CITY SEARCH FUNCTION (Autocomplete)
# -------------------------

def search_cities(query):
    """
    Uses OpenWeather Geocoding API for city suggestions
    """
    if not query:
        return []

    url = f"http://api.openweathermap.org/geo/1.0/direct?q={query}&limit=5&appid={api_key}"
    response = requests.get(url, timeout=5)

    if response.status_code != 200:
        return []

    data = response.json()

    cities = []
    for city in data:
        name = city.get("name")
        country = city.get("country")
        state = city.get("state", "")
        full_name = f"{name}, {state + ', ' if state else ''}{country}"
        cities.append(full_name)

    return cities


# -------------------------
# WEATHER FUNCTION
# -------------------------

def get_weather(city):
    url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric"
    response = requests.get(url, timeout=5)

    if response.status_code != 200:
        raise Exception("Weather API failed")

    data = response.json()

    temp = data["main"]["temp"]
    humidity = data["main"]["humidity"]
    rainfall = data.get("rain", {}).get("1h", 0)

    return temp, humidity, rainfall
# -------------------------
# SIDEBAR INPUTS
# -------------------------

st.sidebar.header("User Inputs")

uploaded_file = st.sidebar.file_uploader(
    "Upload Soil Image",
    type=["jpg", "png", "jpeg"]
)

soil_depth = st.sidebar.slider("Soil Depth (cm)", 10, 200, 50)

ph = st.sidebar.slider("Soil pH")

# 🔥 Autocomplete Search
city_query = st.sidebar.text_input("Search City", "")

city_options = search_cities(city_query) if city_query else []

selected_city = st.sidebar.selectbox(
    "",
    city_options if city_options else ["Type to search city..."]
)

predict_btn = st.sidebar.button("Generate Recommendation")


# -------------------------
# MAIN PROCESS
# -------------------------

if predict_btn:

    if not uploaded_file:
        st.warning("Please upload a soil image.")
        st.stop()

    if not city_options:
        st.warning("Please search and select a valid city.")
        st.stop()

    # Display Image
    image = Image.open(uploaded_file).convert("RGB")
    st.image(image, caption="Uploaded Soil Image", width=300)

    # Soil Prediction
    img = transform(image).unsqueeze(0)

    with torch.no_grad():
        outputs = model(img)
        probabilities = torch.softmax(outputs, dim=1)
        _, predicted = torch.max(probabilities, 1)
        confidence = probabilities[0][predicted].item() * 100

    soil_type = soil_classes[predicted.item()]

    st.success(f"Soil Type: {soil_type} ({confidence:.2f}% confidence)")

    # Weather
    try:
        temperature, humidity, rainfall = get_weather(selected_city)
        st.info(
            f"🌤 Weather in {selected_city}: "
            f"{temperature}°C | "
            f"Humidity: {humidity}% | "
            f"Rainfall: {rainfall} mm"
        )
    except:
        st.error("Weather API error. Please check API key or city.")
        st.stop()

    # -------------------------
    # Crop Recommendation
    # -------------------------

    crops = recommend_crops(soil_type, ph, temperature, rainfall)

    st.subheader("Top Recommended Crops")

    best_crop = None
    if crops:
        best_crop = crops[0][0]
        for crop, score in crops:
            st.write(f"{crop} — Suitability: {score}%")
    else:
        st.warning("No suitable crop found.")

    # -------------------------
    # Fertility Analysis
    # -------------------------

    fertility_score, fertility_level = analyze_fertility(
        soil_type,
        ph,
        soil_depth,
        rainfall,
        temperature
    )

    npk_values = recommend_npk(fertility_score, best_crop)

    fertilizer_advice = recommend_fertilizer(
        fertility_level,
        ph,
        npk_values
    )

    st.subheader("Soil Fertility Analysis")
    st.write(f"Fertility Score: {fertility_score}/100")
    st.write(f"Fertility Level: {fertility_level}")

    st.subheader("Recommended NPK (kg/ha)")
    st.write(f"N: {npk_values['N']}")
    st.write(f"P: {npk_values['P']}")
    st.write(f"K: {npk_values['K']}")

    st.subheader("Fertilizer Advice")
    for tip in fertilizer_advice:
        st.write(f"- {tip}")

    # -------------------------
    # Generate PDF
    # -------------------------

    pdf_filename = "report.pdf"

    soil_info = {
        "average_ph": ph,
        "nature": fertility_level,
        "description": "AI-evaluated soil fertility analysis."
    }

    generate_pdf(
        pdf_filename,
        soil_type,
        confidence,
        soil_info,
        temperature,
        humidity,
        rainfall,
        crops,
        fertility_level,
        npk_values,
        fertilizer_advice
    )

    with open(pdf_filename, "rb") as f:
        st.download_button(
            label="📄 Download Full Report",
            data=f,
            file_name="Smart_Agriculture_Report.pdf",
            mime="application/pdf"
        )

else:
    st.info("Upload soil image, search city, and click Generate Recommendation.")