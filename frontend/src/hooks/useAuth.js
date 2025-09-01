import { useEffect, useState, useCallback } from 'react';

export const useAuth = () => {
  const [token, setToken] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('auth.token');
    if (t) {
      setToken(t);
      setIsAdmin(true);
    }
  }, []);

  const login = useCallback((t) => {
    localStorage.setItem('auth.token', t);
    setToken(t);
    setIsAdmin(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth.token');
    setToken(null);
    setIsAdmin(false);
  }, []);

  return { token, isAdmin, login, logout };
};

export default useAuth;
