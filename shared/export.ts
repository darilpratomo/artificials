import type { Artifact } from './schema';
import { artifactSchema } from './schema';
export function projectFiles(input: Artifact): Record<string, string> {
  const a = artifactSchema.parse(input);
  const schema = a.collections
    .map(
      (c) =>
        `CREATE TABLE IF NOT EXISTS "${c.name}" (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, ${c.fields.map((f) => `"${f.name}" ${f.type === 'number' ? 'REAL' : f.type === 'boolean' ? 'INTEGER' : 'TEXT'}${f.required ? ' NOT NULL' : ''}`).join(', ')});\nCREATE INDEX IF NOT EXISTS "${c.name}_owner" ON "${c.name}"(user_id,created_at);`,
    )
    .join('\n');
  return {
    'package.json': JSON.stringify(
      {
        name: 'artificials-app',
        private: true,
        version: '1.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          'dev:api': 'wrangler dev --port 8787',
          build: 'tsc --noEmit && vite build',
          deploy: 'npm run build && wrangler deploy',
          'db:local': 'wrangler d1 execute app-db --local --file=schema.sql',
          'db:remote': 'wrangler d1 execute app-db --remote --file=schema.sql',
        },
        dependencies: {
          react: '19.3.0',
          'react-dom': '19.3.0',
          '@supabase/supabase-js': '2.116.0',
          'lucide-react': '1.46.0',
          hono: '4.13.8',
          zod: '4.6.5',
        },
        devDependencies: {
          typescript: '7.0.2',
          vite: '8.3.0',
          '@vitejs/plugin-react': '6.1.1',
          '@types/react': '19.3.0',
          '@types/react-dom': '19.3.0',
          '@cloudflare/workers-types': '5.20260917.1',
          wrangler: '4.133.0',
        },
      },
      null,
      2,
    ),
    'index.html':
      '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Your app</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
    'tsconfig.json': JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          moduleResolution: 'Bundler',
          jsx: 'react-jsx',
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          types: ['vite/client', '@cloudflare/workers-types'],
        },
        include: ['src', 'worker', 'collections.ts'],
      },
      null,
      2,
    ),
    'vite.config.ts': `import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';export default defineConfig({plugins:[react()],server:{proxy:{'/api':'http://127.0.0.1:8787'}}});`,
    'wrangler.jsonc': JSON.stringify(
      {
        name: 'my-artificials-app',
        main: 'worker/index.ts',
        compatibility_date: '2026-09-01',
        compatibility_flags: ['nodejs_compat'],
        assets: {
          directory: './dist',
          binding: 'ASSETS',
          not_found_handling: 'single-page-application',
          run_worker_first: ['/api/*'],
        },
        d1_databases: [
          {
            binding: 'DB',
            database_name: 'app-db',
            database_id: 'REPLACE_WITH_YOUR_D1_DATABASE_ID',
          },
        ],
      },
      null,
      2,
    ),
    'src/main.tsx': `import React from 'react';import{createRoot}from'react-dom/client';import App from './App';import './styles.css';createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);`,
    'src/App.tsx': a.app,
    'src/styles.css': a.css,
    'src/platform.tsx': PLATFORM,
    'worker/index.ts': BACKEND,
    'collections.ts':
      'export const collections = ' + JSON.stringify(a.collections, null, 2) + ' as const;',
    'schema.sql': schema,
    '.env.example': 'VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=\n',
    '.dev.vars.example': 'SUPABASE_URL=\nSUPABASE_ANON_KEY=\n',
    '.gitignore': 'node_modules/\ndist/\n.wrangler/\n.env\n.dev.vars\n',
    'README.md': `# ${a.title}\n\n${a.description}\n\nGenerated code: review and test it before production. This ZIP has never been executed on Artificials servers. The Studio preview is a static visual preview, not a running database.\n\n## Stack\nReact + TypeScript + Vite, Cloudflare Worker API + D1 SQLite, Supabase Auth. All CRUD endpoints validate authentication and scope rows to the signed-in user. No shared Artificials credentials are included.\n\n## Local setup\n1. Install Node.js 22 LTS or 24 LTS. Run npm install.\n2. Create YOUR Supabase project. Copy .env.example to .env and .dev.vars.example to .dev.vars. Fill in YOUR URL and public anon key in both. Never put a service-role key in frontend environment variables. Configure email authentication, a production SMTP provider, rate limits and CAPTCHA in Supabase. Add http://localhost:5173 and your deployed origin to allowed Auth redirect URLs.\n3. Run npx wrangler login, then npx wrangler d1 create app-db. Put its database_id in wrangler.jsonc.\n4. Run npm run db:local and npm run build.\n5. Run npm run dev:api and npm run dev in separate terminals.\n6. Sign in using an email magic link and test all create, edit, delete and ownership flows.\n\n## Deploy\n1. Run npm run db:remote.\n2. Use npx wrangler secret put SUPABASE_URL and npx wrangler secret put SUPABASE_ANON_KEY.\n3. Run npm run deploy. Configure your own domain, security rules, backups, privacy policy and applicable legal disclosures. Set provider usage caps.\n4. Build-time VITE_ values are public. Session tokens for this exported app are managed by Supabase in browser storage. Review CSP and generated dependencies before launch. Enable suitable rate limits or WAF rules for your traffic.\n\n## Boundaries\nThe included backend supports per-user CRUD, up to 1,000 rows per collection per user, returning the latest 200 rows per list request. Shared data, organization roles, payments, file uploads, realtime messaging, custom business logic and external integrations require engineering. The schema must be migrated manually if a revision changes collections. Third-party hosting and API costs are your responsibility.\n\n## Build notes\n${a.notes.map((n) => '- ' + n).join('\n')}\n`,
  };
}
const PLATFORM = `import {createClient, type User} from '@supabase/supabase-js';
import {useEffect,useState,type FormEvent} from 'react';
const url=import.meta.env.VITE_SUPABASE_URL;const key=import.meta.env.VITE_SUPABASE_ANON_KEY;
const client=url&&key?createClient(url,key):null;
export function useUser(){const[user,setUser]=useState<User|null>(null);const[loading,setLoading]=useState(!!client);useEffect(()=>{if(!client)return;client.auth.getSession().then(({data})=>{setUser(data.session?.user||null);setLoading(false)});const{data}=client.auth.onAuthStateChange((_,session)=>{setUser(session?.user||null);setLoading(false)});return()=>data.subscription.unsubscribe()},[]);return{user,loading}}
export async function signOut(){if(client)await client.auth.signOut();}
async function call(path:string,method='GET',body?:unknown){if(!client)throw Error('Configure Supabase first');const{data}=await client.auth.getSession();if(!data.session)throw Error('Please sign in');const response=await fetch('/api/data/'+path,{method,headers:{Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const result:any=await response.json();if(!response.ok)throw Error(result.error||'Request failed');return result;}
export const api={list:(collection:string)=>call(encodeURIComponent(collection)),create:(collection:string,fields:Record<string,unknown>)=>call(encodeURIComponent(collection),'POST',fields),update:(collection:string,id:string,fields:Record<string,unknown>)=>call(encodeURIComponent(collection)+'/'+encodeURIComponent(id),'PATCH',fields),remove:(collection:string,id:string)=>call(encodeURIComponent(collection)+'/'+encodeURIComponent(id),'DELETE')};
export function SignIn(){const[email,setEmail]=useState('');const[message,setMessage]=useState('');const[busy,setBusy]=useState(false);async function submit(e:FormEvent){e.preventDefault();if(!client)return;setBusy(true);try{const{error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin}});setMessage(error?'Unable to send sign-in link. Try again later.':'Check your email for your sign-in link.')}finally{setBusy(false)}}return <main style={{maxWidth:420,margin:'12vh auto',padding:24,fontFamily:'system-ui'}}><h1>Welcome to your app</h1><p>Sign in to access your own saved data.</p>{!client?<p>Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to enable authentication.</p>:<form onSubmit={submit}><label>Email<input style={{display:'block',padding:12,width:'100%',margin:'12px 0'}} type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><button disabled={busy}>{busy?'Sending…':'Email me a sign-in link'}</button><p role="status">{message}</p></form>}</main>}
`;
const BACKEND = `import {Hono} from 'hono';
import {bodyLimit} from 'hono/body-limit';
import {createClient} from '@supabase/supabase-js';
import {z} from 'zod';
import {collections} from '../collections';
type Env={DB:D1Database;ASSETS:Fetcher;SUPABASE_URL:string;SUPABASE_ANON_KEY:string};
const app=new Hono<{Bindings:Env;Variables:{userId:string}}>();
app.use('/api/*',bodyLimit({maxSize:50000,onError:c=>c.json({error:'Request too large'},413)}));
app.use('/api/*',async(c,next)=>{c.header('Cache-Control','no-store');c.header('X-Content-Type-Options','nosniff');const origin=c.req.header('origin');if(origin&&origin!==new URL(c.req.url).origin&&!['http://localhost:5173','http://127.0.0.1:5173'].includes(origin))return c.json({error:'Origin not allowed'},403);const token=c.req.header('authorization')?.replace(/^Bearer /,'');if(!token)return c.json({error:'Sign in required'},401);if(!c.env.SUPABASE_URL||!c.env.SUPABASE_ANON_KEY)return c.json({error:'Authentication is not configured'},503);const client=createClient(c.env.SUPABASE_URL,c.env.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const{data,error}=await client.auth.getUser(token);if(error||!data.user)return c.json({error:'Invalid session'},401);c.set('userId',data.user.id);await next()});
app.all('/api/data/:collection/:id?',async c=>{const definitions:readonly {name:string;fields:readonly {name:string;type:'text'|'number'|'boolean';required:boolean}[]}[]=collections;const definition=definitions.find(x=>x.name===c.req.param('collection'));if(!definition)return c.json({error:'Collection not found'},404);const table='"'+definition.name+'"';const user=c.get('userId');const id=c.req.param('id');if(id&&!z.string().uuid().safeParse(id).success)return c.json({error:'Invalid id'},400);const fields=Object.fromEntries(definition.fields.map(f=>{let rule:z.ZodType=f.type==='number'?z.number().finite():f.type==='boolean'?z.boolean():z.string().max(10000);return[f.name,f.required?rule:rule.nullable().optional()]}));if(c.req.method==='GET'){const rows=await c.env.DB.prepare('SELECT * FROM '+table+' WHERE user_id = ? ORDER BY created_at DESC LIMIT 200').bind(user).all<Record<string,unknown>>();return c.json(rows.results.map(row=>{const out={...row};delete out.user_id;for(const f of definition.fields)if(f.type==='boolean'&&out[f.name]!=null)out[f.name]=!!out[f.name];return out}));}if(c.req.method==='DELETE'&&id){await c.env.DB.prepare('DELETE FROM '+table+' WHERE id = ? AND user_id = ?').bind(id,user).run();return c.json({deleted:true});}if(c.req.method==='POST'||(c.req.method==='PATCH'&&id)){const shape=z.object(fields).strict();const parsed=(c.req.method==='PATCH'?shape.partial():shape).safeParse(await c.req.json());if(!parsed.success)return c.json({error:'Invalid fields'},400);const entries=Object.entries(parsed.data);if(!entries.length)return c.json({error:'No fields provided'},400);const names=entries.map(([k])=>'"'+k+'"');const values=entries.map(([,v])=>typeof v==='boolean'?(v?1:0):v??null);if(c.req.method==='POST'){const newId=crypto.randomUUID();const result=await c.env.DB.prepare('INSERT INTO '+table+' (id,user_id,'+names.join(',')+') SELECT ?,?,'+names.map(()=>'?').join(',')+' WHERE (SELECT count(*) FROM '+table+' WHERE user_id=?) < 1000').bind(newId,user,...values,user).run();if(!result.meta.changes)return c.json({error:'Collection limit reached'},409);return c.json({id:newId,...parsed.data},201);}const result=await c.env.DB.prepare('UPDATE '+table+' SET '+names.map(n=>n+'=?').join(',')+' WHERE id=? AND user_id=?').bind(...values,id,user).run();if(!result.meta.changes)return c.json({error:'Record not found'},404);return c.json({id,...parsed.data});}return c.json({error:'Method not allowed'},405);});
app.all('/api/*',c=>c.json({error:'Not found'},404));app.all('*',c=>c.env.ASSETS.fetch(c.req.raw));app.onError((_,c)=>c.json({error:'Service temporarily unavailable'},500));export default app;
`;
