import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { authApi, getErrorMessage } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const userRef = useRef(null);
  const sessionExpiredRef = useRef(false);

  const setUser = useCallback((nextUser) => {
    userRef.current = nextUser;
    setUserState(nextUser);
  }, []);

  useEffect(() => {
    let active = true;
    authApi
      .me()
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setInitializing(false);
      });
    return () => {
      active = false;
    };
  }, [setUser]);

  useEffect(() => {
    const handleExpired = () => {
      if (userRef.current && !sessionExpiredRef.current) {
        sessionExpiredRef.current = true;
        toast.error('Your session has expired. Please sign in again.');
      }
      setUser(null);
      setInitializing(false);
    };
    window.addEventListener('spendwise:auth-expired', handleExpired);
    return () => window.removeEventListener('spendwise:auth-expired', handleExpired);
  }, [setUser]);

  const login = useCallback(
    async (credentials) => {
      const { user: nextUser } = await authApi.login(credentials);
      sessionExpiredRef.current = false;
      setUser(nextUser);
      return nextUser;
    },
    [setUser],
  );

  const register = useCallback(
    async (payload) => {
      const { user: nextUser } = await authApi.register(payload);
      sessionExpiredRef.current = false;
      setUser(nextUser);
      return nextUser;
    },
    [setUser],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Clear local state regardless; the server also clears cookies on success.
      if (error?.response?.status !== 401) {
        toast.error(getErrorMessage(error, 'Could not notify the server about sign out.'));
      }
    } finally {
      setUser(null);
    }
  }, [setUser]);

  const updateProfile = useCallback(
    async (payload) => {
      const { user: updated } = await authApi.updateProfile(payload);
      setUser(updated);
      return updated;
    },
    [setUser],
  );

  const value = useMemo(
    () => ({
      user,
      initializing,
      login,
      register,
      logout,
      updateProfile,
      setUser,
    }),
    [user, initializing, login, register, logout, updateProfile, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Context hooks intentionally live beside their providers; this rule only affects hot reload.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
