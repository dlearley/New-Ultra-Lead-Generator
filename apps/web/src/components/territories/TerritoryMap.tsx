import React, { useEffect } from 'react';
import L from 'leaflet';

interface Territory {
  id: string;
  name: string;
  type: string;
  polygonCoordinates?: any[];
  radiusGeometry?: any;
  stateCode?: string;
  countyCode?: string;
}

interface TerritoryMapProps {
  territories: Territory[];
  selectedTerritory: Territory | null;
  onSelectTerritory: (territory: Territory | null) => void;
}

export const TerritoryMap: React.FC<TerritoryMapProps> = ({
  territories,
  selectedTerritory,
  onSelectTerritory,
}) => {
  useEffect(() => {
    const container = document.getElementById('map');
    if (!container) return;

    // Initialize map
    const map = L.map('map').setView([37.8, -96], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add territories as markers
    territories.forEach((territory) => {
      const marker = L.marker([37.8, -96])
        .bindPopup(territory.name)
        .addTo(map);

      marker.on('click', () => onSelectTerritory(territory));
    });

    return () => {
      map.remove();
    };
  }, [territories, onSelectTerritory]);

  return (
    <div id="map" style={{ width: '100%', height: '100%', minHeight: '600px' }} />
  );
};
