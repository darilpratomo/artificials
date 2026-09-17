export const MODEL = 'gpt-5-mini-2025-08-07';
export const MAX_OUTPUT_TOKENS = 16000;
export const MAX_INPUT_BYTES = 60000; // Entire serialized provider payload, including output schema.
export const PROTOCOL_TOKEN_ALLOWANCE = 1024; // Conservative framing allowance.
export function dailyBudgetMicros(value: string | undefined): number | null {
  const budget = value === undefined ? 10000000 : Number(value);
  return Number.isSafeInteger(budget) && budget >= 100000 && budget <= 100000000 ? budget : null;
}
export const RESERVATION_MICROS = 100000; // $0.10; conservative ceiling, never client-controlled.
export const PLANS = {
  starter: {
    name: 'Starter',
    price: 12,
    credits: 30,
    projects: 5,
    budget: 3000000,
    description: 'For individuals building their first apps.',
  },
  pro: {
    name: 'Pro',
    price: 29,
    credits: 90,
    projects: 20,
    budget: 9000000,
    description: 'For regular builds and product iteration.',
  },
  studio: {
    name: 'Studio',
    price: 59,
    credits: 200,
    projects: 50,
    budget: 20000000,
    description: 'For a larger portfolio of independent apps.',
  },
} as const;
export type PlanKey = keyof typeof PLANS;
export function isPlan(value: unknown): value is PlanKey {
  return typeof value === 'string' && Object.hasOwn(PLANS, value);
}
export const SYSTEM_PROMPT = `You build production-minded full-stack web applications. Return a JSON object matching the supplied schema. The exported project is React + TypeScript + Vite with a Cloudflare Worker API and D1 SQLite database, with Supabase email authentication. You generate App.tsx and styles.css, plus a STATIC HTML design preview. App.tsx MUST import { api, useUser, SignIn, signOut } from './platform'; export default function App(). useUser() returns {user: {id:string,email?:string}|null, loading:boolean}. If no user, render <SignIn/>. api.list(collection) returns Promise<{id:string, ...fields}[]>; api.create(collection, fields), api.update(collection,id,fields), api.remove(collection,id) return promises. Use only React and lucide-react imports; no other packages. Handle loading, errors, empty states and responsive layout. Collections declare typed fields; never include id, user_id, created_at as custom fields. Field types: text, number, boolean. User data is private per account. No payment handling, secrets, admin privilege, external scripts, arbitrary SQL or external API calls. No promises of working integrations beyond provided CRUD and authentication. HTML preview is a standalone document using inline CSS and representative example data clearly labeled Demo data. No scripts, remote images, forms submitting externally, or external resources in preview. Build a polished app matching the user's request with usable CRUD. Explain integrations that require manual setup in notes. Never put secrets or unverified factual claims in examples. Keep output compact enough for 16000 tokens.`;
