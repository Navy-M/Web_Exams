import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createTheme, ThemeProvider as MuiThemeProvider } from "@mui/material/styles";

const STORAGE_KEY = "theme";
const ThemeContext = createContext(null);

const applyDocumentTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.body.dataset.theme = theme;
};

const getInitialTheme = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const palette = {
  light: { background: { default: "#f7f8fa", paper: "#ffffff" }, text: { primary: "#1f2937", secondary: "#64748b" }, divider: "#e2e8f0" },
  dark: { background: { default: "#0f141a", paper: "#171d24" }, text: { primary: "#e6edf3", secondary: "#a9b4c0" }, divider: "#2c3640" },
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(getInitialTheme);
  const [hasManualTheme, setHasManualTheme] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark";
  });
  const isDark = theme === "dark";

  useEffect(() => {
    applyDocumentTheme(theme);
    if (hasManualTheme) localStorage.setItem(STORAGE_KEY, theme);
  }, [hasManualTheme, theme]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return undefined;
    const applySystemTheme = (event) => {
      if (!hasManualTheme) {
        const nextTheme = event.matches ? "dark" : "light";
        applyDocumentTheme(nextTheme);
        setThemeState(nextTheme);
      }
    };
    media.addEventListener?.("change", applySystemTheme);
    return () => media.removeEventListener?.("change", applySystemTheme);
  }, [hasManualTheme]);

  const setTheme = useCallback((nextTheme) => {
    if (nextTheme === "light" || nextTheme === "dark") {
      applyDocumentTheme(nextTheme);
      setHasManualTheme(true);
      setThemeState(nextTheme);
    }
  }, []);
  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    applyDocumentTheme(nextTheme);
    setHasManualTheme(true);
    setThemeState(nextTheme);
  }, [theme]);

  const muiTheme = useMemo(() => createTheme({
    direction: "rtl",
    palette: {
      mode: theme,
      primary: { main: isDark ? "#79a6ff" : "#2457c5", contrastText: isDark ? "#111820" : "#ffffff" },
      secondary: { main: isDark ? "#8bd8c8" : "#087f6d" },
      error: { main: isDark ? "#ff8a8a" : "#c9363e" },
      warning: { main: isDark ? "#f5bd62" : "#9a5b00" },
      success: { main: isDark ? "#69d391" : "#18794e" },
      info: { main: isDark ? "#75c7f0" : "#126d96" },
      ...palette[theme],
    },
    shape: { borderRadius: 6 },
    typography: { fontFamily: 'Vazirmatn, Tahoma, "Segoe UI", sans-serif' },
    components: {
      MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiButton: { styleOverrides: { root: { borderRadius: 6, textTransform: "none", fontWeight: 650 } } },
      MuiDataGrid: { styleOverrides: {
        root: { borderColor: palette[theme].divider, color: palette[theme].text.primary },
        columnHeaders: { backgroundColor: isDark ? "#1d252e" : "#f1f3f5" },
        cell: { borderColor: palette[theme].divider },
        footerContainer: { borderColor: palette[theme].divider },
      } },
    },
  }), [isDark, theme]);

  const value = useMemo(() => ({ theme, isDark, setTheme, toggleTheme }), [theme, isDark, setTheme, toggleTheme]);
  return <ThemeContext.Provider value={value}><MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider></ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
};
