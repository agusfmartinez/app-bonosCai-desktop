import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

const UpdateContext = createContext(null);

export const UpdateProvider = ({ children }) => {
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const lastStatusRef = useRef("idle");

  useEffect(() => {
    if (!window.updater?.onUpdateEvent) return;
    const handleEvent = (event) => {
      if (!event?.status) return;
      if (event.status === lastStatusRef.current && event.status !== "downloading") {
        return;
      }
      lastStatusRef.current = event.status;

      switch (event.status) {
        case "checking":
          setStatus("checking");
          setError(null);
          break;
        case "available":
          setStatus("available");
          setError(null);
          break;
        case "downloading":
          setStatus("downloading");
          setProgress(Number(event.percent) || 0);
          setError(null);
          break;
        case "downloaded":
          setStatus("downloaded");
          setError(null);
          break;
        case "error":
          setStatus("error");
          setError(event.message || "Error desconocido");
          break;
        default:
          setStatus("idle");
          break;
      }
    };

    window.updater.onUpdateEvent(handleEvent);
  }, []);

  const value = useMemo(
    () => ({
      status,
      progress,
      error,
      checkForUpdates: window.updater?.checkForUpdates,
      installUpdate: window.updater?.installUpdate,
    }),
    [status, progress, error]
  );

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
};

export const useUpdater = () => {
  const ctx = useContext(UpdateContext);
  if (!ctx) {
    return {
      status: "idle",
      progress: 0,
      error: null,
      checkForUpdates: () => {},
      installUpdate: () => {},
    };
  }
  return ctx;
};
