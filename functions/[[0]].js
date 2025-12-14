export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  /* =========================
     1. HOTLINK PROTECTION
     ========================= */

  const ALLOWED_ROOT_DOMAIN = "ssplay.net";

  const referer = request.headers.get("Referer");
  const origin = request.headers.get("Origin");

  const isAllowedSource = (value) => {
    if (!value) return true;
    try {
      const refUrl = new URL(value);
      return (
        refUrl.hostname === ALLOWED_ROOT_DOMAIN ||
        refUrl.hostname.endsWith("." + ALLOWED_ROOT_DOMAIN)
      );
    } catch {
      return false;
    }
  };

  if (!isAllowedSource(referer) || !isAllowedSource(origin)) {
    return new Response("Hotlink denied", { status: 403 });
  }

  /* =========================
     2. VALIDATE HOSTNAME
     ========================= */

  const host = url.hostname;
  const hostMatch = host.match(/^scontent-x([0-9]{2})-fbcdn\.ssplay\.net$/i);

  if (!hostMatch) {
    return new Response("Invalid host", { status: 403 });
  }

  const shardId = hostMatch[1]; // ab

  /* =========================
     3. PATH & EXTENSION
     ========================= */

  const pathname = url.pathname.replace(/^\/+/, "");

  if (!pathname || !pathname.toLowerCase().endsWith(".png")) {
    return new Response("File not allowed", { status: 403 });
  }

  /* =========================
     4. PREVIEW ID
     ========================= */

  const dashIndex = pathname.indexOf("-");
  if (dashIndex === -1) {
    return new Response("Invalid filename", { status: 400 });
  }

  const previewId = pathname.substring(0, dashIndex);

  if (!/^[a-z0-9]+$/i.test(previewId)) {
    return new Response("Invalid preview id", { status: 400 });
  }

  /* =========================
     5. BUILD ORIGIN URL
     ========================= */

  const originUrl =
    `https://${previewId}.scontent-x${shardId}-fbcdn.pages.dev/${pathname}`;

  /* =========================
     6. FETCH ORIGIN
     ========================= */

  const originResponse = await fetch(originUrl, {
    headers: {
      "User-Agent": "ssPlay.Net-Proxy-Hot-Protect"
    }
  });

  if (!originResponse.ok) {
    return new Response("File not found", {
      status: originResponse.status
    });
  }

  /* =========================
     7. RESPONSE
     ========================= */

  const headers = new Headers(originResponse.headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(originResponse.body, {
    status: originResponse.status,
    headers
  });
}
