// src/utils/districts.js

export const DISTRICT_CENTERS = {
  Ahmednagar: { latitude: 19.0952, longitude: 74.7496 },
  Akola: { latitude: 20.7096, longitude: 77.0082 },
  Amravati: { latitude: 20.9374, longitude: 77.7796 },
  Beed: { latitude: 18.9891, longitude: 75.7601 },
  Bhandara: { latitude: 21.1702, longitude: 79.6556 },
  Buldhana: { latitude: 20.5293, longitude: 76.1840 },
  Chandrapur: { latitude: 19.9615, longitude: 79.2961 },
  "Chhatrapati Sambhajinagar": { latitude: 19.8762, longitude: 75.3433 },
  Dhule: { latitude: 20.9042, longitude: 74.7749 },
  Gadchiroli: { latitude: 20.1809, longitude: 80.0030 },
  Gondia: { latitude: 21.4624, longitude: 80.2200 },
  Hingoli: { latitude: 19.7146, longitude: 77.1426 },
  Jalgaon: { latitude: 21.0077, longitude: 75.5626 },
  Jalna: { latitude: 19.8410, longitude: 75.8864 },
  Kolhapur: { latitude: 16.7050, longitude: 74.2433 },
  Latur: { latitude: 18.4088, longitude: 76.5604 },
  "Mumbai City": { latitude: 18.9388, longitude: 72.8354 },
  "Mumbai Suburban": { latitude: 19.0728, longitude: 72.8826 },
  Nagpur: { latitude: 21.1458, longitude: 79.0882 },
  Nanded: { latitude: 19.1383, longitude: 77.3210 },
  Nandurbar: { latitude: 21.3667, longitude: 74.2400 },
  Nashik: { latitude: 19.9975, longitude: 73.7898 },
  Dharashiv: { latitude: 18.1860, longitude: 76.0419 },
  Palghar: { latitude: 19.6967, longitude: 72.7699 },
  Parbhani: { latitude: 19.2608, longitude: 76.7748 },
  Pune: { latitude: 18.5204, longitude: 73.8567 },
  Raigad: { latitude: 18.5158, longitude: 73.1820 },
  Ratnagiri: { latitude: 16.9902, longitude: 73.3120 },
  Sangli: { latitude: 16.8524, longitude: 74.5815 },
  Satara: { latitude: 17.6805, longitude: 74.0183 },
  Sindhudurg: { latitude: 16.3492, longitude: 73.5594 },
  Solapur: { latitude: 17.6599, longitude: 75.9064 },
  Thane: { latitude: 19.2183, longitude: 72.9781 },
  Wardha: { latitude: 20.7453, longitude: 78.6022 },
  Washim: { latitude: 20.1110, longitude: 77.1330 },
  Yavatmal: { latitude: 20.3888, longitude: 78.1204 }
};

export const maharashtraDistricts = Object.keys(DISTRICT_CENTERS);

export const filterDistricts = (searchTerm = "") => {
  if (!searchTerm) return maharashtraDistricts;

  return maharashtraDistricts.filter((district) =>
    district.toLowerCase().includes(searchTerm.toLowerCase())
  );
};