import requests

URL = 'http://127.0.0.1:8000/crop/predict'

candidates = [
    (17.68, 74.0),
    (17.50, 74.00),
    (17.35, 74.10),
    (17.90, 74.05),
    (17.20, 74.00),
    (17.75, 73.90),
]

for lat, lon in candidates:
    payload={'latitude':lat,'longitude':lon,'season':'Kharif','farmer_id':1,'nitrogen':50,'phosphorus':50,'potassium':50,'temperature':25,'humidity':60,'ph':6.5,'rainfall':100}
    try:
        r = requests.post(URL, json=payload, timeout=10)
        print(lat, lon, r.status_code, r.json())
    except Exception as e:
        print(lat, lon, 'error', e)
