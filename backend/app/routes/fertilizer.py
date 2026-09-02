from fastapi import APIRouter, Query
import os
import requests
import json

router = APIRouter(prefix="/fertilizer", tags=["Fertilizer"])

API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")


@router.get("/search")
def search_fertilizer_shops(
    query: str = Query(...),
    lat: float | None = None,
    lng: float | None = None,
):

    if not API_KEY:
        return {
            "places": [],
            "error": "Google Places API key is missing. Add GOOGLE_PLACES_API_KEY to backend/.env.",
        }

    url = "https://places.googleapis.com/v1/places:searchText"

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": (
            "places.id,"
            "places.displayName,"
            "places.formattedAddress,"
            "places.location,"
            "places.rating,"
            "places.googleMapsUri,"
            "places.websiteUri,"
            "places.nationalPhoneNumber,"
            "places.regularOpeningHours"
        ),
    }

    body = {"textQuery": query}

    if lat is not None and lng is not None:
        body["locationBias"] = {
            "circle": {
                "center": {
                    "latitude": lat,
                    "longitude": lng,
                },
                "radius": 20000,
            }
        }

    try:
        response = requests.post(url, headers=headers, json=body, timeout=10)
    except requests.RequestException as exc:
        return {
            "places": [],
            "error": f"Google Places request failed: {str(exc)}",
        }

    try:
        status = response.status_code
        text = response.text
        print(f"[fertilizer.search] Google Places status={status}")
        try:
            parsed = response.json()
            print("[fertilizer.search] Google Places body:", json.dumps(parsed, indent=2))
        except Exception:
            print("[fertilizer.search] Google Places body (raw):", text)
    except Exception as e:
        print("[fertilizer.search] Failed to log Google response:", e)

    if response.status_code != 200:
        error_message = "Google Places API request was rejected. Enable the Places API and billing for the Google Cloud project, and verify the key is valid."
        try:
            payload = response.json()
            if payload.get("error"):
                error_message = payload["error"].get("message", error_message)
        except Exception:
            pass

        return {
            "places": [],
            "error": error_message,
            "status": response.status_code,
        }

    return response.json()