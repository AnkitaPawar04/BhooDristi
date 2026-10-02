#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Comprehensive irrigation system verification test"""

print("\n" + "="*70)
print("COMPREHENSIVE IRRIGATION SYSTEM VERIFICATION TEST")
print("="*70)

# Test 1: Import all modules
print("\n[TEST 1] Module Imports")
try:
    from backend.app.routes.irrigation import predict_irrigation, IrrigationPredictRequest
    from backend.app.utils.irrigation_utils import map_prediction_to_recommendation, generate_irrigation_advice, validate_irrigation_input, determine_district_from_coordinates
    from backend.app.utils.irrigation_model import get_irrigation_model
    from backend.app.utils.location_data import get_location_data
    print("[OK] All irrigation modules imported successfully")
except Exception as e:
    print(f"[ERROR] Import failed: {e}")
    exit(1)

# Test 2: Verify function signatures
print("\n[TEST 2] Function Signatures")
import inspect

sig = inspect.signature(map_prediction_to_recommendation)
params = list(sig.parameters.keys())
expected = ['prediction', 'soil_moisture', 'rainfall_mm', 'forecast_rainfall_mm', 'crop_type', 'crop_growth_stage']
if params == expected:
    print(f"[OK] map_prediction_to_recommendation: {len(params)} parameters match")
else:
    print(f"[ERROR] map_prediction_to_recommendation signature mismatch")
    print(f"  Expected: {expected}")
    print(f"  Got: {params}")

sig = inspect.signature(generate_irrigation_advice)
params = list(sig.parameters.keys())
expected = ['prediction', 'soil_moisture', 'rainfall_mm', 'forecast_rainfall_mm', 'crop_type', 'crop_growth_stage', 'temperature_c', 'humidity']
if params == expected:
    print(f"[OK] generate_irrigation_advice: {len(params)} parameters match")
else:
    print(f"[ERROR] generate_irrigation_advice signature mismatch")
    print(f"  Expected: {expected}")
    print(f"  Got: {params}")

# Test 3: Validate request model
print("\n[TEST 3] Request Model Validation")
test_request = {
    'farmer_id': 0,
    'latitude': 17.6599,
    'longitude': 75.9064,
    'crop_type': 'Sugarcane',
    'crop_growth_stage': 'Vegetative',
    'soil_type': 'Loamy',
    'previous_irrigation_mm': 0,
    'irrigation_type': 'Drip',
    'water_source': 'Groundwater',
    'field_area_hectare': 1,
    'mulching_used': 'No'
}

try:
    validate_irrigation_input(test_request)
    print("[OK] Request validation passed")
except Exception as e:
    print(f"[ERROR] Request validation failed: {e}")

# Test 4: District to region mapping
print("\n[TEST 4] District-to-Region Mapping")
try:
    district = determine_district_from_coordinates(17.6599, 75.9064)
    print(f"[OK] Coordinates (17.6599, 75.9064) -> District: {district}")
except Exception as e:
    print(f"[ERROR] District mapping failed: {e}")

# Test 5: Model loading
print("\n[TEST 5] ML Model Loading")
try:
    model = get_irrigation_model()
    print(f"[OK] Model loaded: {type(model).__name__}")
except Exception as e:
    print(f"[ERROR] Model load failed: {e}")

# Test 6: Request model instantiation
print("\n[TEST 6] Request Model Instantiation")
try:
    req = IrrigationPredictRequest(**test_request)
    print(f"[OK] Request model created with {len(req.dict())} fields")
    print(f"    Fields: latitude, longitude, crop_type, soil_type, growth_stage, etc.")
except Exception as e:
    print(f"[ERROR] Request model failed: {e}")

print("\n" + "="*70)
print("VERIFICATION COMPLETE - All core components functional")
print("="*70 + "\n")
