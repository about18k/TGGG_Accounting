import React, { useEffect, useState } from 'react';
import Alert from '../../../components/Alert.jsx';
import { TableSkeleton } from '../../../components/SkeletonLoader.jsx';
import { getMyLeaves } from '../../../services/leaveService';

const badgeStyleByStatus = {
  pending: {
    background: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    color: '#fcd34d',
  },
  approved: {
    background: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#6ee7b7',
  },
  rejected: {
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#fca5a5',
  },
  cancelled: {
    background: 'rgba(156, 163, 175, 0.12)',
    border: '1px solid rgba(156, 163, 175, 0.3)',
    color: '#d1d5db',
  },
};

export default function LeaveStatus({ token }) {
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getMyLeaves();
        setRequests(Array.isArray(data) ? data : []);
      } catch (err) {
        setAlert({
          type: 'error',
          title: 'Load failed',
          message: err.response?.data?.error || 'Could not load leave requests.',
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  return (
    <div className="dashboard">
      {alert && (
        <Alert
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="attendance-table">
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 style={{ margin: 0 }}>My Leave Requests</h3>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Submitted</th>
                  <th>Type</th>
                  <th>Date Range</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: '#a0a4a8', padding: '1.5rem' }}>
                      No leave requests yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => {
                    const statusKey = String(req.status || 'pending').toLowerCase();
                    return (
                      <tr key={req.id}>
                        <td>{req.created_at ? new Date(req.created_at).toLocaleDateString() : '-'}</td>
                        <td>{req.leave_type_label || req.leave_type || '-'}</td>
                        <td>{req.start_date} to {req.end_date}</td>
                        <td style={{ maxWidth: '320px', whiteSpace: 'normal' }}>{req.reason || '-'}</td>
                        <td>
                          <span
                            style={{
                              ...(badgeStyleByStatus[statusKey] || badgeStyleByStatus.pending),
                              display: 'inline-flex',
                              alignItems: 'center',
                              borderRadius: '999px',
                              padding: '0.2rem 0.7rem',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              textTransform: 'capitalize',
                            }}
                          >
                            {req.status_label || req.status || 'Pending'}
                          </span>
                        </td>
                        <td style={{ maxWidth: '280px', whiteSpace: 'normal' }}>
                          {req.rejection_reason || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
