/* ================================================================
   RENTLY API CLIENT
   Talks to the real backend (NestJS, deployed on Railway). Session
   storage, a fetch wrapper, and adapters that translate real API
   response shapes into the exact object shape rently.js's shared
   renderers (rcard, artDiv, renderStageTimeline) already expect — so
   those don't need to change to consume real data.
   ================================================================ */

// Always the deployed Railway API — the frontend runs locally (via `npx serve`)
// far more often than a local backend does, so a localhost-hostname fallback
// here would silently break local testing against the real API instead of
// helping it. Point this at a local backend manually if you're developing
// the backend and frontend side by side.
const API_BASE = 'https://backend-production-cc34b.up.railway.app/api/v1';

/* ---------------- SESSION ----------------
   Plain localStorage — the pragmatic choice for a static, buildless
   site. If this ever needs production-grade XSS hardening, this is
   the spot to swap for httpOnly cookies (requires the backend to set
   them and the frontend to stop reading tokens directly). */
const SESSION_KEYS = { access: 'rently_access', refresh: 'rently_refresh', user: 'rently_user' };

function getSession() {
  const access = localStorage.getItem(SESSION_KEYS.access);
  const refresh = localStorage.getItem(SESSION_KEYS.refresh);
  const userRaw = localStorage.getItem(SESSION_KEYS.user);
  if (!access || !userRaw) return null;
  try {
    return { access, refresh, user: JSON.parse(userRaw) };
  } catch {
    return null;
  }
}
function setSession(user, tokens) {
  localStorage.setItem(SESSION_KEYS.access, tokens.accessToken);
  if (tokens.refreshToken) localStorage.setItem(SESSION_KEYS.refresh, tokens.refreshToken);
  if (user) localStorage.setItem(SESSION_KEYS.user, JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem(SESSION_KEYS.access);
  localStorage.removeItem(SESSION_KEYS.refresh);
  localStorage.removeItem(SESSION_KEYS.user);
}

/**
 * Redirects to auth if logged out, or to the correct dashboard on a role
 * mismatch. Call at the top of every app-shell page.
 *
 * super_admin satisfies an 'admin' check — the backend's own @Roles guards
 * always pair (ADMIN, SUPER_ADMIN) together for every admin-gated endpoint
 * (see AdminProvidersController/AdminListingsController), so a super admin
 * with only that literal role must not get bounced from admin.html while
 * every API call they make there would otherwise succeed.
 */
function hasRole(session, role) {
  if (session.user.roles.includes(role)) return true;
  if (role === 'admin' && session.user.roles.includes('super_admin')) return true;
  return false;
}
function requireSession(role) {
  const session = getSession();
  if (!session) {
    window.location.href = 'auth';
    return null;
  }
  if (role && !hasRole(session, role)) {
    window.location.href = session.user.roles.includes('provider') ? 'dashboard-provider' : 'dashboard-renter';
    return null;
  }
  return session;
}

/* ---------------- FETCH WRAPPER ---------------- */
class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

let refreshInFlight = null;
function refreshAccessToken() {
  const session = getSession();
  if (!session || !session.refresh) {
    return Promise.reject(new ApiError('REFRESH_TOKEN_INVALID', 'No refresh token available', 401));
  }
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refresh }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new ApiError(
            json?.error?.code || 'REFRESH_TOKEN_INVALID',
            json?.error?.message || 'Session expired.',
            res.status,
          );
        }
        setSession(session.user, json.data);
        return json.data;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/**
 * Every call returns `{data, meta}` — `meta` is only present on
 * cursor-paginated list endpoints, undefined otherwise. Throws ApiError
 * (with `.code`/`.status`) on any non-2xx response. On a 401 from an
 * authenticated call, retries once after a silent token refresh; if that
 * also fails, clears the session and redirects to auth.
 */
async function apiFetch(path, { method = 'GET', body, auth = true, idempotencyKey, _retried = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const session = getSession();
  if (auth && session) headers.Authorization = `Bearer ${session.access}`;
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  // The API sends ETag but no Cache-Control on JSON responses, so without
  // an explicit cache mode the browser can serve a stale GET from its HTTP
  // cache instead of hitting the network -- caught live via a booking whose
  // dispute had just been resolved still showing the pre-resolution dispute
  // on a same-page refetch immediately after.
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    cache: 'no-store',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return { data: null };
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && auth && session?.refresh && !_retried) {
      try {
        await refreshAccessToken();
        return apiFetch(path, { method, body, auth, idempotencyKey, _retried: true });
      } catch (e) {
        clearSession();
        window.location.href = 'auth';
        throw e;
      }
    }
    throw new ApiError(json?.error?.code || 'INTERNAL_ERROR', json?.error?.message || 'Something went wrong.', res.status);
  }
  return { data: json.data, meta: json.meta };
}

/**
 * Re-mints the access token from the current DB state and refreshes the
 * cached user. The JWT's `roles` claim is baked in at issue time — after
 * any server-side role change (e.g. POST /providers/profile granting the
 * provider role), the *old* token keeps authorizing as the *old* roles
 * until this runs, even though GET /users/me would already show the new
 * ones. Call this right after any such change, before navigating to a
 * page gated on the new role.
 */
async function refreshSession() {
  const session = getSession();
  if (!session) return null;
  const { data: tokens } = await apiFetch('/auth/refresh', { method: 'POST', auth: false, body: { refreshToken: session.refresh } });
  setSession(session.user, tokens);
  const { data: freshUser } = await apiFetch('/users/me');
  setSession(freshUser, tokens);
  return freshUser;
}

/** Multipart upload — no Content-Type header, the browser sets the boundary. */
async function apiUpload(path, formData) {
  const session = getSession();
  const headers = {};
  if (session) headers.Authorization = `Bearer ${session.access}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: formData });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(json?.error?.code || 'INTERNAL_ERROR', json?.error?.message || 'Upload failed.', res.status);
  }
  return json.data;
}

/* ---------------- ADAPTERS ----------------
   Translate real API shapes into what rently.js's shared renderers
   (rcard, artDiv, renderStageTimeline) already read — see that file's
   rcard()/renderStageTimeline() for the exact fields each expects. */

function mapCategory(c) {
  return { key: c.slug, name: c.name, id: c.id };
}

let _categoriesPromise = null;
/** Fetched once per page load and cached — the category list rarely changes mid-session. */
async function getCategories() {
  if (!_categoriesPromise) {
    _categoriesPromise = apiFetch('/categories', { auth: false }).then(({ data }) => data.map(mapCategory));
  }
  return _categoriesPromise;
}
async function getCategoryMapById() {
  const cats = await getCategories();
  return new Map(cats.map((c) => [c.id, c]));
}

const _providerCache = new Map();
/** Providers are fetched on demand per unique id and cached — cheap at prototype scale, avoids changing backend listing responses to embed joins. */
async function getProviderCached(providerId) {
  if (_providerCache.has(providerId)) return _providerCache.get(providerId);
  const promise = apiFetch(`/providers/${providerId}`, { auth: false })
    .then(({ data: p }) => ({
      id: p.id,
      name: p.name,
      avatar: initials(p.name),
      verified: p.verificationStatus === 'verified',
      rating: Number(p.avgRating) || 0,
    }))
    .catch(() => ({ id: providerId, name: 'Provider', avatar: 'PR', verified: false, rating: 0 }));
  _providerCache.set(providerId, promise);
  return promise;
}

const _userCache = new Map();
/** Resolves a real display name for a raw user id (e.g. a booking's renterId) via the public GET /users/:id — never shows a raw UUID to the viewer, even on failure. */
async function getUserCached(userId) {
  if (_userCache.has(userId)) return _userCache.get(userId);
  const promise = apiFetch(`/users/${userId}`, { auth: false })
    .then(({ data: u }) => ({ id: u.id, fullName: u.fullName }))
    .catch(() => ({ id: userId, fullName: 'Renter #' + userId.slice(0, 6).toUpperCase() }));
  _userCache.set(userId, promise);
  return promise;
}

async function mapListing(l, categoryById) {
  const cat = categoryById.get(l.categoryId);
  const provider = await getProviderCached(l.providerId);
  return {
    id: l.id,
    title: l.title,
    cat: cat ? cat.key : 'spaces',
    catName: cat ? cat.name : 'Other',
    price: Math.round(l.priceMinor / 100),
    unit: l.priceUnit,
    rating: Number(l.avgRating) || 0,
    reviews: l.reviewCount || 0,
    loc: l.locationText,
    providerId: l.providerId,
    provider: provider.name,
    pAvatar: provider.avatar,
    verified: provider.verified,
    mode: l.bookingMode,
    deposit: Math.round((l.depositMinor || 0) / 100),
    delivery: false,
    availability: 'available',
    desc: l.description,
    specs: [],
  };
}
async function mapListings(listings, categoryById) {
  return Promise.all(listings.map((l) => mapListing(l, categoryById)));
}

function mapBooking(b) {
  return {
    id: b.id,
    listingId: b.listingId,
    status: b.status,
    stage: b.stage,
    dateFrom: b.startsAt.slice(0, 10),
    dateTo: b.endsAt.slice(0, 10),
    total: Math.round(b.totalMinor / 100),
    deposit: Math.round((b.depositMinor || 0) / 100),
    depositStatus: b.status === 'completed' ? 'released' : b.status === 'cancelled' ? 'refunded' : 'held',
    createdAt: b.createdAt,
  };
}

/** Renders a friendly message for a caught ApiError (or any Error) — never surfaces raw stack traces to the UI. */
function apiErrorMessage(err) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
}
