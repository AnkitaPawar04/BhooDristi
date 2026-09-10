import logging
import os
import time
from typing import Optional

import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
DATA_GOV_RESOURCE_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"


class MarketServiceError(Exception):
    """Raised when government market data cannot be retrieved or validated."""


def _price(value):
    try:
        return float(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


def fetch_market_prices(
    crop: Optional[str] = None,
    district: Optional[str] = None,
    market: Optional[str] = None,
    variety: Optional[str] = None,
    grade: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    api_key = os.getenv("DATA_GOV_API_KEY")
    if not api_key:
        raise MarketServiceError("Market data service is not configured")

    params = {
        "api-key": api_key,
        "format": "json",
        "offset": offset,
        "limit": limit,
        "filters[state.keyword]": "Maharashtra",
    }
    for key, value in {
        "filters[district]": district,
        "filters[market]": market,
        "filters[commodity]": crop,
        "filters[variety]": variety,
        "filters[grade]": grade,
    }.items():
        if value:
            params[key] = value

    started = time.monotonic()
    try:
        response = requests.get(
            DATA_GOV_RESOURCE_URL,
            params=params,
            headers={"User-Agent": "BhooDrishti/1.0"},
            timeout=(5, 15),
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as error:
        logger.warning("Market API request failed for crop=%s district=%s: %s", crop, district, error)
        raise MarketServiceError("Government market data is temporarily unavailable") from error

    raw_records = payload.get("records", [])
    if not isinstance(raw_records, list):
        raise MarketServiceError("Government market response has an invalid record format")

    records = []
    for item in raw_records:
        if not isinstance(item, dict):
            continue
        records.append({
            "state": item.get("state", "Maharashtra"),
            "district": item.get("district", ""),
            "market": item.get("market", ""),
            "commodity": item.get("commodity", ""),
            "variety": item.get("variety", ""),
            "grade": item.get("grade", ""),
            "arrival_date": item.get("arrival_date", ""),
            "min_price": _price(item.get("min_price")),
            "max_price": _price(item.get("max_price")),
            "modal_price": _price(item.get("modal_price")),
        })

    elapsed_ms = round((time.monotonic() - started) * 1000)
    logger.info("Market API request completed crop=%s district=%s status=%s count=%s duration_ms=%s", crop, district, response.status_code, len(records), elapsed_ms)
    return {"records": records, "count": len(records), "total": payload.get("total"), "fetched_at": payload.get("updated_date")}


def fetch_market_commodities(limit: int = 100):
    result = fetch_market_prices(limit=limit)
    commodities = sorted({
        record["commodity"]
        for record in result["records"]
        if record["commodity"]
    })
    return {"commodities": commodities, "fetched_at": result["fetched_at"]}
