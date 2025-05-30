import { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.getProfile();
        setUser(res.user);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
  
    checkAuth();
  }, []);

  const login = async (credentials) => {
    // test
    // console.log('====== AuthContext login function called ======', credentials);
    try 
    {
      const response = await api.login(credentials);
      const { token, user } = response;
      localStorage.setItem('token', token);
      setUser(user);
    return user;
    } 
    catch (err) {
        throw err;
    }
  };

 
  const logout = async () => {
    await api.logout();
    localStorage.removeItem('token');
    setUser(null);
  };

  
  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
