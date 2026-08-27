/* Aufan Rachmad — accounts and project briefs.
   =========================================================================
   Plain fetch against Supabase's REST and GoTrue endpoints. No SDK, no build
   step, same as every other page in this studio.

   THE SHAPE, and it is deliberate (see the vault note "How to Add Accounts to
   a Guest-First App"):

     guest first, account as an upgrade — never a gate.

   A visitor gets a real ANONYMOUS auth user on load. Not a fake local id: a
   real user with a signed JWT, which is what lets Row Level Security enforce
   "you may only read your own enquiries" in the database instead of trusting
   the browser. They can send a brief immediately, with no signup. If they
   later make an account, the SAME user is converted — the uid does not
   change, so the brief they already sent is simply already theirs. There is
   no migration because nothing moves.

   Start with a signup wall and you throw that away.
   ========================================================================= */

/* ── config ──────────────────────────────────────────────────────────────
   The anon/publishable key is designed to be public — it identifies the
   project, it does not authorise anything. Every actual permission is
   enforced by RLS policies in Postgres. Never put a service_role key here. */
const SB_URL = window.__SB_URL__ || "";
const SB_KEY = window.__SB_KEY__ || "";

const CONFIGURED = Boolean(SB_URL && SB_KEY);

const LS = "aufan.studio.session";
const AUTH = `${SB_URL}/auth/v1`;
const REST = `${SB_URL}/rest/v1`;

const TIER_LABEL = {
  landing:  "Landing page",
  full:     "Full site",
  mechanic: "Something with a mechanic",
  connect:  "Connect something",
  system:   "Build a system",
  unsure:   "Not sure yet",
};

/* ── session store ───────────────────────────────────────────────────────── */
let session = null;
let user = null;

const saveSession = (s) => {
  session = s;
  try { localStorage.setItem(LS, JSON.stringify(s)); } catch {}
};
const loadSession = () => {
  try { return JSON.parse(localStorage.getItem(LS) || "null"); } catch { return null; }
};
const clearSession = () => {
  session = null; user = null;
  try { localStorage.removeItem(LS); } catch {}
};

/* ⚠️ expires_at arrives as a STRING. Number() it — "abc" * 1000 is NaN, every
   NaN comparison is false, and a guard phrased "is it expired?" would then
   answer "no" forever. */
const expired = (s) =>
  !s?.expires_at || Number(s.expires_at) * 1000 < Date.now() + 30_000;

/* ── low-level calls ─────────────────────────────────────────────────────── */
async function authFetch(path, { method = "POST", body, token } = {}) {
  const res = await fetch(`${AUTH}/${path}`, {
    method,
    headers: {
      apikey: SB_KEY,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.msg || data.error_description || data.message || `Auth error ${res.status}`);
  return data;
}

async function restFetch(path, { method = "GET", body, prefer } = {}) {
  await ensureFresh();
  const res = await fetch(`${REST}/${path}`, {
    method,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Database error ${res.status}: ${t.slice(0, 160)}`);
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}

/* ── session lifecycle ───────────────────────────────────────────────────── */
async function signInAnon() {
  const s = await authFetch("signup", { body: { data: {} } });
  saveSession(s);
  user = s.user || null;
  return s;
}

async function refresh() {
  const s = await authFetch(`token?grant_type=refresh_token`, {
    body: { refresh_token: session.refresh_token },
  });
  saveSession(s);
  user = s.user || user;
  return s;
}

async function ensureFresh() {
  if (!session) throw new Error("No session");
  if (expired(session)) {
    try { await refresh(); }
    catch { clearSession(); await signInAnon(); }
  }
}

async function fetchUser() {
  const u = await authFetch("user", { method: "GET", token: session.access_token });
  user = u;
  return u;
}

/* Read the RESPONSE, do not assume the project's setting. With autoconfirm on
   the address lands in `email`; with confirmation required it lands in
   `new_email` and `email` stays empty. Branching on the result means the same
   code is correct under either configuration, and survives someone flipping
   the dashboard setting later. */
const isConfirmed = (u) => Boolean(u?.email && !u?.new_email);
const isAnon = (u) => Boolean(u?.is_anonymous) || !u?.email;

/* ── the confirmation / recovery fragment ────────────────────────────────────
   GoTrue verifies an emailed token then redirects back with the session in the
   URL FRAGMENT. This must be consumed before anything else runs, or a
   successful confirmation looks like a broken link. */
function consumeFragment() {
  const h = location.hash || "";
  if (!h.includes("access_token=") && !h.includes("error=")) return null;

  const p = new URLSearchParams(h.slice(1));
  // strip the credentials out of the address bar: leaving them there puts
  // them in browser history and in any Referer the page sends
  history.replaceState(null, "", location.pathname + location.search);

  const err = p.get("error_description") || p.get("error");
  if (err) return { error: err.replace(/\+/g, " ") };

  const s = {
    access_token:  p.get("access_token"),
    refresh_token: p.get("refresh_token"),
    expires_at:    p.get("expires_at"),
    token_type:    p.get("token_type"),
  };
  if (!s.access_token) return null;
  saveSession(s);
  return { type: p.get("type") || "confirm" };
}

/* ── friendlier GoTrue messages ──────────────────────────────────────────── */
function friendly(msg = "") {
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "That email already has an account. Sign in instead.";
  if (m.includes("invalid login credentials"))
    return "That email and password don't match. Try again, or reset the password.";
  if (m.includes("email not confirmed"))
    return "Check your inbox and confirm the address first.";
  if (m.includes("password should be"))
    return "Password needs to be at least 6 characters.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts just now. Give it a minute.";
  if (m.includes("unable to validate email"))
    return "That doesn't look like a valid email address.";
  return msg || "Something went wrong. Try again.";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ══ the brief form ═══════════════════════════════════════════════════════ */
const form   = document.getElementById("briefForm");
const errBox = document.getElementById("briefErr");

function showErr(msg, field) {
  errBox.textContent = msg;
  errBox.hidden = false;
  if (field) {
    field.setAttribute("aria-invalid", "true");
    field.focus();
  }
}
function clearErr() {
  errBox.hidden = true;
  form?.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute("aria-invalid"));
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErr();

  const f = Object.fromEntries(new FormData(form));
  const el = (n) => form.querySelector(`[name="${n}"]`);

  if (!f.name?.trim())            return showErr("Your name, so I know who I'm replying to.", el("name"));
  if (!EMAIL_RE.test(f.email||"")) return showErr("That doesn't look like a valid email address.", el("email"));
  if (!f.tier)                     return showErr("Pick roughly what you need — you can change your mind later.", el("tier"));
  if ((f.brief||"").trim().length < 12)
    return showErr("Give me a sentence or two about what you're after.", el("brief"));

  if (!CONFIGURED) {
    // No database wired up yet — fall back to the thing that always works
    // rather than silently failing. A dead submit button is worse than an
    // honest mailto.
    const body = encodeURIComponent(
      `Name: ${f.name}\nEmail: ${f.email}\nBusiness: ${f.business || "—"}\n` +
      `Needs: ${TIER_LABEL[f.tier] || f.tier}\nTimeline: ${f.timeline || "—"}\n\n${f.brief}`
    );
    location.href = `mailto:aufanhakim1920@gmail.com?subject=${encodeURIComponent("Project brief — " + f.name)}&body=${body}`;
    return;
  }

  form.dataset.busy = "1";
  try {
    if (!session) await signInAnon();

    await restFetch("enquiries", {
      method: "POST",
      body: {
        name: f.name.trim(),
        email: f.email.trim(),
        business_name: f.business?.trim() || null,
        tier: f.tier,
        timeline: f.timeline?.trim() || null,
        brief: f.brief.trim(),
      },
      prefer: "return=minimal",
    });

    form.innerHTML =
      `<p class="f-ok"><b>Sent — thanks.</b>` +
      `I'll read it properly and come back within two working days with a price and a plan. ` +
      `If it's urgent, email me directly at aufanhakim1920@gmail.com.</p>` +
      `<p class="f-fine">Want to track it? <button type="button" id="postSignup" ` +
      `style="font:inherit;color:var(--blue);background:none;border:0;padding:0;cursor:pointer;` +
      `text-decoration:underline;text-underline-offset:2px">Make an account</button> — this brief carries over.</p>`;

    document.getElementById("postSignup")?.addEventListener("click", () => openSheet("create"));
  } catch (err) {
    form.dataset.busy = "";
    showErr(friendly(err.message));
  }
});

/* ══ the account sheet ════════════════════════════════════════════════════ */
const sheet = document.getElementById("accountSheet");
const body  = document.getElementById("sheetBody");
const title = document.getElementById("sheetTitle");
const accBtn   = document.getElementById("accountBtn");
const accLabel = document.getElementById("accountLabel");

function setBarState() {
  const signed = user && !isAnon(user);
  accBtn.dataset.signed = signed ? "1" : "";
  accLabel.textContent = signed ? "Your projects" : "Sign in";
}

function openSheet(view = "auto") {
  render(view);
  if (!sheet.open) sheet.showModal();
}

accBtn?.addEventListener("click", () => openSheet());

/* views: create | signin | reset | list */
function render(view) {
  if (!CONFIGURED) {
    title.textContent = "Accounts";
    body.innerHTML =
      `<p class="sheet-msg">Accounts aren't switched on yet. Send a brief from the ` +
      `form on the page and it reaches me either way — or email ` +
      `<a href="mailto:aufanhakim1920@gmail.com">aufanhakim1920@gmail.com</a>.</p>`;
    return;
  }

  if (view === "auto") view = user && !isAnon(user) ? "list" : "signin";

  if (view === "list")   return renderList();
  if (view === "create") return renderForm("create");
  if (view === "reset")  return renderForm("reset");
  return renderForm("signin");
}

function renderForm(mode) {
  const isCreate = mode === "create";
  const isReset  = mode === "reset";

  title.textContent = isCreate ? "Make an account" : isReset ? "Reset your password" : "Sign in";

  body.innerHTML = `
    <p class="sheet-msg">${
      isCreate ? "So you can come back and see where your project is up to."
      : isReset ? "We'll email you a link to set a new one."
      : "To see the briefs you've sent and where they're up to."
    }</p>
    <form id="authForm" novalidate>
      <div class="f-row">
        <label for="a-email">Email</label>
        <input id="a-email" name="email" type="email" autocomplete="email" required>
      </div>
      ${isReset ? "" : `
      <div class="f-row">
        <label for="a-pass">Password</label>
        <input id="a-pass" name="password" type="password" required
               autocomplete="${isCreate ? "new-password" : "current-password"}">
      </div>`}
      ${isCreate ? `
      <div class="f-row">
        <label for="a-pass2">Password again</label>
        <input id="a-pass2" name="password2" type="password" required autocomplete="new-password">
      </div>` : ""}
      <p class="f-err" id="authErr" role="alert" hidden></p>
      <button class="btn primary" type="submit">${
        isCreate ? "Create account" : isReset ? "Send the link" : "Sign in"
      }</button>
    </form>
    <p class="sheet-alt">${
      isCreate ? `Already have one? <button type="button" data-go="signin">Sign in</button>`
      : isReset ? `<button type="button" data-go="signin">Back to sign in</button>`
      : `No account? <button type="button" data-go="create">Make one</button>
         &middot; <button type="button" data-go="reset">Forgot password</button>`
    }</p>`;

  body.querySelectorAll("[data-go]").forEach((b) =>
    b.addEventListener("click", () => render(b.dataset.go)));

  body.querySelector("#authForm").addEventListener("submit", (e) =>
    submitAuth(e, mode));
}

async function submitAuth(e, mode) {
  e.preventDefault();
  const f    = e.target;
  const err  = f.querySelector("#authErr");
  const data = Object.fromEntries(new FormData(f));
  const fail = (m, sel) => {
    err.textContent = m; err.hidden = false;
    const el = sel && f.querySelector(sel);
    if (el) { el.setAttribute("aria-invalid", "true"); el.focus(); }
  };
  err.hidden = true;
  f.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));

  if (!EMAIL_RE.test(data.email || "")) return fail("That doesn't look like a valid email address.", '[name="email"]');
  if (mode === "create" && data.password !== data.password2)
    return fail("The two passwords don't match.", '[name="password2"]');
  if (mode !== "reset" && (data.password || "").length < 6)
    return fail("Password needs to be at least 6 characters.", '[name="password"]');

  const btn = f.querySelector("button[type=submit]");
  btn.disabled = true;

  try {
    if (mode === "reset") {
      await authFetch(`recover?redirect_to=${encodeURIComponent(location.href.split("#")[0])}`,
        { body: { email: data.email } });
      // Deliberately the same message whether or not the address exists —
      // GoTrue answers 200 either way. Saying "no account with that email"
      // turns a login form into a tool for finding out who has signed up.
      body.innerHTML = `<p class="f-ok"><b>Check your inbox.</b>If that address has an account, a link is on its way.</p>`;
      return;
    }

    if (mode === "create") {
      if (!session) await signInAnon();
      await ensureFresh();
      // The CONVERSION: PUT user with the guest's bearer token. Same uid, so
      // any brief already sent is already theirs — nothing to migrate.
      const u = await authFetch("user", {
        method: "PUT",
        token: session.access_token,
        body: { email: data.email, password: data.password },
      });
      user = u;
      if (isConfirmed(u)) {
        setBarState();
        renderList();
      } else {
        body.innerHTML =
          `<p class="f-ok"><b>Almost there.</b>Confirm your address from the email we just sent, ` +
          `then you'll be able to sign in anywhere. Anything you've already sent me is safe.</p>`;
      }
      return;
    }

    // sign in
    const s = await authFetch("token?grant_type=password", {
      body: { email: data.email, password: data.password },
    });
    saveSession(s);
    await fetchUser();
    setBarState();
    renderList();
  } catch (e2) {
    fail(friendly(e2.message));
  } finally {
    btn.disabled = false;
  }
}

async function renderList() {
  title.textContent = "Your projects";
  body.innerHTML = `<p class="sheet-msg">Loading&hellip;</p>`;
  try {
    const rows = await restFetch("enquiries?select=*&order=created_at.desc");
    const who = user?.email || user?.new_email;

    body.innerHTML =
      (who ? `<p class="sheet-msg">Signed in as ${who}.</p>` : "") +
      (rows?.length
        ? `<ul class="enq">${rows.map((r) => `
            <li>
              <h4>${TIER_LABEL[r.tier] || r.tier}</h4>
              <p>${(r.brief || "").slice(0, 150).replace(/</g, "&lt;")}${(r.brief||"").length > 150 ? "&hellip;" : ""}</p>
              <time>${new Date(r.created_at).toLocaleDateString("en-AU", { day:"numeric", month:"short", year:"numeric" })}</time>
              <span class="status" data-s="${r.status}">${r.status}</span>
            </li>`).join("")}</ul>`
        : `<p class="sheet-msg">Nothing here yet. Send a brief from the form on the page and it'll show up here.</p>`) +
      `<p class="sheet-alt"><button type="button" id="signOut">Sign out</button></p>`;

    document.getElementById("signOut")?.addEventListener("click", doSignOut);
  } catch (e) {
    body.innerHTML = `<p class="sheet-msg">Couldn't load those just now. ${friendly(e.message)}</p>`;
  }
}

/* Sign out returns to GUEST, not to a dead end. A signed-out state with no
   session at all means every write silently fails. */
async function doSignOut() {
  try { await authFetch("logout", { token: session?.access_token }); } catch {}
  clearSession();
  await signInAnon().catch(() => {});
  setBarState();
  body.innerHTML =
    `<p class="sheet-msg">Signed out. Nothing on your account is deleted — sign back in any time.</p>` +
    `<p class="sheet-alt"><button type="button" data-go="signin">Sign in</button></p>`;
  body.querySelectorAll("[data-go]").forEach((b) =>
    b.addEventListener("click", () => render(b.dataset.go)));
}

/* ══ boot ═════════════════════════════════════════════════════════════════ */
(async function boot() {
  if (!CONFIGURED) { setBarState(); return; }

  // the fragment must be consumed BEFORE anything else looks at state
  const frag = consumeFragment();

  session = session || loadSession();

  try {
    if (frag?.error) {
      openSheet("signin");
      const e = document.getElementById("authErr");
      if (e) { e.textContent = friendly(frag.error); e.hidden = false; }
    } else if (session) {
      await ensureFresh();
      await fetchUser();
    } else {
      await signInAnon();
    }
  } catch {
    clearSession();
    try { await signInAnon(); } catch {}
  }

  setBarState();

  // A recovery link SIGNS THE USER IN — so it must route to "set a new
  // password" ahead of every other state, or they land on their profile
  // having never been asked for the password they came to set.
  if (frag?.type === "recovery") openSheet("newPassword");
  else if (frag?.type && !frag.error && user && !isAnon(user)) openSheet("list");
})();
