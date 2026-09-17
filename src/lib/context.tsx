import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
export interface Config {
  auth: boolean;
  google: boolean;
  billing: boolean;
  ai: boolean;
  turnstileSiteKey: string;
  legalReady: boolean;
  supportEmail: string;
  privacyEmail: string;
  operatorName: string;
  operatorAddress: string;
  paddleClientToken?: string;
  paddleSandbox?: boolean;
}
export interface Session {
  user: { id: string; email: string } | null;
  subscription?: {
    plan: string;
    credits_used: number;
    credit_limit: number;
    period_end: string;
    status: string;
  };
  projects?: Project[];
  requiresMfa?: boolean;
}
export interface Project {
  id: string;
  title: string;
  updated_at: string;
  artifact?: import('../../shared/schema').Artifact;
}
const fallback: Config = {
  auth: false,
  google: false,
  billing: false,
  ai: false,
  turnstileSiteKey: '',
  legalReady: false,
  supportEmail: 'support@artificials.net',
  privacyEmail: '',
  operatorName: '',
  operatorAddress: '',
};
const Context = createContext({
  config: fallback,
  session: { user: null } as Session,
  loading: true,
  refresh: async () => {},
});
export function Provider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState(fallback);
  const [session, setSession] = useState<Session>({ user: null });
  const [loading, setLoading] = useState(true);
  async function refresh() {
    try {
      setSession(await api<Session>('/session'));
    } catch {
      setSession({ user: null });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void api<Config>('/config')
      .then(setConfig)
      .catch(() => {});
    void refresh();
  }, []);
  return (
    <Context.Provider value={{ config, session, loading, refresh }}>{children}</Context.Provider>
  );
}
export const useApp = () => useContext(Context);
