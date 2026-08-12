import requests

URL='http://127.0.0.1:8000/crop/predict'
coords=[
    (18.96,72.82),(18.95,72.81),(18.95,72.78),(18.92,72.82),(18.90,72.80),(18.93,72.85)
]
for lat,lon in coords:
    try:
        r=requests.post(URL,json={'latitude':lat,'longitude':lon,'season':'Kharif','farmer_id':1,'nitrogen':50,'phosphorus':50,'potassium':50,'temperature':25,'humidity':60,'ph':6.5,'rainfall':100},timeout=10)
        print(lat,lon,r.status_code,r.json())
    except Exception as e:
        print(lat,lon,'error',e)
