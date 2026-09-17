import type { Artifact } from '../../shared/schema';
export const DEMO: Artifact = {
  title: 'The Reading Room',
  description: 'A calm home for your reading list, with private accounts and saved books.',
  collections: [
    {
      name: 'books',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'author', type: 'text', required: true },
        { name: 'finished', type: 'boolean', required: true },
      ],
    },
  ],
  notes: [
    'Add your Supabase credentials and create a Cloudflare D1 database before running.',
    'This example uses per-user books; sharing and social features are not included.',
  ],
  app: `import { useEffect, useState, type FormEvent } from 'react';
import { api, useUser, SignIn, signOut } from './platform';
type Book = { id: string; title: string; author: string; finished: boolean };
export default function App() {
 const { user, loading } = useUser(); const [books, setBooks] = useState<Book[]>([]); const [title, setTitle] = useState(''); const [author, setAuthor] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
 async function reload() { try { setBooks(await api.list('books')); } catch { setError('Could not load your books.'); } }
 useEffect(() => { if (user) void reload(); }, [user]);
 async function add(e: FormEvent) { e.preventDefault(); setBusy(true); setError(''); try { await api.create('books', { title, author, finished: false }); setTitle(''); setAuthor(''); await reload(); } catch { setError('Could not save this book.'); } finally { setBusy(false); } }
 async function update(book: Book) { setBusy(true); try { await api.update('books', book.id, { finished: !book.finished }); await reload(); } catch { setError('Could not update the book.'); } finally { setBusy(false); } }
 async function remove(id: string) { if (!window.confirm('Remove this book?')) return; setBusy(true); try { await api.remove('books', id); await reload(); } catch { setError('Could not remove the book.'); } finally { setBusy(false); } }
 if (loading) return <p>Loading…</p>; if (!user) return <SignIn/>;
 return <main><nav><strong>the reading room.</strong><button onClick={() => void signOut()}>Sign out</button></nav><span className="eyebrow">A LITTLE SPACE FOR GOOD STORIES</span><h1>Your next chapter<br/>starts here.</h1><p>Keep the books you love, and the ones you’re about to.</p><form onSubmit={add}><input aria-label="Book title" required placeholder="Book title" value={title} onChange={e => setTitle(e.target.value)}/><input aria-label="Author" required placeholder="Author" value={author} onChange={e => setAuthor(e.target.value)}/><button disabled={busy}>Add to my shelf</button></form><p role="alert">{error}</p><section>{books.map(b => <article key={b.id}><span>{b.finished?'FINISHED':'ON YOUR LIST'}</span><h2>{b.title}</h2><p>{b.author}</p><button disabled={busy} onClick={() => void update(b)}>{b.finished?'Mark unread':'Mark finished'}</button><button disabled={busy} onClick={() => void remove(b.id)}>Remove</button></article>)}</section>{!books.length&&<p>Your shelf is ready for its first story.</p>}</main>;
}`,
  css: `*{box-sizing:border-box}body{margin:0;background:#f7f5ef;color:#253e33;font-family:system-ui,sans-serif}main{max-width:1050px;margin:auto;padding:36px}nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:70px}nav strong{font:700 23px Georgia,serif}h1{font:normal clamp(38px,6vw,64px)/1.05 Georgia,serif;margin:24px 0}.eyebrow{font-size:10px;letter-spacing:2px}p{color:#777d72;line-height:1.6}form{display:flex;gap:10px;flex-wrap:wrap;margin:28px 0}input{padding:13px;border:1px solid #d8dcd3;border-radius:5px;flex:1}button{padding:12px 18px;border:0;border-radius:5px;background:#294b3d;color:white;cursor:pointer}button:disabled{opacity:.5}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:20px}article{padding:24px;background:#e9eddf;border-radius:8px}article span{font-size:10px;letter-spacing:1px}article h2{font:26px Georgia,serif}article button{margin:4px;font-size:12px}`,
  preview: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#f8f7f2;color:#2b4134;font-family:Arial,sans-serif}main{padding:30px 7%}nav{display:flex;justify-content:space-between;font-size:12px;padding-bottom:45px}nav strong{font:700 20px Georgia}small{font-size:9px;letter-spacing:1.5px}h1{font:normal 48px/1.06 Georgia;margin:18px 0}p{font-size:12px;line-height:1.7;color:#7b8178}button{padding:11px 18px;background:#314c3b;color:white;border:0;border-radius:4px;margin:10px 0 30px}section{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}article{background:#e9eddf;border-radius:6px;padding:22px 15px;min-height:155px}article:nth-child(2){background:#f0e7d8}article:nth-child(3){background:#e1e8e8}article b{display:block;font:21px/1.2 Georgia;margin:26px 0 12px}article span{font-size:9px;color:#767c70}.demo{font-size:9px;text-align:right;margin-top:15px;color:#8b8b80}@media(max-width:450px){h1{font-size:34px}section{grid-template-columns:1fr}article{min-height:100px}nav{padding-bottom:25px}}</style></head><body><main><nav><strong>the reading room.</strong><span>My shelf &nbsp; · &nbsp; Your account</span></nav><small>A LITTLE SPACE FOR GOOD STORIES</small><h1>Your next chapter<br/>starts here.</h1><p>Keep the books you love, and the ones you’re about to.</p><button>+ Add to my shelf</button><section><article><small>ON YOUR LIST</small><b>A Quiet<br/>Morning</b><span>Demo author</span></article><article><small>CURRENTLY READING</small><b>The Art of<br/>Noticing</b><span>Demo author</span></article><article><small>FINISHED</small><b>Somewhere<br/>New</b><span>Demo author</span></article></section><div class="demo">Design example · Demo data</div></main></body></html>`,
};
