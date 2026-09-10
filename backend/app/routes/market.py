from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from ..services.market_service import MarketServiceError, fetch_market_commodities, fetch_market_prices

router = APIRouter(prefix="/market", tags=["market information"])


@router.get("/prices")
async def get_market_prices(
    crop: Optional[str] = Query(default=None, min_length=1, max_length=100),
    district: Optional[str] = Query(default=None, min_length=1, max_length=100),
    market: Optional[str] = Query(default=None, min_length=1, max_length=100),
    variety: Optional[str] = Query(default=None, min_length=1, max_length=100),
    grade: Optional[str] = Query(default=None, min_length=1, max_length=100),
    limit: int = Query(default=10, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
):
    try:
        result = fetch_market_prices(crop, district, market, variety, grade, limit, offset)
    except MarketServiceError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    return {
        "success": True,
        "source": "data.gov.in",
        "last_updated": result["fetched_at"],
        "count": result["count"],
        "total": result["total"],
        "records": result["records"],
    }


@router.get("/commodities")
async def get_market_commodities():
    try:
        result = fetch_market_commodities()
    except MarketServiceError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    return {
        "success": True,
        "source": "data.gov.in",
        "last_updated": result["fetched_at"],
        "commodities": result["commodities"],
    }
