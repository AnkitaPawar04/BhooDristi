import json

INPUT_FILE = "public/india_district.geojson"
OUTPUT_FILE = "public/maharashtra_districts.geojson"

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

features = data.get("features", [])

print(f"Total features found: {len(features)}")

# Display property names from the first feature
if features:
    print("Available properties:")
    print(features[0].get("properties", {}))

maharashtra_features = []

for feature in features:
    properties = feature.get("properties", {})

    # Check all property values for Maharashtra.
    # This makes the script work with different GeoJSON schemas.
    values = [
        str(value).strip().lower()
        for value in properties.values()
        if value is not None
    ]

    if "maharashtra" in values:
        maharashtra_features.append(feature)

output = {
    "type": "FeatureCollection",
    "features": maharashtra_features
}

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False)

print()
print(f"Maharashtra districts extracted: {len(maharashtra_features)}")
print(f"Created: {OUTPUT_FILE}")

if not maharashtra_features:
    print()
    print("WARNING: No Maharashtra features were found.")
    print("Check the property names printed above.")