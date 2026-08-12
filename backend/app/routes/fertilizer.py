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

    body = {
        "textQuery": query
    }

    if lat is not None and lng is not None:
        body["locationBias"] = {
            "circle": {
                "center": {
                    "latitude": lat,
                    "longitude": lng
                },
                "radius": 20000
            }
        }

    response = requests.post(url, headers=headers, json=body)

    # Log response status and body for debugging (do not log API key)
    try:
        status = response.status_code
        text = response.text
        print(f"[fertilizer.search] Google Places status={status}")
        # Try to pretty-print JSON body if possible
        try:
            parsed = response.json()
            print("[fertilizer.search] Google Places body:", json.dumps(parsed, indent=2))
        except Exception:
            print("[fertilizer.search] Google Places body (raw):", text)
    except Exception as e:
        print("[fertilizer.search] Failed to log Google response:", e)

    return response.json()