import { createContext, useContext, useMemo, useState, useCallback, createElement } from "react";
import fa from "./fa.json";
import en from "./en.json";

const resources = { fa, en };

const I18nContext = createContext({
  lang: "fa",
  setLang: () => {},
  t: (key) => key,
});

const resolvePath = (source, path) =>
  path.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), source);

const formatTemplate = (template, vars) =>
  template.replace(/\{\{(.*?)\}\}/g, (_, token) => {
    const trimmed = token.trim();
    const value = vars?.[trimmed];
    return value === undefined || value === null ? "" : String(value);
  });

export const I18nProvider = ({ children, defaultLang = "fa" }) => {
  const preferred = (() => {
    try {
      return localStorage.getItem("lang") || defaultLang;
    } catch (err) {
      return defaultLang;
    }
  })();

  const [lang, setLangState] = useState(resources[preferred] ? preferred : defaultLang);

  const setLang = useCallback((nextLang) => {
    if (!resources[nextLang]) return;
    setLangState(nextLang);
    try {
      localStorage.setItem("lang", nextLang);
    } catch (err) {
      /* noop */
    }
  }, []);

  const translator = useMemo(() => {
    const pack = resources[lang] || resources[defaultLang] || {};
    const fallback = resources[defaultLang] || {};

    return (key, vars) => {
      if (!key) return "";
      const fromActive = resolvePath(pack, key);
      const template = fromActive ?? resolvePath(fallback, key);
      if (typeof template !== "string") return key;
      return formatTemplate(template, vars);
    };
  }, [lang, defaultLang]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: translator,
      available: Object.keys(resources),
    }),
    [lang, setLang, translator]
  );

  return createElement(I18nContext.Provider, { value }, children);
};

export const useI18n = () => useContext(I18nContext);
