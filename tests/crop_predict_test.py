import requests
import json

URL = 'http://127.0.0.1:8000/crop/predict'

cases = [
    {
        'name': 'Satara farmland',
        'payload': {
            'latitude': 17.6800,
            'longitude': 74.0000,
            'season': 'Kharif',
            'farmer_id': 1,
            'nitrogen': 50,
            'phosphorus': 50,
            'potassium': 50,
            'temperature': 25,
            'humidity': 60,
            'ph': 6.5,
            'rainfall': 100
        }
    },
    {
        'name': 'Pune built-up',
        'payload': {
            'latitude': 18.5204,
            'longitude': 73.8567,
            'season': 'Kharif',
            'farmer_id': 1,
            'nitrogen': 50,
            'phosphorus': 50,
            'potassium': 50,
            'temperature': 25,
            'humidity': 60,
            'ph': 6.5,
            'rainfall': 100
        }
    },
    {
        'name': 'Mumbai sea',
        'payload': {
            'latitude': 18.95,
            'longitude': 72.82,
            'season': 'Kharif',
            'farmer_id': 1,
            'nitrogen': 50,
            'phosphorus': 50,
            'potassium': 50,
            'temperature': 25,
            'humidity': 60,
            'ph': 6.5,
            'rainfall': 100
        }
    }
]

session = requests.Session()
for case in cases:
    print('\n===', case['name'], '===')
    try:
        r = session.post(URL, json=case['payload'], timeout=20)
        print('Status:', r.status_code)
        try:
            print('JSON:', json.dumps(r.json(), indent=2))
        except Exception:
            print('Text:', r.text)
    except Exception as e:
        print('Error:', e)

# Test change location after validation failure: try Pune (likely 400) then Satara (likely 200)
print('\n=== Change location after validation failure test ===')
try:
    r1 = session.post(URL, json=cases[1]['payload'], timeout=20)
    print('First (Pune) status:', r1.status_code)
    print('First body:', r1.text)
    r2 = session.post(URL, json=cases[0]['payload'], timeout=20)
    print('Second (Satara) status:', r2.status_code)
    print('Second body:', r2.text)
except Exception as e:
    print('Error during change-location test:', e)
