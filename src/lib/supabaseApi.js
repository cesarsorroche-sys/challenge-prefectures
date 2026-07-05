const projectUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const sessionKey = "challenge-prefectures-supabase-session";

export const isSupabaseConfigured = Boolean(projectUrl && publishableKey);

function decodeUser(accessToken) {
  try {
    const payload = accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(payload), (character) => character.charCodeAt(0));
    const decoded = JSON.parse(new TextDecoder().decode(bytes));
    return { id: decoded.sub, email: decoded.email || "" };
  } catch {
    return null;
  }
}

function saveSession(session) {
  if (session) localStorage.setItem(sessionKey, JSON.stringify(session));
  else localStorage.removeItem(sessionKey);
}

export function readSession() {
  try {
    const session = JSON.parse(localStorage.getItem(sessionKey) || "null");
    if (!session?.access_token) return null;
    return { ...session, user: decodeUser(session.access_token) };
  } catch {
    return null;
  }
}

async function request(path, options = {}, session = readSession()) {
  const headers = new Headers(options.headers || {});
  headers.set("apikey", publishableKey);
  if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  if (options.body && !(options.body instanceof Blob) && !(options.body instanceof File)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${projectUrl}${path}`, { ...options, headers });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.msg || detail.message || detail.error_description || `Erreur ${response.status}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function refreshSession(session) {
  if (!session?.refresh_token) return null;
  const next = await request(
    "/auth/v1/token?grant_type=refresh_token",
    { method: "POST", body: JSON.stringify({ refresh_token: session.refresh_token }) },
    null,
  );
  const normalized = { ...next, expires_at: Date.now() + next.expires_in * 1000 };
  saveSession(normalized);
  return { ...normalized, user: decodeUser(normalized.access_token) };
}

export async function bootstrapSession() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  if (hash.get("access_token")) {
    const session = {
      access_token: hash.get("access_token"),
      refresh_token: hash.get("refresh_token"),
      expires_in: Number(hash.get("expires_in") || 3600),
      expires_at: Date.now() + Number(hash.get("expires_in") || 3600) * 1000,
      token_type: hash.get("token_type") || "bearer",
    };
    saveSession(session);
    window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
    return { ...session, user: decodeUser(session.access_token) };
  }

  const stored = readSession();
  if (!stored) return null;
  if (!stored.expires_at || stored.expires_at > Date.now() + 60_000) return stored;
  return refreshSession(stored).catch(() => {
    saveSession(null);
    return null;
  });
}

export async function sendMagicLink(email, displayName) {
  const redirect = encodeURIComponent(window.location.origin);
  return request(`/auth/v1/otp?redirect_to=${redirect}`, {
    method: "POST",
    body: JSON.stringify({
      email,
      create_user: true,
      data: { display_name: displayName.trim() || email.split("@")[0] },
    }),
  }, null);
}

export async function signOut() {
  const session = readSession();
  if (session) await request("/auth/v1/logout", { method: "POST" }, session).catch(() => null);
  saveSession(null);
}

export const database = {
  profiles: () => request("/rest/v1/profiles?select=id,display_name,slot&order=slot.asc"),
  entries: () => request("/rest/v1/department_entries?select=*&order=updated_at.desc"),
  upsertEntry: (entry) => request(
    "/rest/v1/department_entries?on_conflict=user_id,department_code",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(entry),
    },
  ),
};

export const storage = {
  async upload(path, file) {
    await request(`/storage/v1/object/prefecture-photos/${path}`, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    return `${projectUrl}/storage/v1/object/public/prefecture-photos/${path}`;
  },
  remove: (path) => request(`/storage/v1/object/prefecture-photos/${path}`, { method: "DELETE" }),
};
