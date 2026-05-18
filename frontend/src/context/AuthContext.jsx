import React, { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  token: localStorage.getItem('sv_token') || null,
  loading: true,
  isAuthenticated: false,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      localStorage.setItem('sv_token', action.payload.token);
      return { ...state, user: action.payload.user, token: action.payload.token, isAuthenticated: true, loading: false };
    case 'LOGOUT':
      localStorage.removeItem('sv_token');
      return { ...state, user: null, token: null, isAuthenticated: false, loading: false };
    case 'LOAD_USER':
      return { ...state, user: action.payload, isAuthenticated: true, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'AUTH_ERROR':
      localStorage.removeItem('sv_token');
      return { ...state, user: null, token: null, isAuthenticated: false, loading: false };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('sv_token');
      if (!token) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        dispatch({ type: 'LOAD_USER', payload: data.user });
      } catch {
        dispatch({ type: 'AUTH_ERROR' });
      }
    };
    loadUser();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    dispatch({ type: 'LOGIN_SUCCESS', payload: data });
    return data;
  };

  const register = async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    dispatch({ type: 'LOGIN_SUCCESS', payload: data });
    return data;
  };

  const logout = () => dispatch({ type: 'LOGOUT' });

  const updateUser = (user) => dispatch({ type: 'LOAD_USER', payload: user });

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
