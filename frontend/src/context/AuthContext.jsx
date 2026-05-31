/**
 * @fileoverview Authentication Context - Global authentication state management
 * @module context/AuthContext
 * @description Provides authentication context with user state, login/logout functions,
 * and role-based access control helpers.
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

/**
 * Custom hook to access authentication context
 * @returns {Object} Authentication context value
 * @throws {Error} If used outside AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Authentication Provider Component
 * Manages global authentication state and provides auth methods
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Provider component
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Check if user is logged in on component mount
   * Restores user session from localStorage
   */
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  /**
   * Login user with username and password
   * @async
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object>} Result object with success flag and optional error
   */
  const login = async (username, password) => {
    try {
      const response = await authAPI.login({ username, password });
      const { user, token } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  /**
   * Logout current user
   * Clears localStorage and resets user state
   * @async
   */
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  /**
   * Check if current user has a specific role
   * @param {string} role - Role to check
   * @returns {boolean} True if user has the role
   */
  const hasRole = (role) => {
    return user?.role === role;
  };

  /**
   * Check if current user has any of the specified roles
   * @param {...string} roles - Roles to check
   * @returns {boolean} True if user has any of the roles
   */
  const hasAnyRole = (...roles) => {
    return roles.includes(user?.role);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    hasRole,
    hasAnyRole,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Made with Bob
