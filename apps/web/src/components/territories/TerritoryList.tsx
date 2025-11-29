import React from 'react';

interface Territory {
  id: string;
  name: string;
  type: string;
  ownerId?: string;
  ownerIds?: string[];
  isActive: boolean;
}

interface TerritoryListProps {
  territories: Territory[];
  selectedTerritory: Territory | null;
  onSelectTerritory: (territory: Territory | null) => void;
}

export const TerritoryList: React.FC<TerritoryListProps> = ({
  territories,
  selectedTerritory,
  onSelectTerritory,
}) => {
  return (
    <div className="territory-list">
      <h3>Territories ({territories.length})</h3>
      {territories.length === 0 ? (
        <p className="empty-state">No territories created yet</p>
      ) : (
        <ul className="territories">
          {territories.map((territory) => (
            <li
              key={territory.id}
              className={`territory-item ${selectedTerritory?.id === territory.id ? 'active' : ''}`}
              onClick={() => onSelectTerritory(territory)}
            >
              <div className="territory-name">{territory.name}</div>
              <div className="territory-type">{territory.type}</div>
              {territory.ownerId && (
                <div className="territory-owner">Owner: {territory.ownerId}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
