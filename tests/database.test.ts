import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
const editor = '11111111-1111-4111-8111-111111111111';
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
  );
  // The initial schema, then the migration that removes the former paid features.
  await db.exec(await readFile('supabase/001_initial.sql', 'utf8'));
  await db.exec(await readFile('supabase/005_remove_paid_features.sql', 'utf8'));
  await db.query('insert into auth.users(id) values($1)', [editor]);
  await db.query(
    "insert into articles(slug,title,excerpt,category,body,published) values('public-guide','Public guide','A published article for everyone to read here.','Guides',repeat('x',120),true),('draft-guide','Draft guide','An unpublished draft that only editors can see here.','Guides',repeat('x',120),false)",
  );
}, 30000);
afterAll(async () => {
  await db.close();
});

describe('database for a free, non-commercial site', () => {
  it('removes every table and function of the former paid features', async () => {
    const tables = await db.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema='public' order by table_name",
    );
    expect(tables.rows.map((row) => row.table_name)).toEqual([
      'articles',
      'audit_log',
      'profiles',
      'rate_limits',
    ]);
    const functions = await db.query<{ routine_name: string }>(
      "select routine_name from information_schema.routines where routine_schema='public' order by routine_name",
    );
    expect(functions.rows.map((row) => row.routine_name)).toEqual([
      'consume_rate',
      'on_user_created',
    ]);
    // Running the migration again changes nothing.
    await db.exec(await readFile('supabase/005_remove_paid_features.sql', 'utf8'));
  });

  it('gives new sign-ins a member profile, never an editor role', async () => {
    const profile = await db.query<{ role: string }>('select role from profiles where id=$1', [
      editor,
    ]);
    expect(profile.rows[0].role).toBe('member');
  });

  it('limits repeated requests within a window', async () => {
    const results: boolean[] = [];
    for (let i = 0; i < 4; i += 1) {
      const { rows } = await db.query<{ allowed: boolean }>(
        "select consume_rate('otp:test',3,600) as allowed",
      );
      results.push(rows[0].allowed);
    }
    expect(results).toEqual([true, true, true, false]);
  });

  it('shows visitors published articles only and blocks every browser write', async () => {
    await db.exec('set role anon');
    try {
      const visible = await db.query<{ slug: string }>('select slug from articles order by slug');
      expect(visible.rows.map((row) => row.slug)).toEqual(['public-guide']);
      await expect(db.query("delete from articles where slug='public-guide'")).rejects.toThrow(
        'permission denied',
      );
    } finally {
      await db.exec('reset role');
    }
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [editor]);
    await db.exec('set role authenticated');
    try {
      await expect(
        db.query("update profiles set role='admin' where id=$1", [editor]),
      ).rejects.toThrow('permission denied');
      await expect(
        db.query(
          "insert into articles(slug,title,excerpt,category,body,published) values('x','Title','An excerpt long enough.','Guides',repeat('x',120),true)",
        ),
      ).rejects.toThrow('permission denied');
      await expect(db.query('select * from audit_log')).rejects.toThrow('permission denied');
      await expect(db.query("select consume_rate('otp:abuse',100,60)")).rejects.toThrow(
        'permission denied',
      );
    } finally {
      await db.exec('reset role');
    }
  });
});
