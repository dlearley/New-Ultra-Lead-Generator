import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { TerritoryForm } from '@/components/territories/TerritoryForm';
import { TerritoryList } from '@/components/territories/TerritoryList';
import { TerritoryMap } from '@/components/territories/TerritoryMap';
import { territoryStore } from '@/stores/territoryStore';
import '@/styles/map.css';

const DynamicMapComponent = dynamic(
  () => import('@/components/territories/TerritoryMap').then((mod) => mod.TerritoryMap),
  { ssr: false }
);

export default function MapPage() {
  const { territories, fetchTerritories, createTerritory } = territoryStore();
  const [showForm, setShowForm] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState<any>(null);

  useEffect(() => {
    fetchTerritories();
  }, []);

  const handleCreateTerritory = async (data: any) => {
    await createTerritory(data);
    setShowForm(false);
  };

  return (
    <div className="map-page">
      <header className="map-header">
        <h1>Territory Management</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Close Form' : 'Create Territory'}
        </button>
      </header>

      <div className="map-container">
        <div className="map-sidebar">
          {showForm && (
            <TerritoryForm onSubmit={handleCreateTerritory} />
          )}
          <TerritoryList
            territories={territories}
            selectedTerritory={selectedTerritory}
            onSelectTerritory={setSelectedTerritory}
          />
        </div>

        <div className="map-main">
          <DynamicMapComponent
            territories={territories}
            selectedTerritory={selectedTerritory}
            onSelectTerritory={setSelectedTerritory}
          />
        </div>
      </div>
    </div>
  );
}
