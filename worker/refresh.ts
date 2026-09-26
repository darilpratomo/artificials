/**
 * Starts the data refresh on time. GitHub runs scheduled workflows hours late,
 * or drops them, when it is busy; a Cloudflare Cron Trigger (free) fires on the
 * minute and dispatches the refresh workflow instead, every three hours.
 *
 * Once a dispatch succeeds, it sets the repository variable REFRESH_TRIGGER to
 * "cloudflare", which stands down GitHub's own three-hourly schedule; GitHub
 * still runs the refresh once a day as a safety net.
 *
 * GITHUB_TOKEN is a fine-grained token for this repository only, with Actions
 * and Variables set to "Read and write". Without it, the Worker does nothing.
 */
export interface RefreshEnv {
  GITHUB_TOKEN?: string;
  GITHUB_REPOSITORY: string;
  REFRESH_WORKFLOW: string;
}

const HANDOVER = { name: 'REFRESH_TRIGGER', value: 'cloudflare' };

function github(env: RefreshEnv, path: string, init: RequestInit = {}) {
  return fetch(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'artificials-refresh',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
}

/** Dispatches the refresh workflow, then hands the schedule over from GitHub's cron. */
export async function refresh(env: RefreshEnv): Promise<string> {
  if (!env.GITHUB_TOKEN) return 'No GITHUB_TOKEN secret; nothing dispatched.';
  const dispatch = await github(env, `/actions/workflows/${env.REFRESH_WORKFLOW}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref: 'main' }),
  });
  if (dispatch.status !== 204)
    throw new Error(`GitHub did not start the refresh: HTTP ${dispatch.status}.`);
  const current = await github(env, `/actions/variables/${HANDOVER.name}`);
  let handover: Response | undefined;
  if (current.status === 404)
    handover = await github(env, '/actions/variables', {
      method: 'POST',
      body: JSON.stringify(HANDOVER),
    });
  else if (current.ok && ((await current.json()) as { value?: string }).value !== HANDOVER.value)
    handover = await github(env, `/actions/variables/${HANDOVER.name}`, {
      method: 'PATCH',
      body: JSON.stringify(HANDOVER),
    });
  if ((handover && !handover.ok) || (!current.ok && current.status !== 404))
    return 'Refresh started; GitHub’s own schedule could not be stood down (Variables permission).';
  return 'Refresh started.';
}

export default {
  // A failed dispatch throws, so the Cron event shows as failed in the dashboard.
  async scheduled(_controller, env) {
    console.log(await refresh(env));
  },
} satisfies ExportedHandler<RefreshEnv>;
