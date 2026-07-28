from fastapi import APIRouter, Query
import os
import requests

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

    return response.json()