import { useEffect, useState } from "react";
import { subscribe, currentUser } from "./store";

export function useStore<T>(selector: () => T): T {
  const [v, setV] = useState<T>(selector);
  useEffect(() => {
    const unsub = subscribe(() => setV(selector()));
    setV(selector());
    return () => { unsub(); };
  }, []);
  return v;
}

export function useAuth() {
  return useStore(() => currentUser());
}
