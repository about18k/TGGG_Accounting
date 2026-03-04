import { useCallback, useEffect, useState } from 'react';
import { getMyAttendance } from '../services/attendanceService';

export function useMyAttendance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Missing login token. Please login again.');
      }

      const data = await getMyAttendance();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Failed to load attendance.';
      setError(message);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const latest = records?.length ? records[0] : null;

  return { records, loading, error, refresh: fetchRecords, latest };
}

export default useMyAttendance;

