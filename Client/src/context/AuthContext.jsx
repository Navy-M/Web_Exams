import { createContext, useContext, useState, useEffect } from "react";
import * as api from "../services/api";
import { useI18n } from "../i18n";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { t } = useI18n();
  const [user, setUser] = useState(null);
  const [userToken, setUserToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (!userToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.getProfile();
        setUser(res.user);
      } catch (err) {
        console.error("Profile error:", err);
        setUser(null);
        setUserToken(null);
        localStorage.removeItem("token");
        setError(t("auth.sessionExpired"));
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [userToken, t]);

  const login = async (credentials) => {
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
      setError(t("auth.invalidCredentials"));
      throw err;
    }
  };

  const signup = async (credentials) => {
    try {
      const response = await api.createUser(credentials);
      const { token, user } = response;

      localStorage.setItem("token", token);
      setUser(user);
      setUserToken(token);
      setError(null);

      return user;
    } catch (err) {
      console.error("Signup error:", err);
      setError(err?.response?.data?.message || t("auth.signupFailed"));
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn("Logout failed, but clearing local state anyway.");
      setError(t("auth.logoutFailed"));
    }
    localStorage.removeItem("token");
    setUser(null);
    setUserToken(null);
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
