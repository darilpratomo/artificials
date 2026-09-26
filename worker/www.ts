/**
 * www.artificials.net answers every request with a permanent redirect to the
 * same path and query on artificials.net, so the site has one address. It runs
 * as its own small Worker (wrangler.www.jsonc): the main Worker serves static
 * files before its code runs, whatever the host, so it cannot redirect them.
 */
export default {
  fetch(request: Request): Response {
    const url = new URL(request.url);
    url.protocol = 'https:';
    url.hostname = 'artificials.net';
    url.port = '';
    return new Response(null, {
      status: 301,
      headers: { Location: url.toString(), 'Cache-Control': 'public, max-age=86400' },
    });
  },
} satisfies ExportedHandler;
