from backend.app.routes.crop import rank_top_crop_candidates


def test_rank_top_crop_candidates_filters_zero_confidence_and_limits_to_five():
    candidates = [
        {"crop": "grapes", "confidence": 0.0},
        {"crop": "rice", "confidence": 88.5},
        {"crop": "maize", "confidence": 76.1},
        {"crop": "cotton", "confidence": 63.2},
        {"crop": "sugarcane", "confidence": 58.4},
        {"crop": "pigeonpeas", "confidence": 54.2},
        {"crop": "wheat", "confidence": 51.7},
    ]

    ranked = rank_top_crop_candidates(
        candidates,
        season="kharif",
        district_crops=[
            "rice",
            "maize",
            "cotton",
            "sugarcane",
            "pigeonpeas",
            "grapes",
            "wheat",
        ],
        district_data_available=True,
    )

    assert len(ranked) == 5
    assert all(item["confidence"] > 0 for item in ranked)
    assert ranked[0]["crop"] == "rice"
    assert ranked[0]["confidence"] == 88.5
