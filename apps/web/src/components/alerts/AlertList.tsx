import React from 'react';

interface Alert {
  id: string;
  name: string;
  territoryId: string;
  cadence: string;
  deliveryChannels: string[];
  isActive: boolean;
  lastRunAt?: Date;
}

interface AlertListProps {
  alerts: Alert[];
  selectedAlert: Alert | null;
  onSelectAlert: (alert: Alert | null) => void;
  onTriggerAlert: (alertId: string) => Promise<void>;
}

export const AlertList: React.FC<AlertListProps> = ({
  alerts,
  selectedAlert,
  onSelectAlert,
  onTriggerAlert,
}) => {
  const handleTrigger = async (e: React.MouseEvent, alertId: string) => {
    e.stopPropagation();
    await onTriggerAlert(alertId);
  };

  return (
    <div className="alert-list">
      <h3>Alerts ({alerts.length})</h3>
      {alerts.length === 0 ? (
        <p className="empty-state">No alerts created yet</p>
      ) : (
        <ul className="alerts">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className={`alert-item ${selectedAlert?.id === alert.id ? 'active' : ''}`}
              onClick={() => onSelectAlert(alert)}
            >
              <div className="alert-header">
                <div className="alert-name">{alert.name}</div>
                <button
                  className="btn btn-small btn-success"
                  onClick={(e) => handleTrigger(e, alert.id)}
                >
                  Trigger
                </button>
              </div>
              <div className="alert-details">
                <span className="cadence">{alert.cadence}</span>
                <span className="channels">
                  {alert.deliveryChannels.join(', ')}
                </span>
              </div>
              {alert.lastRunAt && (
                <div className="last-run">
                  Last run: {new Date(alert.lastRunAt).toLocaleString()}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
