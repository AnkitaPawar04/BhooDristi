import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MaharashtraMap = ({
  onLocationSelect,
  selectedLocation,
  markers = [],
  className = 'w-full h-96 rounded-lg overflow-hidden border-2 border-gray-300'
}) => {
  const MAHARASHTRA_CENTER = [19.7515, 75.7139];
  const ZOOM_LEVEL = 7;

  return (
    <div className={className}>
      <MapContainer center={MAHARASHTRA_CENTER} zoom={ZOOM_LEVEL} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <MapClickHandler onMapClick={onLocationSelect} />
        {selectedLocation && (
          <Marker position={[selectedLocation.latitude, selectedLocation.longitude]}>
            <Popup>
              <div className="text-sm">
                <p><strong>Location Selected</strong></p>
                <p>Lat: {selectedLocation.latitude.toFixed(4)}</p>
                <p>Lng: {selectedLocation.longitude.toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        )}
        {markers.map((marker) => (
          <Marker key={marker.id || `${marker.latitude}-${marker.longitude}`} position={[marker.latitude, marker.longitude]}>
            <Popup>
              <div className="text-sm space-y-1">
                <p className="font-bold">{marker.title || 'Location'}</p>
                {marker.description && <p>{marker.description}</p>}
                {typeof marker.distance === 'number' && <p>Distance: {marker.distance.toFixed(1)} km</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MaharashtraMap;
