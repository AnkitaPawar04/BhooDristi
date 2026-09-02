"""
District Soil Data Generator

Generates deterministic, district-specific soil values for the
BhooDrishti crop recommendation system.

IMPORTANT:
- These are simulated/demo soil values.
- Values are constrained to the feature distribution of the
  existing Crop_recommendation.csv dataset.
- The generator does NOT force a particular crop.
- Weather values are NOT generated here; they come from OpenWeather.
"""

import random
from typing import Dict


# ============================================================
# MAHARASHTRA DISTRICT ZONES
# ============================================================

MAHARASHTRA_ZONES = {

    # --------------------------------------------------------
    # Central Maharashtra
    # --------------------------------------------------------

    "Ahmednagar": {
        "zone": "central",
        "rainfall": "medium"
    },

    "Ahilya nagar": {
        "zone": "central",
        "rainfall": "medium"
    },

    "Pune": {
        "zone": "western",
        "rainfall": "medium"
    },

    "Satara": {
        "zone": "western",
        "rainfall": "high"
    },

    "Sangli": {
        "zone": "western",
        "rainfall": "medium"
    },

    "Solapur": {
        "zone": "central",
        "rainfall": "low"
    },

    # --------------------------------------------------------
    # Western Maharashtra
    # --------------------------------------------------------

    "Kolhapur": {
        "zone": "western",
        "rainfall": "high"
    },

    "Raigad": {
        "zone": "western",
        "rainfall": "very_high"
    },

    "Ratnagiri": {
        "zone": "western",
        "rainfall": "very_high"
    },

    "Sindhudurg": {
        "zone": "western",
        "rainfall": "very_high"
    },

    "Thane": {
        "zone": "western",
        "rainfall": "very_high"
    },

    "Mumbai": {
        "zone": "western",
        "rainfall": "very_high"
    },

    "Navi Mumbai": {
        "zone": "western",
        "rainfall": "very_high"
    },

    # --------------------------------------------------------
    # Khandesh
    # --------------------------------------------------------

    "Dhule": {
        "zone": "khandesh",
        "rainfall": "medium"
    },

    "Jalgaon": {
        "zone": "khandesh",
        "rainfall": "low"
    },

    "Nandurbar": {
        "zone": "khandesh",
        "rainfall": "low"
    },

    "Nashik": {
        "zone": "khandesh",
        "rainfall": "medium"
    },

    # --------------------------------------------------------
    # Marathwada
    # --------------------------------------------------------

    "Aurangabad": {
        "zone": "marathwada",
        "rainfall": "low"
    },

    "Chhatrapati Sambhaji Nagar": {
        "zone": "marathwada",
        "rainfall": "low"
    },

    "Beed": {
        "zone": "marathwada",
        "rainfall": "low"
    },

    "Hingoli": {
        "zone": "marathwada",
        "rainfall": "low"
    },

    "Jalna": {
        "zone": "marathwada",
        "rainfall": "medium"
    },

    "Latur": {
        "zone": "marathwada",
        "rainfall": "low"
    },

    "Nanded": {
        "zone": "marathwada",
        "rainfall": "low"
    },

    "Parbhani": {
        "zone": "marathwada",
        "rainfall": "medium"
    },

    "Osmananad": {
        "zone": "marathwada",
        "rainfall": "low"
    },

    "Dharashiv": {
        "zone": "marathwada",
        "rainfall": "low"
    },

    # --------------------------------------------------------
    # Vidarbha
    # --------------------------------------------------------

    "Akola": {
        "zone": "vidarbha",
        "rainfall": "low"
    },

    "Amravati": {
        "zone": "vidarbha",
        "rainfall": "medium"
    },

    "Bhandara": {
        "zone": "vidarbha",
        "rainfall": "high"
    },

    "Buldhana": {
        "zone": "vidarbha",
        "rainfall": "low"
    },

    "Chandrapur": {
        "zone": "vidarbha",
        "rainfall": "high"
    },

    "Gadchiroli": {
        "zone": "vidarbha",
        "rainfall": "high"
    },

    "Gondia": {
        "zone": "vidarbha",
        "rainfall": "high"
    },

    "Nagpur": {
        "zone": "vidarbha",
        "rainfall": "medium"
    },

    "Wardha": {
        "zone": "vidarbha",
        "rainfall": "medium"
    },

    "Washim": {
        "zone": "vidarbha",
        "rainfall": "low"
    },

    "Yavatmal": {
        "zone": "vidarbha",
        "rainfall": "low"
    },

}


# ============================================================
# SOIL PROFILES
# ============================================================
#
# These ranges are intentionally kept within the broad
# distribution of Crop_recommendation.csv:
#
# N: approximately 0 - 140
# P: approximately 5 - 145
# K: approximately 5 - 205
# pH: approximately 3.5 - 9.9
#
# We use moderate ranges instead of the old K=300-340
# synthetic values that were outside the ML training data.
#
# These are DEMO/SIMULATION values, not laboratory readings.
# ============================================================

ZONE_SOIL_PATTERNS = {

    "western": {

        "low": {
            "n_range": (55, 90),
            "p_range": (35, 65),
            "k_range": (25, 75),
            "ph_range": (6.3, 7.2),
        },

        "medium": {
            "n_range": (60, 100),
            "p_range": (40, 70),
            "k_range": (30, 85),
            "ph_range": (6.3, 7.2),
        },

        "high": {
            "n_range": (65, 105),
            "p_range": (42, 72),
            "k_range": (35, 95),
            "ph_range": (6.2, 7.1),
        },

        "very_high": {
            "n_range": (50, 90),
            "p_range": (30, 65),
            "k_range": (25, 80),
            "ph_range": (5.9, 7.0),
        },
    },


    "khandesh": {

        "low": {
            "n_range": (55, 90),
            "p_range": (35, 65),
            "k_range": (25, 70),
            "ph_range": (6.6, 7.5),
        },

        "medium": {
            "n_range": (60, 100),
            "p_range": (38, 68),
            "k_range": (30, 80),
            "ph_range": (6.5, 7.4),
        },

        "high": {
            "n_range": (65, 105),
            "p_range": (40, 70),
            "k_range": (35, 90),
            "ph_range": (6.4, 7.3),
        },
    },


    "marathwada": {

        "low": {
            "n_range": (45, 85),
            "p_range": (35, 65),
            "k_range": (25, 70),
            "ph_range": (6.7, 7.6),
        },

        "medium": {
            "n_range": (50, 90),
            "p_range": (38, 68),
            "k_range": (30, 80),
            "ph_range": (6.6, 7.5),
        },

        "high": {
            "n_range": (55, 95),
            "p_range": (40, 70),
            "k_range": (35, 85),
            "ph_range": (6.5, 7.4),
        },
    },


    "vidarbha": {

        "low": {
            "n_range": (55, 95),
            "p_range": (35, 65),
            "k_range": (25, 75),
            "ph_range": (6.5, 7.4),
        },

        "medium": {
            "n_range": (60, 100),
            "p_range": (40, 70),
            "k_range": (30, 85),
            "ph_range": (6.4, 7.3),
        },

        "high": {
            "n_range": (65, 105),
            "p_range": (42, 72),
            "k_range": (35, 95),
            "ph_range": (6.3, 7.2),
        },

        "very_high": {
            "n_range": (55, 90),
            "p_range": (35, 65),
            "k_range": (25, 80),
            "ph_range": (6.2, 7.1),
        },
    },


    "central": {

        "low": {
            "n_range": (50, 85),
            "p_range": (35, 65),
            "k_range": (25, 70),
            "ph_range": (6.6, 7.5),
        },

        "medium": {
            "n_range": (55, 95),
            "p_range": (38, 68),
            "k_range": (30, 80),
            "ph_range": (6.5, 7.4),
        },

        "high": {
            "n_range": (60, 100),
            "p_range": (40, 70),
            "k_range": (35, 90),
            "ph_range": (6.4, 7.3),
        },
    },
}


# ============================================================
# DETERMINISTIC SEED
# ============================================================

def _district_seed(district: str) -> int:
    """
    Generate a stable seed from the district name.

    Python's built-in hash() can change between processes,
    therefore we use a deterministic character-based seed.
    """

    district = district.strip().lower()

    seed = 0

    for index, character in enumerate(district):

        seed += (
            (index + 1)
            * ord(character)
        )

    return seed


# ============================================================
# GENERATE SOIL
# ============================================================

def generate_district_soil_prediction(
    district: str
) -> Dict[str, float]:
    """
    Generate deterministic, district-specific soil values.

    NOTE:
    These values are simulated values for the project.
    They are not laboratory measurements.
    """

    district_clean = (
        district
        .strip()
    )

    # --------------------------------------------------------
    # Stable random generator
    # --------------------------------------------------------

    rng = random.Random(
        _district_seed(
            district_clean
        )
    )

    # --------------------------------------------------------
    # Find district information
    # --------------------------------------------------------

    district_info = MAHARASHTRA_ZONES.get(
        district_clean
    )

    if district_info is None:

        # Try case-insensitive lookup

        district_info = None

        for name, info in MAHARASHTRA_ZONES.items():

            if (
                name.lower()
                == district_clean.lower()
            ):

                district_info = info
                break

    # --------------------------------------------------------
    # Default zone
    # --------------------------------------------------------

    if district_info is None:

        district_info = {
            "zone": "central",
            "rainfall": "medium"
        }

    zone = district_info[
        "zone"
    ]

    rainfall_pattern = district_info[
        "rainfall"
    ]

    # --------------------------------------------------------
    # Get zone patterns
    # --------------------------------------------------------

    zone_patterns = (
        ZONE_SOIL_PATTERNS.get(
            zone,
            ZONE_SOIL_PATTERNS[
                "central"
            ]
        )
    )

    # --------------------------------------------------------
    # Select rainfall-specific profile
    # --------------------------------------------------------

    if rainfall_pattern in zone_patterns:

        pattern = zone_patterns[
            rainfall_pattern
        ]

    else:

        pattern = next(
            iter(
                zone_patterns.values()
            )
        )

    # --------------------------------------------------------
    # Generate values
    # --------------------------------------------------------

    nitrogen = round(
        rng.uniform(
            pattern["n_range"][0],
            pattern["n_range"][1]
        ),
        1
    )

    phosphorus = round(
        rng.uniform(
            pattern["p_range"][0],
            pattern["p_range"][1]
        ),
        1
    )

    potassium = round(
        rng.uniform(
            pattern["k_range"][0],
            pattern["k_range"][1]
        ),
        1
    )

    ph = round(
        rng.uniform(
            pattern["ph_range"][0],
            pattern["ph_range"][1]
        ),
        2
    )

    return {

        "nitrogen":
            nitrogen,

        "phosphorus":
            phosphorus,

        "potassium":
            potassium,

        "ph":
            ph
    }


# ============================================================
# CACHE
# ============================================================

_soil_prediction_cache: Dict[
    str,
    Dict[str, float]
] = {}


# ============================================================
# PUBLIC FUNCTION
# ============================================================

def get_soil_data(
    district: str
) -> Dict[str, float]:
    """
    Get soil data for a district.

    Results are cached so repeated requests for the same
    district return the same values during the backend process.

    Returns:

        {
            "nitrogen": float,
            "phosphorus": float,
            "potassium": float,
            "ph": float
        }
    """

    if not district:

        raise ValueError(
            "District name cannot be empty."
        )

    district_key = (
        district
        .strip()
        .lower()
    )

    # --------------------------------------------------------
    # Cached result
    # --------------------------------------------------------

    if (
        district_key
        in _soil_prediction_cache
    ):

        return _soil_prediction_cache[
            district_key
        ]

    # --------------------------------------------------------
    # Generate
    # --------------------------------------------------------

    soil_data = (
        generate_district_soil_prediction(
            district
        )
    )

    # --------------------------------------------------------
    # Cache
    # --------------------------------------------------------

    _soil_prediction_cache[
        district_key
    ] = soil_data

    return soil_data


# ============================================================
# OPTIONAL CACHE CLEAR
# ============================================================

def clear_soil_cache() -> None:
    """
    Clear cached soil values.

    Useful during development/testing after changing
    soil-generation rules.
    """

    _soil_prediction_cache.clear()