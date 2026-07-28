// src/services/fertilizerService.js

const API_BASE = "http://localhost:8000";

/**
 * Calculate distance between two coordinates (Haversine Formula)
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * Fetch fertilizer shops from FastAPI + Google Places
 */
export async function getNearbyFertilizerShops(
  latitude,
  longitude,
  radius = 10000
) {
  try {
    const response = await fetch(
      `${API_BASE}/fertilizer/search?query=fertilizer shops&lat=${latitude}&lng=${longitude}`
    );

    if (!response.ok) {
      throw new Error(`Backend Error: ${response.status}`);
    }

    const data = await response.json();

    console.log("Google Places Response", data);

    if (!data.places) return [];

    const shops = data.places.map((shop) => ({
      id: shop.id,

      name: shop.displayName?.text || "Agriculture Supply Shop",

      latitude: shop.location?.latitude,

      longitude: shop.location?.longitude,

      distance: calculateDistance(
        latitude,
        longitude,
        shop.location.latitude,
        shop.location.longitude
      ),

      address: shop.formattedAddress || "Address Not Available",

      phone: shop.nationalPhoneNumber || "Not Available",

      website: shop.websiteUri || "",

      openingHours:
        shop.regularOpeningHours?.weekdayDescriptions?.join(", ") ||
        "Not Available",

      rating: shop.rating || 0,

      mapsUrl: shop.googleMapsUri || "",
    }));

    shops.sort((a, b) => a.distance - b.distance);

    console.log("Mapped Shops", shops);

    return shops;
  } catch (err) {
    console.error(err);
    return [];
  }
}

/**
 * Browser Current Location
 */
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      reject,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
}