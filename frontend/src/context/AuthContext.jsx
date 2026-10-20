import { createContext, useState, useEffect } from 'react';
import { getToken, getUser, setToken, setUser, clearAuth } from '../utils/auth';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setCurrentUser] = useState(null);
  const [token, setCurrentToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Khởi tạo trạng thái xác thực từ localStorage khi tải ứng dụng
    const savedToken = getToken();
    const savedUser = getUser();

    if (savedToken) {
      setCurrentToken(savedToken);
      setCurrentUser(savedUser);
    }
    setLoading(false);
  }, []);

  const login = (userData, authToken) => {
    setCurrentUser(userData);
    setCurrentToken(authToken);
    setUser(userData);
    setToken(authToken);
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentToken(null);
    clearAuth();
  };

  const updateUser = (updatedData) => {
    setCurrentUser((prevUser) => {
      const newUser = { ...(prevUser || {}), ...updatedData };
      setUser(newUser);
      return newUser;
    });
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token),
    isAdmin: user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN',
    loading,
    login,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
