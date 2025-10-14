import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useSyncedTab({
  allowed = [],
  defaultTab,
  storageKey = "app:activeTab",
  queryKey = "tab",
  titles = {}, // e.g. { dashboard: "داشبورد", users: "کاربران", tests: "تست‌ها" }
}) {
  // --- Safe window helpers
  const hasWindow = typeof window !== "undefined";
  const readQuery = useCallback(() => {
    if (!hasWindow) return null;
    try {
      const qs = new URLSearchParams(window.location.search);
      return qs.get(queryKey);
    } catch {
      return null;
    }
  }, [hasWindow, queryKey]);

  const writeQuery = useCallback((value) => {
    if (!hasWindow) return;
    try {
      const url = new URL(window.location.href);
      if (value) url.searchParams.set(queryKey, value);
      else url.searchParams.delete(queryKey);
      // فقط وقتی فرق دارد replaceState کن
      if (url.toString() !== window.location.href) {
        window.history.replaceState({}, "", url);
      }
    } catch {}
  }, [hasWindow, queryKey]);

  const readStorage = useCallback(() => {
    if (!hasWindow) return null;
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  }, [hasWindow, storageKey]);

  const writeStorage = useCallback((value) => {
    if (!hasWindow) return;
    try {
      const existing = localStorage.getItem(storageKey);
      if (existing !== value) localStorage.setItem(storageKey, value);
    } catch {}
  }, [hasWindow, storageKey]);

  const isAllowed = useCallback(
    (v) => v && allowed.includes(v),
    [allowed]
  );

  // --- Initial value (single read)
  const initial = useMemo(() => {
    const fromQuery = readQuery();
    if (isAllowed(fromQuery)) return fromQuery;
    const fromStorage = readStorage();
    if (isAllowed(fromStorage)) return fromStorage;
    return isAllowed(defaultTab) ? defaultTab : (allowed[0] || "");
  }, [allowed, defaultTab, isAllowed, readQuery, readStorage]);

  const [tab, setTab] = useState(initial);

  // Prevent redundant effects on first mount
  const mountedRef = useRef(false);

  // --- Sync to URL + storage on tab change
  useEffect(() => {
    if (!tab) return;
    writeStorage(tab);
    writeQuery(tab);
  }, [tab, writeQuery, writeStorage]);

  // --- Sync from URL on popstate (back/forward)
  useEffect(() => {
    if (!hasWindow) return;
    const onPop = () => {
      const q = readQuery();
      if (isAllowed(q) && q !== tab) {
        setTab(q);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [hasWindow, isAllowed, readQuery, tab]);

  // --- Update document.title (optional)
  useEffect(() => {
    if (!hasWindow) return;
    const title = titles[tab];
    if (title) document.title = `Admin · ${title}`;
  }, [hasWindow, tab, titles]);

  // --- Safe setter (ignore invalid)
  const switchTab = useCallback(
    (next) => {
      if (!isAllowed(next)) return;
      setTab((prev) => (prev === next ? prev : next));
    },
    [isAllowed]
  );

  return { tab, switchTab };
}
