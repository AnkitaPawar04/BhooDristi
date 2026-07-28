import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { useApp } from "../../contexts/AppContext";
import { getTranslation } from "../../utils/i18n";
import useGeolocation from "../../hooks/useGeolocation";
import MaharashtraMap from "../../maps/MaharashtraMap";
import dashboardBgVideo from "./videos/dashboard.mp4";

import {
  DISTRICT_CENTERS,
  maharashtraDistricts,
} from "../../utils/districts";

import {
  getNearbyFertilizerShops,
} from "../../services/fertilizerService";

const DEFAULT_DISTRICT = "Pune";

const DEFAULT_LOCATION = {
  ...DISTRICT_CENTERS[DEFAULT_DISTRICT],
  label: DEFAULT_DISTRICT,
};

const toRadians = (value) => (value * Math.PI) / 180;

const distanceKm = (from, to) => {
  const earthRadius = 6371;

  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return earthRadius * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const buildDirectionsUrl = (origin, shop) => {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${shop.latitude},${shop.longitude}&travelmode=driving`;
};

const findClosestDistrictCenter = (lat, lon) => {
  let closestDistrict = DEFAULT_DISTRICT;
  let closestDistance = Infinity;

  maharashtraDistricts.forEach((district) => {
    const center = DISTRICT_CENTERS[district];

    if (!center) return;

    const distance = distanceKm(
      {
        latitude: lat,
        longitude: lon,
      },
      center
    );

    if (distance < closestDistance) {
      closestDistance = distance;
      closestDistrict = district;
    }
  });

  return closestDistrict;
};

const FertilizerShopsPage = ({ onNavigate }) => {
  const { language } = useApp();

  const {
    location,
    loading: locationLoading,
    error: locationError,
    getLocation,
  } = useGeolocation();

  const [radiusKm, setRadiusKm] = useState(10);

  const [selectedDistrict, setSelectedDistrict] =
    useState(DEFAULT_DISTRICT);

  const [selectedLocation, setSelectedLocation] =
    useState(DEFAULT_LOCATION);

  const [locationMode, setLocationMode] =
    useState("district");

  const [shops, setShops] = useState([]);

  const [loadingShops, setLoadingShops] =
    useState(false);

  const [selectedShopId, setSelectedShopId] =
    useState(null);
      // -----------------------------
  // Detect Current Location
  // -----------------------------
  useEffect(() => {
    if (!location) return;

    const detectedDistrict = findClosestDistrictCenter(
      location.latitude,
      location.longitude
    );

    setSelectedDistrict(detectedDistrict);

    setLocationMode("gps");

    setSelectedLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      label: "Current Location",
    });
  }, [location]);

  // -----------------------------
  // Load nearby fertilizer shops
  // -----------------------------
  useEffect(() => {
    const loadShops = async () => {
      try {
        setLoadingShops(true);

        const result = await getNearbyFertilizerShops(
          selectedLocation.latitude,
          selectedLocation.longitude,
          radiusKm * 1000
        );

        setShops(result);

        if (result.length > 0) {
          setSelectedShopId(result[0].id);
        } else {
          setSelectedShopId(null);
        }
      } catch (err) {
        console.error(err);
        setShops([]);
        setSelectedShopId(null);
      } finally {
        setLoadingShops(false);
      }
    };

    loadShops();
  }, [selectedLocation, radiusKm]);

  // -----------------------------
  // Visible shops
  // -----------------------------
  const shopsWithDistance = useMemo(() => {
    return shops
      .filter((shop) => shop.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }, [shops, radiusKm]);

  // -----------------------------
  // Selected Shop
  // -----------------------------
  const selectedShop =
    shopsWithDistance.find(
      (shop) => shop.id === selectedShopId
    ) ||
    shopsWithDistance[0] ||
    null;

  // -----------------------------
  // Map Markers
  // -----------------------------
  const mapMarkers = shopsWithDistance.map((shop) => ({
    id: shop.id,
    latitude: shop.latitude,
    longitude: shop.longitude,
    title: shop.name,
    description: shop.address || "",
  }));

  // -----------------------------
  // Handlers
  // -----------------------------
  const handleShopSelect = (shop) => {
    setSelectedShopId(shop.id);
  };

  const handleDistrictChange = (district) => {
    const center = DISTRICT_CENTERS[district];

    if (!center) return;

    setSelectedDistrict(district);

    setLocationMode("district");

    setSelectedLocation({
      ...center,
      label: district,
    });
  };

  const handleDirections = (shop) => {
    window.open(
      buildDirectionsUrl(selectedLocation, shop),
      "_blank",
      "noopener,noreferrer"
    );
  };
  

  return (    
  <div className="flex h-screen bg-transparent dark:bg-transparent">
      <Sidebar currentPage="fertilizer" onNavigate={onNavigate} />

      <div className="flex-1 overflow-auto farm-dashboard relative">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="dashboard-bg-video"
          ref={(video) => {
            if (video) video.playbackRate = 0.5;
          }}
        >
          <source src={dashboardBgVideo} type="video/mp4" />
        </video>

        <div className="dashboard-content relative z-10">
          <div className="p-8 relative z-10">

            <div className="page-header animate-fadeInUp">
              <h1 className="page-title">
                {getTranslation(language, "fertilizerShops") ||
                  "Nearby Fertilizer Shops"}
              </h1>

              <p className="page-subtitle">
                Find fertilizer shops near your farm using OpenStreetMap.
              </p>

              <div className="page-divider"></div>
            </div>

            <div
              className="grid grid-cols-1 xl:grid-cols-[1fr_1.15fr] gap-6 mb-6 animate-fadeInUp"
              style={{ animationDelay: "0.1s" }}
            >
              <div className="farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-emerald-200 dark:border-emerald-700 overflow-hidden">

                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 text-white">
                  <h2 className="text-2xl font-bold">
                    📍 Search Location
                  </h2>

                  <p className="text-emerald-100 mt-1 text-sm">
                    Choose district, use GPS or click on the map.
                  </p>
                </div>

                <div className="p-5 space-y-5">

                  <label className="flex flex-col gap-2">
                    <span className="font-semibold">
                      Select District
                    </span>

                    <select
                      value={selectedDistrict}
                      onChange={(e) =>
                        handleDistrictChange(e.target.value)
                      }
                      className="border rounded-xl p-3"
                    >
                      {maharashtraDistricts.map((district) => (
                        <option
                          key={district}
                          value={district}
                        >
                          {district}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    onClick={getLocation}
                    disabled={locationLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl p-3 font-semibold"
                  >
                    {locationLoading
                      ? "Detecting Location..."
                      : "Use Current Location"}
                  </button>

                  {locationError && (
                    <div className="bg-red-100 border-l-4 border-red-500 p-3 rounded">
                      {locationError}
                    </div>
                  )}

                  <label className="flex flex-col gap-2">

                    <span className="font-semibold">
                      Search Radius
                    </span>

                    <select
                      value={radiusKm}
                      onChange={(e) =>
                        setRadiusKm(Number(e.target.value))
                      }
                      className="border rounded-xl p-3"
                    >
                      <option value={5}>5 km</option>
                      <option value={10}>10 km</option>
                      <option value={20}>20 km</option>
                      <option value={30}>30 km</option>
                      <option value={50}>50 km</option>
                    </select>

                  </label>

                  <div className="rounded-xl bg-emerald-50 p-4 border">

                    <p className="text-sm font-semibold">
                      Selected Location
                    </p>

                    <h3 className="font-bold text-lg mt-1">
                      {selectedLocation.label}
                    </h3>

                    <p className="text-sm text-gray-600 mt-2">
                      {selectedLocation.latitude.toFixed(4)},
                      {" "}
                      {selectedLocation.longitude.toFixed(4)}
                    </p>

                    <p className="text-xs mt-2 uppercase">

                      {locationMode === "gps"
                        ? "Current GPS"

                        : locationMode === "map"

                        ? "Map Selected"

                        : "District Center"}

                    </p>

                  </div>

                  <div className="rounded-2xl overflow-hidden border">

                    <MaharashtraMap
                      selectedLocation={selectedLocation}
                      markers={mapMarkers}
                      className="w-full h-[360px]"

                      onLocationSelect={(lat, lon) => {

                        setLocationMode("map");

                        setSelectedLocation({
                          latitude: lat,
                          longitude: lon,
                          label: "Selected on Map",
                        });

                      }}
                    />

                  </div>

                  <div className="grid grid-cols-2 gap-4">

                    <div className="bg-emerald-50 rounded-xl border p-4">

                      <p className="text-sm">
                        Shops Found
                      </p>

                      <h2 className="text-3xl font-bold text-emerald-700">

                        {shopsWithDistance.length}

                      </h2>

                    </div>

                    <div className="bg-blue-50 rounded-xl border p-4">

                      <p className="text-sm">
                        Radius
                      </p>

                      <h2 className="text-3xl font-bold text-blue-700">

                        {radiusKm} km

                      </h2>

                    </div>

                  </div>

                </div>

              </div>
                            <div className="farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-blue-200 dark:border-blue-700 overflow-hidden">

                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                  <h2 className="text-2xl font-bold">
                    🛒 Nearby Fertilizer Shops
                  </h2>

                  <p className="text-blue-100 mt-1 text-sm">
                    Select a shop to view details or open directions.
                  </p>
                </div>

                <div className="p-5 space-y-4 max-h-[760px] overflow-y-auto">

                  {shopsWithDistance.length === 0 ? (

                    <div className="rounded-2xl border-2 border-dashed border-emerald-300 p-8 text-center">

                      <h3 className="text-xl font-bold">
                        No fertilizer shops found
                      </h3>

                      <p className="text-gray-600 mt-2">
                        Try increasing the search radius or choose another district.
                      </p>

                      <div className="mt-5 flex justify-center gap-3">

                        <button
                          onClick={() => setRadiusKm(20)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl"
                        >
                          Increase Radius
                        </button>

                        <button
                          onClick={getLocation}
                          className="border px-5 py-2 rounded-xl hover:bg-gray-100"
                        >
                          Use GPS
                        </button>

                      </div>

                    </div>

                  ) : (

                    shopsWithDistance.map((shop) => (

                      <div
                        key={shop.id}
                        className={`rounded-2xl border-2 p-5 transition-all duration-300 cursor-pointer ${
                          selectedShopId === shop.id
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-gray-200 hover:border-emerald-300"
                        }`}
                      >

                        <div className="flex justify-between items-start">

                          <div>

                            <h3 className="text-lg font-bold text-gray-900">
                              {shop.name}
                            </h3>

                            <p className="text-sm text-gray-600 mt-1">
                              {shop.address || "Address not available"}
                            </p>

                          </div>

                          <div className="text-right">

                            <p className="text-xl font-bold text-emerald-700">
                              {shop.distance.toFixed(1)} km
                            </p>

                            <p className="text-xs text-gray-500">
                              from selected location
                            </p>

                          </div>

                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">

                          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs">
                            {selectedDistrict}
                          </span>

                          {shop.phone && (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
                              Phone Available
                            </span>
                          )}

                          {shop.website && (
                            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs">
                              Website
                            </span>
                          )}

                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">

                          <div>

                            <p className="text-sm">
                              <strong>Phone:</strong>
                            </p>

                            <p className="text-gray-700">
                              {shop.phone || "Not Available"}
                            </p>

                          </div>

                          <div>

                            <p className="text-sm">
                              <strong>Opening Hours:</strong>
                            </p>

                            <p className="text-gray-700">
                              {shop.openingHours || "Not Available"}
                            </p>

                          </div>

                        </div>

                        <div className="mt-5 flex gap-3">

                          <button
                            onClick={() => handleShopSelect(shop)}
                            className="flex-1 border rounded-xl py-2 hover:bg-gray-100 font-semibold"
                          >
                            View Details
                          </button>

                          <button
                            onClick={() => handleDirections(shop)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2 font-semibold"
                          >
                            Get Directions
                          </button>

                        </div>

                      </div>

                    ))

                  )}
                                    {selectedShop && (
                    <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-700 bg-white dark:bg-gray-800 p-5 shadow-sm">

                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-2">
                        Selected Shop Details
                      </p>

                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedShop.name}
                      </h3>

                      <p className="text-gray-600 dark:text-gray-300 mt-2">
                        {selectedShop.address || "Address not available"}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">

                        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-4">
                          <p className="text-sm text-emerald-700 dark:text-emerald-300">
                            Distance
                          </p>

                          <h3 className="text-xl font-bold mt-1">
                            {selectedShop.distance.toFixed(1)} km
                          </h3>
                        </div>

                        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4">
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            Phone
                          </p>

                          <h3 className="text-sm font-semibold mt-1 break-words">
                            {selectedShop.phone || "Not Available"}
                          </h3>
                        </div>

                        <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 p-4">
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            Opening Hours
                          </p>

                          <h3 className="text-sm font-semibold mt-1">
                            {selectedShop.openingHours || "Not Available"}
                          </h3>
                        </div>

                      </div>

                      {selectedShop.website && (
                        <div className="mt-5">
                          <a
                            href={selectedShop.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-semibold"
                          >
                            Visit Website
                          </a>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FertilizerShopsPage;
