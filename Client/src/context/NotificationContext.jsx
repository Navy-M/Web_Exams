/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import "../styles/notifications.css";

const NotificationContext = createContext(null);
const icons = { success: CheckCircle2, error: AlertCircle, warning: TriangleAlert, info: Info };

export function NotificationProvider({ children }) {
  const [items, setItems] = useState([]);
  const sequence = useRef(0);

  const dismiss = useCallback((id) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((message, options = {}) => {
    if (!message) return null;
    const type = ["success", "error", "warning", "info"].includes(options.type) ? options.type : "info";
    const id = ++sequence.current;
    const duration = options.duration ?? (type === "error" ? 8000 : 4500);
    setItems((current) => [...current.slice(-4), { id, message: String(message), type }]);
    if (duration > 0) window.setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const value = useMemo(() => ({ notify, dismiss }), [dismiss, notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="notification-region" role="region" aria-label="اعلان‌ها" aria-live="polite">
        {items.map((item) => {
          const Icon = icons[item.type];
          return (
            <div className={`app-toast app-toast--${item.type}`} role={item.type === "error" ? "alert" : "status"} key={item.id}>
              <Icon aria-hidden="true" size={20} />
              <span>{item.message}</span>
              <button type="button" onClick={() => dismiss(item.id)} aria-label="بستن اعلان" title="بستن">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}

NotificationProvider.propTypes = { children: PropTypes.node.isRequired };

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotification must be used inside NotificationProvider");
  return context;
}
