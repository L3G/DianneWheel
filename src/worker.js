// Cloudflare Worker — API relay for cross-process spin signaling
// ================================================================
// Static files are served automatically by the [assets] binding.
// This Worker only handles /api/* routes that don't match static files.
//
// The problem: OBS Browser Source runs in a separate Chromium process
// from the streamer's browser, so BroadcastChannel can't bridge them.
// This Worker stores a "spin requested" signal in KV that both sides
// can read/write through simple HTTP.
//
// Flow:
//   control.html → POST /api/spin → writes timestamp to KV
//   overlay page → GET /api/spin (polls every second) → reads KV, triggers spin

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // --- POST /api/spin — trigger a spin ---
    if (url.pathname === '/api/spin' && request.method === 'POST') {
      let wheelIdRaw = 'default';
      try {
        const body = await request.json();
        wheelIdRaw = body.wheel || 'default';
      } catch {
        // Body parsing failed — use default
      }
      const wheelIdVal = sanitizeId(wheelIdRaw);
      const ts = Date.now();
      try {
        await env.SPIN_SIGNALS.put(`spin:${wheelIdVal}`, JSON.stringify({ ts }), {
          expirationTtl: 60,
        });
      } catch (err) {
        return Response.json({ ok: false, error: 'KV write failed: ' + String(err) }, {
          status: 500, headers: corsHeaders(),
        });
      }
      return Response.json({ ok: true, ts }, { headers: corsHeaders() });
    }

    // --- GET /api/spin?wheel=default&after=0 — poll for spin signal ---
    if (url.pathname === '/api/spin' && request.method === 'GET') {
      const wheelId = sanitizeId(url.searchParams.get('wheel') || 'default');
      const after = parseInt(url.searchParams.get('after') || '0', 10);
      const data = await env.SPIN_SIGNALS.get(`spin:${wheelId}`, 'json');
      const spin = !!(data && data.ts > after);
      return Response.json({ spin, ts: data?.ts || 0 }, {
        headers: {
          ...corsHeaders(),
          'Cache-Control': 'no-store', // never cache poll responses
        },
      });
    }

    // --- POST /api/options — save wheel options so OBS overlay can read them ---
    if (url.pathname === '/api/options' && request.method === 'POST') {
      try {
        const body = await request.json();
        const wheelIdVal = sanitizeId(body.wheel || 'default');
        await env.SPIN_SIGNALS.put(`options:${wheelIdVal}`, JSON.stringify({
          options: body.options,
          settings: body.settings,
          updatedAt: Date.now(),
        }));
        return Response.json({ ok: true }, { headers: corsHeaders() });
      } catch (err) {
        return Response.json({ ok: false, error: String(err) }, {
          status: 500, headers: corsHeaders(),
        });
      }
    }

    // --- GET /api/options?wheel=default — overlay fetches current options ---
    if (url.pathname === '/api/options' && request.method === 'GET') {
      const wheelIdVal = sanitizeId(url.searchParams.get('wheel') || 'default');
      const data = await env.SPIN_SIGNALS.get(`options:${wheelIdVal}`, 'json');
      return Response.json(data || { options: null, settings: null, updatedAt: 0 }, {
        headers: { ...corsHeaders(), 'Cache-Control': 'no-store' },
      });
    }

    // Unmatched API routes
    if (url.pathname.startsWith('/api/')) {
      return Response.json({ error: 'Not found' }, {
        status: 404, headers: corsHeaders(),
      });
    }

    // Everything else falls through to static assets (404 from the platform)
    return new Response('Not Found', { status: 404 });
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

// Only allow alphanumeric + hyphen wheel IDs, max 30 chars
function sanitizeId(id) {
  return id.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 30) || 'default';
}
