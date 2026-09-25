import type { Context } from 'hono';
export interface Env {
  ASSETS: Fetcher;
  APP_URL: string;
  ENVIRONMENT: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  LEGAL_READY: string;
  GOOGLE_AUTH_ENABLED: string;
  CMS_PATH_TOKEN: string;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  OPERATOR_NAME: string;
  OPERATOR_ADDRESS: string;
  SUPPORT_EMAIL: string;
  PRIVACY_EMAIL: string;
}
export type Ctx = Context<{ Bindings: Env }>;
