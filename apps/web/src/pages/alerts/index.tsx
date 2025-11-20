import React, { useState, useEffect } from 'react';
import { AlertForm } from '@/components/alerts/AlertForm';
import { AlertList } from '@/components/alerts/AlertList';
import { AlertRunHistory } from '@/components/alerts/AlertRunHistory';
import { alertStore } from '@/stores/alertStore';
import '@/styles/alerts.css';

export default function AlertsPage() {
  const { alerts, runs, fetchAlerts, fetchRuns, createAlert, triggerAlert } = alertStore();
  const [showForm, setShowForm] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    if (selectedAlert) {
      fetchRuns(selectedAlert.id);
    }
  }, [selectedAlert]);

  const handleCreateAlert = async (data: any) => {
    await createAlert(data);
    setShowForm(false);
  };

  const handleTriggerAlert = async (alertId: string) => {
    await triggerAlert(alertId);
  };

  return (
    <div className="alerts-page">
      <header className="alerts-header">
        <h1>Alert Manager</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Close Form' : 'Create Alert'}
        </button>
      </header>

      <div className="alerts-container">
        <div className="alerts-main">
          {showForm && (
            <AlertForm onSubmit={handleCreateAlert} />
          )}
          <AlertList
            alerts={alerts}
            selectedAlert={selectedAlert}
            onSelectAlert={setSelectedAlert}
            onTriggerAlert={handleTriggerAlert}
          />
        </div>

        {selectedAlert && (
          <div className="alerts-sidebar">
            <AlertRunHistory
              alertId={selectedAlert.id}
              runs={runs}
            />
          </div>
        )}
      </div>
    </div>
  );
}
