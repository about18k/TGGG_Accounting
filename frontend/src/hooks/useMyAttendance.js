import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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

      const res = await axios.get(`${API_URL}/attendance/my/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecords(Array.isArray(res.data) ? res.data : []);
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
