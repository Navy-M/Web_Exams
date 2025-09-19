import { createContext, useContext, useState, useEffect } from "react";
import * as api from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userToken, setUserToken] = useState(localStorage.getItem("token")); // persist token
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // <-- track auth errors

  useEffect(() => {
    const checkAuth = async () => {
      if (!userToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.getProfile();
        // test
        setUser(res.user);
      } catch (err) {
        console.error("Profile error:", err);
        setUser(null);
        setUserToken(null);
        localStorage.removeItem("token");
        setError("Session expired. Please log in again."); // optional message
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [userToken]);

  const login = async (credentials) => {
    // console.log('====== AuthContext login function called ======', credentials);
    try {
      const response = await api.login(credentials);
      const { token, user } = response;

      localStorage.setItem("token", token);
      setUser(user);
      setUserToken(token);
      setError(null);

      return user;
    } catch (err) {
      console.error("Login error:", err);
      setError("Invalid credentials"); // optional
      throw err; // rethrow so caller can also handle it
    }
  };

    // SIGNUP
  const signup = async (credentials) => {
    try {
      const response = await api.createUser(credentials);
      const { token, user } = response;
      console.log("Signup response:", response);

      localStorage.setItem("token", token);
      setUser(user);
      setUserToken(token);
      setError(null);

      return user;
    } catch (err) {
      console.error(" خطا در ثبت نام:", err);
      setError(err?.response?.data?.message || "خطا در ثبت نام");
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn("Logout failed, but clearing local state anyway.");
    }
    localStorage.removeItem("token");
    setUser(null);
    setUserToken(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, login, signup, logout, loading, error }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
