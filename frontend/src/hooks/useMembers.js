import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';

const useMembers = (enabled = true) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');

  const fetchMembers = useCallback(async () => {
    if (!enabled) {
      setMembers([]);
      setLoading(false);
      setError('');
      return [];
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.get('/members');
      setMembers(response.data);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.detail || '加载成员列表失败';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    loading,
    error,
    refresh: fetchMembers,
  };
};

export default useMembers;
