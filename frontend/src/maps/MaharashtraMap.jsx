import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
  GeoJSON,
  Polygon,
} from 'react-leaflet';
import L from 'leaflet';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { area as turfArea, point, polygon as turfPolygon } from '@turf/turf';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const MAHARASHTRA_CENTER = [19.7515, 75.7139];
const ZOOM_LEVEL = 7;

/*
 * Get Maharashtra from the India state GeoJSON.
 */
const getMaharashtraFeature = (geojson) => {
  if (!geojson?.features) {
    return null;
  }

  return (
    geojson.features.find((feature) => {
      const properties = feature.properties || {};

      const stateName =
        properties.ST_NAME ||
        properties.STNAME ||
        properties.NAME_1 ||
        properties.name ||
        properties.NAME;

      return (
        typeof stateName === 'string' &&
        stateName.trim().toLowerCase() === 'maharashtra'
      );
    }) || null
  );
};

/*
 * Get district name from a Maharashtra district feature.
 *
 * Based on the downloaded GeoJSON:
 *
 * NAME_1 = Maharashtra
 * NAME_2 = District name
 */
const getDistrictName = (feature) => {
  if (!feature?.properties) {
    return null;
  }

  return (
    feature.properties.NAME_2 ||
    feature.properties.DISTRICT ||
    feature.properties.District ||
    feature.properties.district ||
    null
  );
};

/*
 * Find which Maharashtra district contains the clicked point.
 */
const findDistrictForPoint = (latitude, longitude, districts) => {
  if (!districts?.features) {
    return null;
  }

  const clickedPoint = point([longitude, latitude]);

  for (const district of districts.features) {
    try {
      if (booleanPointInPolygon(clickedPoint, district)) {
        return {
          name: getDistrictName(district),
          feature: district,
        };
      }
    } catch (error) {
      console.error('Error checking district polygon:', error);
    }
  }

  return null;
};

/*
 * Handles clicks on the map.
 */
const MapClickHandler = ({
  onMapClick,
  onInvalidClick,
  maharashtraFeature,
  districts,
  drawing,
}) => {
  useMapEvents({
    click(e) {
      if (drawing) return;
      const latitude = e.latlng.lat;
      const longitude = e.latlng.lng;

      // Boundary data has not loaded yet.
      if (!maharashtraFeature) {
        return;
      }

      const clickedPoint = point([longitude, latitude]);

      // First verify that the point is inside Maharashtra.
      const isInsideMaharashtra = booleanPointInPolygon(
        clickedPoint,
        maharashtraFeature
      );

      if (!isInsideMaharashtra) {
        onInvalidClick?.();
        return;
      }

      // Find the district containing this point.
      const districtResult = findDistrictForPoint(
        latitude,
        longitude,
        districts
      );

      const districtName = districtResult?.name || null;

      onMapClick(latitude, longitude, districtName);
    },
  });

  return null;
};

const BoundaryDrawer = ({ polygon, onPolygonChange, onDrawingChange }) => {
  const [vertices, setVertices] = useState(() => polygon?.coordinates?.[0]?.slice(0, -1) || []);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    setVertices(polygon?.coordinates?.[0]?.slice(0, -1) || []);
  }, [polygon]);

  useEffect(() => {
    onDrawingChange?.(drawing);
  }, [drawing, onDrawingChange]);

  useMapEvents({
    click(event) {
      if (!drawing) return;
      setVertices((current) => [...current, [event.latlng.lng, event.latlng.lat]]);
    },
  });

  const finish = () => {
    if (vertices.length < 3) return;
    const closed = [...vertices, vertices[0]];
    const nextPolygon = { type: 'Polygon', coordinates: [closed] };
    onPolygonChange(nextPolygon, turfArea(turfPolygon([closed])) / 10000);
    setDrawing(false);
  };

  const clear = () => {
    setVertices([]);
    setDrawing(true);
    onPolygonChange(null, null);
  };

  return (
    <>
      {vertices.length >= 3 && <Polygon positions={vertices.map(([lng, lat]) => [lat, lng])} pathOptions={{ color: '#2563eb' }} />}
      <div className="leaflet-bottom leaflet-left" style={{ zIndex: 1000 }}>
        <div className="leaflet-control bg-white rounded shadow p-2 m-2 space-x-2">
          {!drawing && <button type="button" className="px-2 py-1 text-xs bg-blue-600 text-white rounded" onClick={() => setDrawing(true)}>{polygon ? 'Edit boundary' : 'Draw boundary'}</button>}
          {drawing && <button type="button" className="px-2 py-1 text-xs bg-green-600 text-white rounded disabled:bg-gray-400" disabled={vertices.length < 3} onClick={finish}>Finish</button>}
          <button type="button" className="px-2 py-1 text-xs bg-red-600 text-white rounded" onClick={clear}>Clear</button>
          {drawing && <span className="text-xs text-gray-600">Click at least 3 corners</span>}
        </div>
      </div>
    </>
  );
};

const SelectedLocationViewport = ({ selectedLocation }) => {
  const map = useMap();
  const latitude = selectedLocation?.latitude;
  const longitude = selectedLocation?.longitude;

  useEffect(() => {
    if (latitude == null || longitude == null) return;
    map.flyTo([latitude, longitude], 12, { animate: true, duration: 1.2 });
  }, [map, latitude, longitude]);

  return null;
};

const MaharashtraMap = ({
  onLocationSelect,
  selectedLocation,
  markers = [],
  enablePolygonDrawing = false,
  polygon = null,
  onPolygonChange,
  className =
    'w-full h-96 rounded-lg overflow-hidden border-2 border-gray-300',
}) => {
  const [maharashtraFeature, setMaharashtraFeature] = useState(null);
  const [districts, setDistricts] = useState(null);
  const [mapMessage, setMapMessage] = useState('');
  const [districtLoading, setDistrictLoading] = useState(true);
  const [drawingBoundary, setDrawingBoundary] = useState(false);
  const isDrawingBoundary = enablePolygonDrawing && drawingBoundary;

  /*
   * Load Maharashtra state boundary.
   */
  useEffect(() => {
    const loadStateBoundary = async () => {
      try {
        const response = await fetch('/india_state.geojson');

        if (!response.ok) {
          throw new Error(
            `Failed to load state boundary: ${response.status}`
          );
        }

        const indiaStates = await response.json();

        const feature = getMaharashtraFeature(indiaStates);

        if (!feature) {
          console.error(
            'Maharashtra boundary was not found in india_state.geojson'
          );
          return;
        }

        setMaharashtraFeature(feature);
      } catch (error) {
        console.error('Error loading Maharashtra boundary:', error);
      }
    };

    loadStateBoundary();
  }, []);

  /*
   * Load Maharashtra-only district GeoJSON.
   */
  useEffect(() => {
    const loadDistricts = async () => {
      try {
        setDistrictLoading(true);

        const response = await fetch('/maharashtra_districts.geojson');

        if (!response.ok) {
          throw new Error(
            `Failed to load Maharashtra districts: ${response.status}`
          );
        }

        const data = await response.json();

        if (!data?.features || !Array.isArray(data.features)) {
          throw new Error('Invalid Maharashtra district GeoJSON format.');
        }

        console.log(
          `Loaded ${data.features.length} Maharashtra district features`
        );

        setDistricts(data);
      } catch (error) {
        console.error('Error loading Maharashtra districts:', error);
      } finally {
        setDistrictLoading(false);
      }
    };

    loadDistricts();
  }, []);

  /*
   * Valid location selected.
   */
  const handleValidLocation = (latitude, longitude, district) => {
    setMapMessage('');

    /*
     * Pass district together with the coordinates.
     *
     * This supports both:
     *
     * onLocationSelect(lat, lng, district)
     *
     * and existing parent logic that only uses lat/lng.
     */
    onLocationSelect(latitude, longitude, district);
  };

  /*
   * User clicked outside Maharashtra.
   */
  const handleInvalidLocation = () => {
    setMapMessage('Please select a location within Maharashtra.');
  };

  /*
   * Styling for district polygons.
   */
  const districtStyle = {
    color: '#15803d',
    weight: 1,
    fillColor: '#22c55e',
    fillOpacity: 0.04,
  };

  /*
   * Highlight district when mouse enters.
   */
  const districtEvents = {
    mouseover: (event) => {
      event.target.setStyle({
        weight: 2,
        fillOpacity: 0.12,
      });
    },

    mouseout: (event) => {
      event.target.setStyle(districtStyle);
    },
  };

  return (
    <div className={className}>
      <MapContainer
        center={MAHARASHTRA_CENTER}
        zoom={ZOOM_LEVEL}
        style={{ height: '100%', width: '100%' }}
      >
        <SelectedLocationViewport selectedLocation={selectedLocation} />

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {/* Maharashtra state boundary */}
        {maharashtraFeature && (
          <GeoJSON
            data={maharashtraFeature}
            style={{
              color: '#15803d',
              weight: 3,
              fillColor: '#22c55e',
              fillOpacity: 0.06,
            }}
          />
        )}

        {/* Maharashtra district boundaries */}
        {districts && (
          <GeoJSON
            data={districts}
            style={districtStyle}
            onEachFeature={(feature, layer) => {
              const districtName = getDistrictName(feature);

              layer.bindPopup(
                `<strong>${districtName || 'District'}</strong>`
              );

              layer.on(districtEvents);
            }}
          />
        )}

        {/* Map click handling */}
        <MapClickHandler
          onMapClick={handleValidLocation}
          onInvalidClick={handleInvalidLocation}
          maharashtraFeature={maharashtraFeature}
          districts={districts}
          drawing={isDrawingBoundary}
        />

        {enablePolygonDrawing && (
          <BoundaryDrawer
            polygon={polygon}
            onPolygonChange={onPolygonChange}
            onDrawingChange={setDrawingBoundary}
          />
        )}

        {/* Selected location */}
        {selectedLocation && (
          <Marker
            position={[
              selectedLocation.latitude,
              selectedLocation.longitude,
            ]}
          >
            <Popup>
              <div className="text-sm space-y-1">
                <p>
                  <strong>Selected Location</strong>
                </p>

                <p>
                  Lat: {selectedLocation.latitude.toFixed(4)}
                </p>

                <p>
                  Lng: {selectedLocation.longitude.toFixed(4)}
                </p>

                {selectedLocation.district && (
                  <p>
                    District: {selectedLocation.district}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Other markers */}
        {markers.map((marker) => (
          <Marker
            key={
              marker.id ||
              `${marker.latitude}-${marker.longitude}`
            }
            position={[
              marker.latitude,
              marker.longitude,
            ]}
          >
            <Popup>
              <div className="text-sm space-y-1">
                <p className="font-bold">
                  {marker.title || 'Location'}
                </p>

                {marker.description && (
                  <p>{marker.description}</p>
                )}

                {typeof marker.distance === 'number' && (
                  <p>
                    Distance: {marker.distance.toFixed(1)} km
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Loading district data */}
      {districtLoading && (
        <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600">
          Loading Maharashtra district boundaries...
        </div>
      )}

      {/* Invalid location message */}
      {mapMessage && (
        <div className="mt-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-800">
          {mapMessage}
        </div>
      )}
    </div>
  );
};

export default MaharashtraMap;