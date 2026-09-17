import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
const user = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
  );
  await db.exec(await readFile('supabase/001_initial.sql', 'utf8'));
  await db.query('insert into auth.users(id) values($1),($2)', [user, other]);
}, 30000);
afterAll(async () => {
  await db.close();
});
async function reserve(
  id = crypto.randomUUID(),
  uid = user,
  project: string | null = null,
  daily = 10000000,
) {
  return db.query<{ result: { duplicate: boolean; project_id: string } }>(
    'select reserve_generation($1,$2,$3,$4,$5) as result',
    [uid, id, project, 'My project', daily],
  );
}
async function paid(
  event: string,
  start = '2026-01-01',
  end = '2099-02-01',
  occurred = '2026-01-01',
  uid = user,
) {
  return db.query(
    "select apply_billing_event($1,$2,$3,$4,'ctm_demo','starter',$5,$6,'active',true)",
    [event, occurred, uid, 'sub_' + uid, start, end],
  );
}
describe('real PostgreSQL quota and billing transactions', () => {
  it('rejects unpaid generation before creating projects', async () => {
    await expect(reserve()).rejects.toThrow('SUBSCRIPTION_REQUIRED');
    const r = await db.query<{ count: number }>('select count(*)::int from projects');
    expect(r.rows[0].count).toBe(0);
  });
  it('claims checkout once so repeated clicks cannot create extra transactions', async () => {
    const first = await db.query<{ result: { claimed: boolean } }>(
      'select claim_checkout($1,$2) as result',
      [user, 'starter'],
    );
    const repeated = await db.query<{ result: { claimed: boolean; plan: string } }>(
      'select claim_checkout($1,$2) as result',
      [user, 'pro'],
    );
    expect(first.rows[0].result.claimed).toBe(true);
    expect(repeated.rows[0].result.claimed).toBe(false);
    expect(repeated.rows[0].result.plan).toBe('starter');
  });
  it('grants quota only after a paid event and counts a duplicate request once', async () => {
    await paid('evt_paid');
    const id = crypto.randomUUID();
    const first = await reserve(id);
    const second = await reserve(id);
    expect(first.rows[0].result.duplicate).toBe(false);
    expect(second.rows[0].result.duplicate).toBe(true);
    const s = await db.query<{ credits_used: number; reserved_micros: number }>(
      'select credits_used,reserved_micros::int from subscriptions where user_id=$1',
      [user],
    );
    expect(s.rows[0]).toEqual({ credits_used: 1, reserved_micros: 100000 });
    await db.query("update generations set status='failed'");
  });
  it('does not refill credits for duplicate or same-cycle payment events', async () => {
    await paid('evt_paid');
    await paid('evt_same_cycle', '2026-01-01', '2099-02-01', '2026-01-02');
    const s = await db.query<{ credits_used: number }>(
      'select credits_used from subscriptions where user_id=$1',
      [user],
    );
    expect(s.rows[0].credits_used).toBe(1);
  });
  it('rejects another owner’s project and leaves quota unchanged', async () => {
    await paid('evt_other', '2026-01-01', '2099-02-01', '2026-01-01', other);
    const p = await db.query<{ id: string }>('select id from projects where user_id=$1', [user]);
    await expect(reserve(crypto.randomUUID(), other, p.rows[0].id)).rejects.toThrow(
      'PROJECT_NOT_FOUND',
    );
    const s = await db.query<{ credits_used: number }>(
      'select credits_used from subscriptions where user_id=$1',
      [other],
    );
    expect(s.rows[0].credits_used).toBe(0);
  });
  it('blocks the global budget before spending another credit', async () => {
    await expect(reserve(crypto.randomUUID(), other, null, 100000)).rejects.toThrow(
      'DAILY_SERVICE_LIMIT',
    );
    const s = await db.query<{ credits_used: number }>(
      'select credits_used from subscriptions where user_id=$1',
      [other],
    );
    expect(s.rows[0].credits_used).toBe(0);
  });
  it('prevents overlapping generations', async () => {
    await reserve(crypto.randomUUID(), other);
    await expect(reserve(crypto.randomUUID(), other)).rejects.toThrow('GENERATION_IN_PROGRESS');
    await db.query("update generations set status='failed'");
  });
  it('deletes only owned projects and blocks deleting an in-flight generation', async () => {
    const id = crypto.randomUUID();
    await db.query('insert into projects(id,user_id,title) values($1,$2,$3)', [
      id,
      user,
      'Delete check',
    ]);
    const wrongOwner = await db.query<{ deleted: boolean }>(
      'select delete_project($1,$2) as deleted',
      [other, id],
    );
    expect(wrongOwner.rows[0].deleted).toBe(false);
    await db.query('insert into generations(id,user_id,project_id) values($1,$2,$3)', [
      crypto.randomUUID(),
      user,
      id,
    ]);
    await expect(db.query('select delete_project($1,$2)', [user, id])).rejects.toThrow(
      'GENERATION_IN_PROGRESS',
    );
    await db.query("update generations set status='failed' where project_id=$1", [id]);
    const deleted = await db.query<{ deleted: boolean }>(
      'select delete_project($1,$2) as deleted',
      [user, id],
    );
    expect(deleted.rows[0].deleted).toBe(true);
  });
  it('enforces monthly quota even if request IDs are new', async () => {
    await db.query('update subscriptions set credits_used=credit_limit where user_id=$1', [other]);
    await expect(reserve(crypto.randomUUID(), other)).rejects.toThrow('MONTHLY_LIMIT');
  });
  it('does not lose a renewal when a later status update arrived first', async () => {
    await db.query(
      "select apply_billing_event('evt_status','2026-08-03',$1,$2,'ctm_demo','starter',null,null,'active',false)",
      [user, 'sub_' + user],
    );
    await paid('evt_renewal', '2026-08-01', '2099-09-01', '2026-08-02');
    const s = await db.query<{ credits_used: number }>(
      'select credits_used from subscriptions where user_id=$1',
      [user],
    );
    expect(s.rows[0].credits_used).toBe(0);
    await reserve();
    await db.query("update generations set status='failed'");
    await paid('evt_old', '2026-01-01', '2099-02-01', '2026-09-01');
    const old = await db.query<{ credits_used: number }>(
      'select credits_used from subscriptions where user_id=$1',
      [user],
    );
    expect(old.rows[0].credits_used).toBe(1);
  });
  it('deduplicates refund notifications and preserves a later paid renewal', async () => {
    await db.query("select apply_adjustment('adj_test','2026-09-03',$1)", ['sub_' + user]);
    const suspended = await db.query<{ status: string }>(
      'select status from subscriptions where user_id=$1',
      [user],
    );
    expect(suspended.rows[0].status).toBe('suspended');
    await paid('evt_after_refund', '2026-09-04', '2099-10-04', '2026-09-04');
    await db.query("select apply_adjustment('adj_test','2026-09-05',$1)", ['sub_' + user]);
    const active = await db.query<{ status: string }>(
      'select status from subscriptions where user_id=$1',
      [user],
    );
    expect(active.rows[0].status).toBe('active');
  });
  it('blocks canceled and expired access', async () => {
    await db.query("update subscriptions set status='canceled' where user_id=$1", [user]);
    await expect(reserve()).rejects.toThrow('SUBSCRIPTION_REQUIRED');
    await db.query(
      "update subscriptions set status='active',period_start='2020-01-01',period_end='2020-02-01' where user_id=$1",
      [user],
    );
    await expect(reserve()).rejects.toThrow('SUBSCRIPTION_REQUIRED');
  });
  it('enforces RLS and prevents direct quota changes and privileged RPC calls', async () => {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
    // A test-only role proves ownership policies remain effective if SELECT is
    // intentionally granted later. Real browser roles have no private table grant.
    await db.exec(
      'create role rls_probe; grant authenticated to rls_probe; grant select on public.projects to rls_probe; set role rls_probe',
    );
    try {
      const visible = await db.query<{ user_id: string }>('select user_id from projects');
      expect(visible.rows.length).toBeGreaterThan(0);
      expect(visible.rows.every((r) => r.user_id === user)).toBe(true);
    } finally {
      await db.exec('reset role');
    }
    await db.exec('set role authenticated');
    try {
      await expect(db.query('select * from projects')).rejects.toThrow('permission denied');
      await expect(db.query('select * from subscriptions')).rejects.toThrow('permission denied');
      await expect(
        db.query("update profiles set role='admin' where id=$1", [user]),
      ).rejects.toThrow('permission denied');
      await expect(db.query('update subscriptions set credits_used=0')).rejects.toThrow(
        'permission denied',
      );
      await expect(reserve()).rejects.toThrow('permission denied');
      await expect(
        db.query('select delete_project($1,$2)', [user, crypto.randomUUID()]),
      ).rejects.toThrow('permission denied');
    } finally {
      await db.exec('reset role');
    }
  });
});
