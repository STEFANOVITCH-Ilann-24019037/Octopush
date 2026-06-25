import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('octopush_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem('octopush_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (identifier, password) => {
    const { data } = await api.post('/auth/login', { identifier, password });
    localStorage.setItem('octopush_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const signup = async (username, email, password, name) => {
    const { data } = await api.post('/auth/signup', { username, email, password, name });
    localStorage.setItem('octopush_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('octopush_token');
    setUser(null);
  };

  const updateMe = async (patch) => {
    const { data } = await api.patch('/users/me', patch);
    setUser(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateMe }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
