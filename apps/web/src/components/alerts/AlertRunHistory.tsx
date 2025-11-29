import React from 'react';

interface AlertRun {
  id: string;
  alertId: string;
  status: string;
  newLeadsCount: number;
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

interface AlertRunHistoryProps {
  alertId: string;
  runs: AlertRun[];
}

export const AlertRunHistory: React.FC<AlertRunHistoryProps> = ({ alertId, runs }) => {
  const alertRuns = runs.filter((run) => run.alertId === alertId);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'success':
        return 'badge-success';
      case 'failed':
        return 'badge-danger';
      case 'running':
        return 'badge-warning';
      default:
        return 'badge-secondary';
    }
  };

  return (
    <div className="alert-run-history">
      <h3>Run History</h3>
      {alertRuns.length === 0 ? (
        <p className="empty-state">No runs yet</p>
      ) : (
        <ul className="runs">
          {alertRuns.map((run) => (
            <li key={run.id} className="run-item">
              <div className="run-header">
                <span className={`badge ${getStatusBadgeClass(run.status)}`}>
                  {run.status}
                </span>
                <span className="run-date">
                  {new Date(run.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="run-details">
                <div className="leads-count">
                  New leads: <strong>{run.newLeadsCount}</strong>
                </div>
                {run.errorMessage && (
                  <div className="error-message">{run.errorMessage}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
