/* baka nae. — kelola toko
   Everything here is only a convenience. The real lock is the database: Row Level Security
   lets a request write only when its signed-in email is on the `editors` list, so this page
   can be copied, edited or attacked and still cannot change anything for a stranger. */
(function () {
  "use strict";
  var CFG = window.BAKANAE || {};
  var app = document.getElementById("app");
  var dlg = document.getElementById("dlg");
  var cfm = document.getElementById("cfm");
  var toastEl = document.getElementById("toast");
  var ADMIN_URL = location.origin + location.pathname;
  var DEFAULT_SHOP = "https://shopee.co.id/baka_nae";
  var KNOWN_TYPES = ["Keychain", "Phone Strap", "Sticker", "Postcard", "Photocard", "Art Print"];
  var PALETTE = ["#D2C3EA", "#E8C3ED", "#F1C2E0", "#F4C1CA", "#F8D2C1", "#FBEFC0"];
  var sb = null;
  var S = {
    ready: false, loaded: false, session: null, userId: null, role: null,
    series: [], products: [], editors: [],
    tab: "produk", authTab: "login", recovery: false, loadError: null
  };
  var F = null; // state of the product form that is open (photo choice)

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function rupiah(n) { return "Rp " + Number(n).toLocaleString("id-ID"); }
  function photoUrl(path) {
    return path ? CFG.url + "/storage/v1/object/public/" + (CFG.bucket || "product-photos") + "/" + path.split("/").map(encodeURIComponent).join("/") : null;
  }
  function seriesName(slug) {
    var s = S.series.find(function (x) { return x.slug === slug; });
    return s ? s.name_id : slug;
  }
  var tt;
  function toast(text, kind) {
    toastEl.textContent = text;
    toastEl.className = "show" + (kind === "err" ? " err" : "");
    clearTimeout(tt);
    tt = setTimeout(function () { toastEl.className = ""; }, 4600);
  }
  function friendly(e) {
    var m = (e && e.message) || String(e || ""), c = e && e.code;
    if (c === "42501" || /row-level security|permission denied/i.test(m)) return "Tidak diizinkan. Akunmu mungkin belum punya akses mengedit.";
    if (c === "23505") return "Data itu sudah ada.";
    if (c === "23503") return "Masih dipakai data lain, jadi belum bisa dihapus.";
    if (c === "23514") return "Ada isian yang tidak valid. Periksa nama, harga, dan link.";
    if (c === "P0001") return m;
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return "Tidak ada koneksi ke server. Coba lagi sebentar.";
    return m || "Terjadi kesalahan.";
  }
  function authErr(e) {
    var m = (e && e.message) || "";
    if (/Invalid login credentials/i.test(m)) return "Email atau kata sandi salah.";
    if (/Email not confirmed/i.test(m)) return "Email belum dikonfirmasi. Buka email dari kami dan klik tautannya.";
    if (/rate limit|too many|after \d+ seconds/i.test(m)) return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
    if (/at least|weak/i.test(m)) return "Kata sandi minimal 8 karakter.";
    return friendly(e);
  }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ---------- boot ---------- */
  function init() {
    if (!window.supabase || !CFG.url || !CFG.key || CFG.url.indexOf("__") === 0) {
      app.innerHTML = '<p class="boot">Koneksi ke database belum diatur.</p>';
      return;
    }
    // an expired or reused email link comes back as #error=…; read it before the client touches the URL
    try {
      var hp = new URLSearchParams(location.hash.slice(1));
      if (hp.get("error")) S.hashErr = "Tautan dari email sudah kedaluwarsa atau pernah dipakai. Minta tautan baru (daftar lagi atau “Lupa kata sandi”).";
    } catch (_) { /* no hash */ }
    sb = window.supabase.createClient(CFG.url, CFG.key);
    sb.auth.onAuthStateChange(function (event, session) {
      var sameUser = session && session.user.id === S.userId;
      S.session = session;
      if (event === "PASSWORD_RECOVERY") S.recovery = true;
      if (event === "SIGNED_OUT") { S.role = null; S.userId = null; S.loaded = false; S.recovery = false; }
      if (event === "TOKEN_REFRESHED") return;
      if (event === "SIGNED_IN" && sameUser && S.loaded) return; // tab refocus, nothing changed
      // never call back into supabase from inside this callback — defer it
      setTimeout(function () {
        if (S.session && !S.recovery) loadAll(); else { S.ready = true; render(); }
      }, 0);
    });
    setTimeout(function () { if (!S.ready) { S.ready = true; render(); } }, 3500);
  }

  async function loadAll() {
    var email = (S.session.user.email || "").toLowerCase();
    S.userId = S.session.user.id;
    try {
      var r = await Promise.all([
        sb.from("series").select("*").order("sort_order").order("slug"),
        sb.from("products").select("*").order("sort_order").order("created_at"),
        sb.from("editors").select("*").order("added_at")
      ]);
      r.forEach(function (x) { if (x.error) throw x.error; });
      S.series = r[0].data; S.products = r[1].data; S.editors = r[2].data;
      var me = S.editors.find(function (e) { return e.email === email; });
      S.role = me ? me.role : null;
      S.loadError = null;
    } catch (e) { S.loadError = friendly(e); }
    S.ready = true; S.loaded = true;
    render();
  }
  async function reload(what) {
    var q = {
      products: function () { return sb.from("products").select("*").order("sort_order").order("created_at"); },
      series: function () { return sb.from("series").select("*").order("sort_order").order("slug"); },
      editors: function () { return sb.from("editors").select("*").order("added_at"); }
    };
    var r = await q[what]();
    if (r.error) throw r.error;
    S[what] = r.data;
    render();
  }

  /* ---------- views ---------- */
  function render() {
    if (!S.ready) return;
    if (S.recovery) { app.innerHTML = recoveryView(); return; }
    if (!S.session) {
      app.innerHTML = authView();
      if (S.hashErr) { setMsg("err", S.hashErr); S.hashErr = null; }
      return;
    }
    if (S.loadError) { app.innerHTML = errorView(); return; }
    if (!S.role) { app.innerHTML = noAccessView(); return; }
    app.innerHTML = dashView();
  }
  function msgBox(id) { return '<p class="msg" id="' + id + '" role="alert" hidden></p>'; }
  function setMsg(kind, text, id) {
    var el = document.getElementById(id || "authMsg");
    if (!el) return;
    el.className = "msg" + (kind ? " " + kind : "");
    el.textContent = text;
    el.hidden = !text;
  }

  function authView() {
    var t = S.authTab;
    var title = t === "signup" ? "Buat akun" : t === "reset" ? "Lupa kata sandi" : "Masuk";
    var sub = t === "signup"
      ? "Hanya email yang sudah didaftarkan pemilik toko yang bisa mengedit."
      : t === "reset" ? "Kami kirim tautan untuk membuat kata sandi baru."
      : "Masuk untuk menambah, mengubah, atau menghapus produk di situs.";
    var h = '<main class="auth"><div class="auth-card"><p class="kicker">baka nae. · kelola toko</p><h1>' + title + '</h1><p class="sub">' + sub + '</p>';
    if (t !== "reset") {
      h += '<div class="tabs" role="tablist">' +
        '<button class="tab" role="tab" type="button" data-authtab="login" aria-selected="' + (t === "login") + '">Masuk</button>' +
        '<button class="tab" role="tab" type="button" data-authtab="signup" aria-selected="' + (t === "signup") + '">Buat akun</button></div>';
    }
    h += msgBox("authMsg");
    if (t === "login") {
      h += '<form data-form="login" novalidate>' +
        '<div class="field"><label for="a-email">Email</label><input id="a-email" name="email" type="email" autocomplete="email" required></div>' +
        '<div class="field"><label for="a-pass">Kata sandi</label><input id="a-pass" name="password" type="password" autocomplete="current-password" required></div>' +
        '<button class="btn btn-ink" type="submit">Masuk</button></form>' +
        '<p class="auth-foot"><button class="link" type="button" data-authtab="reset">Lupa kata sandi?</button></p>';
    } else if (t === "signup") {
      h += '<form data-form="signup" novalidate>' +
        '<div class="field"><label for="a-email">Email</label><input id="a-email" name="email" type="email" autocomplete="email" required></div>' +
        '<div class="field"><label for="a-pass">Kata sandi</label><input id="a-pass" name="password" type="password" autocomplete="new-password" minlength="8" required><p class="hint">Minimal 8 karakter.</p></div>' +
        '<div class="field"><label for="a-pass2">Ulangi kata sandi</label><input id="a-pass2" name="password2" type="password" autocomplete="new-password" required></div>' +
        '<button class="btn btn-ink" type="submit">Buat akun</button></form>' +
        '<p class="shop-note">Setelah daftar, buka email-mu dan klik tautan konfirmasi. Kalau halaman yang terbuka tampak error, itu normal — kembali ke sini dan masuk.</p>';
    } else {
      h += '<form data-form="reset" novalidate>' +
        '<div class="field"><label for="a-email">Email</label><input id="a-email" name="email" type="email" autocomplete="email" required></div>' +
        '<button class="btn btn-ink" type="submit">Kirim tautan</button></form>' +
        '<p class="auth-foot"><button class="link" type="button" data-authtab="login">← Kembali masuk</button></p>';
    }
    return h + '</div></main>';
  }
  function recoveryView() {
    return '<main class="auth"><div class="auth-card"><p class="kicker">baka nae. · kelola toko</p><h1>Kata sandi baru</h1>' +
      '<p class="sub">Buat kata sandi baru untuk akunmu.</p>' + msgBox("authMsg") +
      '<form data-form="recovery" novalidate>' +
      '<div class="field"><label for="r-pass">Kata sandi baru</label><input id="r-pass" name="password" type="password" autocomplete="new-password" minlength="8" required><p class="hint">Minimal 8 karakter.</p></div>' +
      '<div class="field"><label for="r-pass2">Ulangi kata sandi</label><input id="r-pass2" name="password2" type="password" autocomplete="new-password" required></div>' +
      '<button class="btn btn-ink" type="submit">Simpan kata sandi</button></form></div></main>';
  }
  function noAccessView() {
    return '<main class="auth"><div class="auth-card"><p class="kicker">baka nae. · kelola toko</p><h1>Belum punya akses</h1>' +
      '<p class="sub">Kamu masuk sebagai <b>' + esc(S.session.user.email) + '</b>, tetapi alamat ini belum didaftarkan sebagai pengelola toko.</p>' +
      '<p class="sub">Minta pemilik toko menambahkan email ini di tab <b>Akses</b>, lalu muat ulang halaman ini.</p>' +
      '<button class="btn" type="button" data-act="reload-page">Muat ulang</button> <button class="btn" type="button" data-act="signout">Keluar</button></div></main>';
  }
  function errorView() {
    return '<main class="auth"><div class="auth-card"><h1>Gagal memuat</h1><p class="sub">' + esc(S.loadError) + '</p>' +
      '<button class="btn btn-ink" type="button" data-act="reload-page">Coba lagi</button> <button class="btn" type="button" data-act="signout">Keluar</button></div></main>';
  }

  function dashView() {
    var owner = S.role === "owner";
    var tabs = [["produk", "Produk"], ["seri", "Seri"]];
    if (owner) tabs.push(["akses", "Akses"]);
    if (!owner && S.tab === "akses") S.tab = "produk";
    var h = '<header class="bar"><div class="bar-in"><a class="wordmark" href="../" target="_blank" rel="noopener">baka&nbsp;nae<span>.</span></a>' +
      '<div class="who"><b>' + esc(S.session.user.email) + '</b><span class="badge ' + (owner ? "owner" : "") + '">' + (owner ? "Pemilik" : "Editor") + '</span></div>' +
      '<button class="btn btn-sm" type="button" data-act="signout">Keluar</button></div></header>' +
      '<div class="wrap"><nav class="nav" aria-label="Bagian">' +
      tabs.map(function (t) { return '<button class="tab" type="button" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + '</button>'; }).join("") +
      '</nav>';
    h += S.tab === "seri" ? seriesView() : S.tab === "akses" ? accessView() : productsView();
    return h + '</div>';
  }

  function productsView() {
    var h = '<div class="head-row"><div><h2>Produk</h2><p class="lead">Yang tampil di situs: ' +
      S.products.filter(function (p) { return p.visible; }).length + ' dari ' + S.products.length + ' produk.</p></div>' +
      '<div><button class="btn btn-ink" type="button" data-act="new-product">+ Tambah produk</button></div></div>';
    if (!S.series.length) h += '<p class="note">Buat dulu minimal satu seri di tab <b>Seri</b> sebelum menambah produk.</p>';
    if (!S.products.length) return h + '<div class="empty">Belum ada produk. Tekan “Tambah produk”.</div>';
    h += '<ul class="list">' + S.products.map(function (p, i) {
      var img = photoUrl(p.image_path);
      return '<li class="row' + (p.visible ? "" : " is-off") + '">' +
        '<div class="thumb">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy">' : esc(p.type_id)) + '</div>' +
        '<div class="info"><b>' + esc(p.name_id) + '</b><span class="meta">' + rupiah(p.price_idr) + ' · ' + esc(seriesName(p.series)) + ' · ' + esc(p.type_id) + '</span>' +
        '<span><span class="badge ' + (p.visible ? "" : "off") + '">' + (p.visible ? "Tampil" : "Disembunyikan") + '</span></span></div>' +
        '<div class="acts">' +
        '<button class="btn btn-sm" type="button" data-act="edit-product" data-id="' + esc(p.id) + '">Ubah</button>' +
        '<button class="btn btn-sm" type="button" data-act="up-product" data-id="' + esc(p.id) + '"' + (i === 0 ? " disabled" : "") + ' aria-label="Naikkan urutan">↑</button>' +
        '<button class="btn btn-sm" type="button" data-act="down-product" data-id="' + esc(p.id) + '"' + (i === S.products.length - 1 ? " disabled" : "") + ' aria-label="Turunkan urutan">↓</button>' +
        '<button class="btn btn-sm" type="button" data-act="toggle-product" data-id="' + esc(p.id) + '">' + (p.visible ? "Sembunyikan" : "Tampilkan") + '</button>' +
        '<button class="btn btn-sm btn-danger" type="button" data-act="del-product" data-id="' + esc(p.id) + '">Hapus</button></div></li>';
    }).join("") + '</ul>';
    return h + '<p class="note">Urutan di sini = urutan di situs. “Sembunyikan” menyimpan produk tanpa menampilkannya; “Hapus” menghilangkannya selamanya.</p>';
  }

  function seriesView() {
    var h = '<div class="head-row"><div><h2>Seri</h2><p class="lead">Seri = judul anime/karakter. Warnanya dipakai di ilustrasi dan kartu seri.</p></div>' +
      '<div><button class="btn btn-ink" type="button" data-act="new-series">+ Tambah seri</button></div></div>';
    if (!S.series.length) return h + '<div class="empty">Belum ada seri.</div>';
    return h + '<ul class="list">' + S.series.map(function (s, i) {
      var n = S.products.filter(function (p) { return p.series === s.slug; }).length;
      return '<li class="row series"><div class="swatch" style="background:' + esc(s.hue) + '"></div>' +
        '<div class="info"><b>' + esc(s.name_id) + '</b><span class="meta">' + n + ' produk</span></div>' +
        '<div class="acts"><button class="btn btn-sm" type="button" data-act="edit-series" data-id="' + esc(s.slug) + '">Ubah</button>' +
        '<button class="btn btn-sm" type="button" data-act="up-series" data-id="' + esc(s.slug) + '"' + (i === 0 ? " disabled" : "") + ' aria-label="Naikkan urutan">↑</button>' +
        '<button class="btn btn-sm" type="button" data-act="down-series" data-id="' + esc(s.slug) + '"' + (i === S.series.length - 1 ? " disabled" : "") + ' aria-label="Turunkan urutan">↓</button>' +
        '<button class="btn btn-sm btn-danger" type="button" data-act="del-series" data-id="' + esc(s.slug) + '">Hapus</button></div></li>';
    }).join("") + '</ul>';
  }

  function accessView() {
    var me = (S.session.user.email || "").toLowerCase();
    var h = '<div class="head-row"><div><h2>Akses</h2><p class="lead">Hanya alamat email di daftar ini yang bisa mengubah situs. Orangnya harus buat akun lebih dulu (tombol “Buat akun” di halaman masuk) dengan email yang sama.</p></div></div>';
    h += '<ul class="list">' + S.editors.map(function (e) {
      var self = e.email === me;
      return '<li class="row series"><div class="swatch" style="background:' + (e.role === "owner" ? "var(--purple)" : "var(--surface)") + '"></div>' +
        '<div class="info"><b>' + esc(e.email) + (self ? " (kamu)" : "") + '</b><span class="meta">' + (e.role === "owner" ? "Pemilik — bisa mengatur akses" : "Editor — bisa mengubah produk dan seri") + '</span></div>' +
        '<div class="acts">' +
        '<button class="btn btn-sm" type="button" data-act="role-editor" data-id="' + esc(e.email) + '">' + (e.role === "owner" ? "Jadikan editor" : "Jadikan pemilik") + '</button>' +
        (self ? "" : '<button class="btn btn-sm btn-danger" type="button" data-act="del-editor" data-id="' + esc(e.email) + '">Cabut akses</button>') + '</div></li>';
    }).join("") + '</ul>';
    h += '<form data-form="editor" class="note" novalidate><h3 style="margin-bottom:12px">Beri akses</h3>' + msgBox("edMsg") +
      '<div class="field"><label for="e-email">Email</label><input id="e-email" name="email" type="email" autocomplete="off" required></div>' +
      '<div class="field"><label for="e-role">Peran</label><select id="e-role" name="role"><option value="editor">Editor — ubah produk dan seri</option><option value="owner">Pemilik — juga bisa mengatur akses</option></select></div>' +
      '<button class="btn btn-ink" type="submit">Tambahkan</button></form>';
    return h;
  }

  /* ---------- dialogs ---------- */
  function openDialog(html) {
    dlg.innerHTML = '<div class="dlg-in">' + html + '</div>';
    if (!dlg.open) dlg.showModal();
  }
  function closeDialog() { if (dlg.open) dlg.close(); F = null; }
  function ask(title, text, okLabel, danger) {
    // resolved straight from the button click, never from the dialog's "close" event, whose
    // timing varies between browsers; Esc still counts as "no"
    return new Promise(function (resolve) {
      cfm.innerHTML = '<div class="dlg-in"><h2 id="cfmTitle">' + esc(title) + '</h2><p>' + esc(text) + '</p>' +
        '<div class="dlg-acts"><button class="btn" type="button" data-v="cancel">Batal</button><button class="btn ' + (danger ? "btn-danger" : "btn-ink") + '" type="button" data-v="ok">' + esc(okLabel) + '</button></div></div>';
      var settled = false;
      function finish(yes) {
        if (settled) return;
        settled = true;
        cfm.removeEventListener("click", onBtn);
        cfm.removeEventListener("close", onEsc);
        if (cfm.open) cfm.close();
        resolve(yes);
      }
      function onBtn(e) { var b = e.target.closest("[data-v]"); if (b) finish(b.getAttribute("data-v") === "ok"); }
      function onEsc() { finish(false); }
      cfm.addEventListener("click", onBtn);
      cfm.addEventListener("close", onEsc);
      cfm.showModal();
    });
  }

  function productForm(p) {
    p = p || {};
    F = { id: p.id || null, existingPath: p.image_path || null, file: null, remove: false };
    var types = KNOWN_TYPES.slice();
    S.products.forEach(function (x) { if (types.indexOf(x.type_id) < 0) types.push(x.type_id); });
    var opts = S.series.map(function (s) {
      return '<option value="' + esc(s.slug) + '"' + (p.series === s.slug ? " selected" : "") + '>' + esc(s.name_id) + '</option>';
    }).join("");
    var img = photoUrl(p.image_path);
    openDialog('<h2 id="dlgTitle">' + (p.id ? "Ubah produk" : "Tambah produk") + '</h2><form data-form="product" novalidate>' + msgBox("fMsg") +
      '<div class="field"><span class="lab">Foto produk</span><div class="photo-box">' +
      '<div class="photo-prev" id="prev">' + (img ? '<img src="' + esc(img) + '" alt="">' : "Belum ada foto — situs memakai gambar ilustrasi") + '</div>' +
      '<div class="photo-ctl"><input id="f-file" type="file" accept="image/*" aria-label="Pilih foto"><button class="btn btn-sm" type="button" data-act="clear-photo"' + (img ? "" : " hidden") + ' id="clearPhoto">Hapus foto</button>' +
      '<p class="hint">Foto tegak (5:6) paling pas. Ukuran diperkecil otomatis.</p></div></div></div>' +
      '<div class="field"><label for="f-name">Nama produk</label><input id="f-name" name="name" type="text" maxlength="120" value="' + esc(p.name_id || "") + '" required></div>' +
      '<div class="field"><label for="f-price">Harga (Rp)</label><input id="f-price" name="price" type="text" inputmode="numeric" value="' + esc(p.price_idr != null ? p.price_idr : "") + '" required></div>' +
      '<div class="field"><label for="f-series">Seri</label><select id="f-series" name="series" required>' + (opts || '<option value="">(buat seri dulu)</option>') + '</select></div>' +
      '<div class="field"><label for="f-type">Jenis</label><input id="f-type" name="type" type="text" list="types" maxlength="40" value="' + esc(p.type_id || "") + '" required>' +
      '<datalist id="types">' + types.map(function (t) { return '<option value="' + esc(t) + '">'; }).join("") + '</datalist></div>' +
      '<div class="field"><label for="f-sold">Terjual (opsional)</label><input id="f-sold" name="sold" type="text" maxlength="12" placeholder="mis. 920 atau 1RB+" value="' + esc(p.sold_display || "") + '"></div>' +
      '<div class="field"><label for="f-url">Link Shopee produk</label><input id="f-url" name="url" type="url" maxlength="300" placeholder="https://shopee.co.id/…" value="' + esc(p.shopee_url || "") + '"><p class="hint">Kosongkan untuk memakai link toko.</p></div>' +
      '<label class="check"><input type="checkbox" name="visible"' + (p.visible === false ? "" : " checked") + '> Tampilkan di situs</label>' +
      '<div class="dlg-acts"><button class="btn" type="button" data-act="close-dialog">Batal</button><button class="btn btn-ink" type="submit" id="saveBtn">Simpan</button></div></form>');
  }

  function seriesForm(s) {
    s = s || {};
    var hue = s.hue || PALETTE[0];
    openDialog('<h2 id="dlgTitle">' + (s.slug ? "Ubah seri" : "Tambah seri") + '</h2><form data-form="series" novalidate>' + msgBox("fMsg") +
      '<input type="hidden" name="slug" value="' + esc(s.slug || "") + '"><input type="hidden" name="hue" value="' + esc(hue) + '">' +
      '<div class="field"><label for="s-name">Nama seri</label><input id="s-name" name="name" type="text" maxlength="60" value="' + esc(s.name_id || "") + '" required></div>' +
      '<div class="field"><span class="lab">Warna</span><div class="palette">' +
      PALETTE.map(function (c) { return '<button class="pal" type="button" data-act="pick-hue" data-hue="' + c + '" style="background:' + c + '" aria-label="Warna ' + c + '" aria-pressed="' + (c.toLowerCase() === hue.toLowerCase()) + '"></button>'; }).join("") +
      '<input type="color" id="s-color" value="' + esc(hue) + '" aria-label="Warna lain"></div></div>' +
      '<div class="dlg-acts"><button class="btn" type="button" data-act="close-dialog">Batal</button><button class="btn btn-ink" type="submit">Simpan</button></div></form>');
  }

  /* ---------- photo handling ---------- */
  async function toImageBlob(file) {
    if (!/^image\//.test(file.type)) throw new Error("File itu bukan gambar.");
    var bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch (e) { throw new Error("Format foto tidak didukung. Coba JPG atau PNG."); }
    var scale = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
    var c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    var ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    var blob = await new Promise(function (r) { c.toBlob(r, "image/webp", 0.86); });
    if (!blob || blob.type !== "image/webp") blob = await new Promise(function (r) { c.toBlob(r, "image/jpeg", 0.88); });
    if (!blob) throw new Error("Foto tidak bisa diproses.");
    if (blob.size > 3 * 1024 * 1024) throw new Error("Foto masih terlalu besar setelah diperkecil. Pakai foto lain.");
    return blob;
  }

  /* ---------- actions ---------- */
  async function saveProduct(form) {
    var name = form.name.value.trim();
    var price = parseInt(String(form.price.value).replace(/[^\d]/g, ""), 10);
    var series = form.series.value, type = form.type.value.trim();
    var sold = form.sold.value.trim(), url = form.url.value.trim() || DEFAULT_SHOP;
    var err = !name ? "Nama produk wajib diisi."
      : !(price >= 0) || price > 10000000 ? "Harga harus berupa angka."
      : !series ? "Pilih seri dulu."
      : !type ? "Jenis wajib diisi (mis. Keychain)."
      : !/^https:\/\//i.test(url) ? "Link harus diawali https://"
      : "";
    if (err) { setMsg("err", err, "fMsg"); return; }
    var btn = document.getElementById("saveBtn");
    btn.disabled = true; btn.textContent = "Menyimpan…";
    var fs = F; // the form state, held locally in case the dialog is closed mid-save
    var newPath = null, oldPath = null, path = fs.existingPath;
    try {
      if (fs.file) {
        var blob = await toImageBlob(fs.file);
        newPath = "p/" + crypto.randomUUID() + (blob.type === "image/webp" ? ".webp" : ".jpg");
        var up = await sb.storage.from(CFG.bucket || "product-photos").upload(newPath, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
        if (up.error) throw up.error;
        oldPath = fs.existingPath; path = newPath;
      } else if (fs.remove) { oldPath = fs.existingPath; path = null; }
      var row = { name_id: name, price_idr: price, series: series, type_id: type, sold_display: sold, shopee_url: url, image_path: path, visible: form.visible.checked };
      var res;
      if (fs.id) res = await sb.from("products").update(row).eq("id", fs.id).select().single();
      else {
        var max = S.products.reduce(function (m, p) { return Math.max(m, p.sort_order || 0); }, 0);
        row.sort_order = max + 10;
        res = await sb.from("products").insert(row).select().single();
      }
      if (res.error) throw res.error;
      if (oldPath) sb.storage.from(CFG.bucket || "product-photos").remove([oldPath]);
      closeDialog();
      await reload("products");
      toast(row.visible ? "Tersimpan — sudah tampil di situs." : "Tersimpan (disembunyikan dari situs).");
    } catch (e) {
      if (newPath) sb.storage.from(CFG.bucket || "product-photos").remove([newPath]); // don't leave an orphan upload
      setMsg("err", friendly(e), "fMsg");
      btn.disabled = false; btn.textContent = "Simpan";
    }
  }

  async function saveSeries(form) {
    var name = form.name.value.trim(), hue = form.hue.value, slug = form.slug.value;
    if (!name) { setMsg("err", "Nama seri wajib diisi.", "fMsg"); return; }
    if (!/^#[0-9a-f]{6}$/i.test(hue)) { setMsg("err", "Pilih warna.", "fMsg"); return; }
    try {
      var res;
      if (slug) res = await sb.from("series").update({ name_id: name, hue: hue }).eq("slug", slug);
      else {
        var base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 36) || "seri";
        var taken = S.series.map(function (s) { return s.slug; }), n = 2, cand = base;
        if (cand.length < 2) cand = "seri-" + cand;
        while (taken.indexOf(cand) >= 0) cand = base + "-" + n++;
        var max = S.series.reduce(function (m, s) { return Math.max(m, s.sort_order || 0); }, 0);
        res = await sb.from("series").insert({ slug: cand, name_id: name, hue: hue, sort_order: max + 10 });
      }
      if (res.error) throw res.error;
      closeDialog();
      await reload("series");
      toast("Seri tersimpan.");
    } catch (e) { setMsg("err", friendly(e), "fMsg"); }
  }

  async function move(table, key, list, id, dir) {
    var i = list.findIndex(function (x) { return x[key] === id; }), j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    var order = list.slice(); order[i] = list[j]; order[j] = list[i];
    // renumber by position so equal or missing values can never leave two rows tied
    var jobs = [];
    order.forEach(function (x, idx) {
      var v = (idx + 1) * 10;
      if (x.sort_order !== v) jobs.push(sb.from(table).update({ sort_order: v }).eq(key, x[key]));
    });
    var res = await Promise.all(jobs);
    res.forEach(function (r) { if (r.error) throw r.error; });
    await reload(table);
  }

  async function act(name, id, el) {
    var p, s;
    switch (name) {
      case "signout": await sb.auth.signOut(); break;
      case "reload-page": location.reload(); break;
      case "close-dialog": closeDialog(); break;
      case "new-product": if (!S.series.length) { toast("Buat dulu satu seri di tab Seri.", "err"); S.tab = "seri"; render(); } else productForm(); break;
      case "edit-product": productForm(S.products.find(function (x) { return x.id === id; })); break;
      case "up-product": await move("products", "id", S.products, id, -1); break;
      case "down-product": await move("products", "id", S.products, id, 1); break;
      case "toggle-product":
        p = S.products.find(function (x) { return x.id === id; });
        var r1 = await sb.from("products").update({ visible: !p.visible }).eq("id", id);
        if (r1.error) throw r1.error;
        await reload("products");
        toast(p.visible ? "Disembunyikan dari situs." : "Sekarang tampil di situs.");
        break;
      case "del-product":
        p = S.products.find(function (x) { return x.id === id; });
        if (!(await ask("Hapus produk?", "“" + p.name_id + "” akan hilang selamanya. Kalau hanya ingin menyimpannya tanpa menampilkan, pakai “Sembunyikan”.", "Ya, hapus", true))) return;
        var r2 = await sb.from("products").delete().eq("id", id);
        if (r2.error) throw r2.error;
        if (p.image_path) sb.storage.from(CFG.bucket || "product-photos").remove([p.image_path]);
        await reload("products");
        toast("Produk dihapus.");
        break;
      case "clear-photo":
        F.file = null; F.remove = true;
        document.getElementById("prev").textContent = "Foto akan dihapus — situs memakai gambar ilustrasi";
        el.hidden = true;
        var fi = document.getElementById("f-file"); if (fi) fi.value = "";
        break;
      case "new-series": seriesForm(); break;
      case "edit-series": seriesForm(S.series.find(function (x) { return x.slug === id; })); break;
      case "up-series": await move("series", "slug", S.series, id, -1); break;
      case "down-series": await move("series", "slug", S.series, id, 1); break;
      case "del-series":
        s = S.series.find(function (x) { return x.slug === id; });
        var used = S.products.filter(function (x) { return x.series === id; }).length;
        if (used) { toast("Masih ada " + used + " produk di seri ini. Pindahkan atau hapus produknya dulu.", "err"); return; }
        if (!(await ask("Hapus seri?", "Seri “" + s.name_id + "” akan dihapus.", "Ya, hapus", true))) return;
        var r3 = await sb.from("series").delete().eq("slug", id);
        if (r3.error) throw r3.error;
        await reload("series");
        toast("Seri dihapus.");
        break;
      case "pick-hue":
        var hue = el.getAttribute("data-hue");
        dlg.querySelector('input[name="hue"]').value = hue;
        dlg.querySelector("#s-color").value = hue;
        Array.prototype.forEach.call(dlg.querySelectorAll(".pal"), function (b) { b.setAttribute("aria-pressed", String(b === el)); });
        break;
      case "role-editor":
        var ed = S.editors.find(function (x) { return x.email === id; });
        var nr = ed.role === "owner" ? "editor" : "owner";
        var r4 = await sb.from("editors").update({ role: nr }).eq("email", id);
        if (r4.error) throw r4.error;
        await reload("editors");
        toast("Peran diubah.");
        break;
      case "del-editor":
        if (!(await ask("Cabut akses?", id + " tidak akan bisa mengubah situs lagi.", "Ya, cabut", true))) return;
        var r5 = await sb.from("editors").delete().eq("email", id);
        if (r5.error) throw r5.error;
        await reload("editors");
        toast("Akses dicabut.");
        break;
    }
  }

  /* ---------- events ---------- */
  function onClick(e) {
    var t = e.target.closest("[data-act],[data-tab],[data-authtab]");
    if (!t) return;
    if (t.hasAttribute("data-tab")) { S.tab = t.getAttribute("data-tab"); render(); return; }
    if (t.hasAttribute("data-authtab")) { S.authTab = t.getAttribute("data-authtab"); render(); return; }
    act(t.getAttribute("data-act"), t.getAttribute("data-id"), t).catch(function (err) { toast(friendly(err), "err"); });
  }
  app.addEventListener("click", onClick);
  dlg.addEventListener("click", onClick);

  async function onSubmit(e) {
    var f = e.target.closest("form[data-form]");
    if (!f) return;
    e.preventDefault();
    var kind = f.getAttribute("data-form");
    var btn = f.querySelector('button[type="submit"]');
    try {
      if (kind === "product") return await saveProduct(f);
      if (kind === "series") return await saveSeries(f);
      if (kind === "login" || kind === "signup" || kind === "reset" || kind === "recovery") {
        var email = f.email ? f.email.value.trim() : "", pw = f.password ? f.password.value : "";
        if (kind !== "recovery" && !EMAIL_RE.test(email)) { setMsg("err", "Isi alamat email yang benar."); f.email.focus(); return; }
        if (kind !== "reset" && !pw) { setMsg("err", "Isi kata sandi."); f.password.focus(); return; }
        if (kind === "signup" || kind === "recovery") {
          if (pw.length < 8) { setMsg("err", "Kata sandi minimal 8 karakter."); f.password.focus(); return; }
          if (pw !== f.password2.value) { setMsg("err", "Kedua kata sandi harus sama."); f.password2.focus(); return; }
        }
        btn.disabled = true; setMsg("", "");
        var res;
        if (kind === "login") res = await sb.auth.signInWithPassword({ email: email, password: pw });
        else if (kind === "signup") res = await sb.auth.signUp({ email: email, password: pw, options: { emailRedirectTo: ADMIN_URL } });
        else if (kind === "reset") res = await sb.auth.resetPasswordForEmail(email, { redirectTo: ADMIN_URL });
        else res = await sb.auth.updateUser({ password: pw });
        btn.disabled = false;
        if (res.error) { setMsg("err", authErr(res.error)); return; }
        if (kind === "signup" && !(res.data && res.data.session))
          setMsg("ok", "Cek email-mu. Kalau alamat itu bisa dipakai, tautan konfirmasi sedang dikirim. Klik tautannya, lalu kembali ke sini dan masuk.");
        if (kind === "reset") setMsg("ok", "Kalau alamat itu punya akun, tautan untuk membuat kata sandi baru sedang dikirim.");
        if (kind === "recovery") { S.recovery = false; toast("Kata sandi diperbarui."); loadAll(); }
        return;
      }
      if (kind === "editor") {
        var em = f.email.value.trim().toLowerCase();
        if (!EMAIL_RE.test(em)) { setMsg("err", "Isi alamat email yang benar.", "edMsg"); return; }
        var r = await sb.from("editors").insert({ email: em, role: f.role.value });
        if (r.error) { setMsg("err", friendly(r.error), "edMsg"); return; }
        await reload("editors");
        toast(em + " sekarang punya akses.");
      }
    } catch (err) {
      if (btn) btn.disabled = false;
      var box = kind === "product" || kind === "series" ? "fMsg" : kind === "editor" ? "edMsg" : "authMsg";
      setMsg("err", friendly(err), box);
    }
  }
  app.addEventListener("submit", onSubmit);
  dlg.addEventListener("submit", onSubmit);

  dlg.addEventListener("change", function (e) {
    if (e.target.id === "f-file") {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) { setMsg("err", "File itu bukan gambar.", "fMsg"); e.target.value = ""; return; }
      if (file.size > 25 * 1024 * 1024) { setMsg("err", "Foto terlalu besar (maks 25 MB).", "fMsg"); e.target.value = ""; return; }
      setMsg("", "", "fMsg");
      F.file = file; F.remove = false;
      var prev = document.getElementById("prev");
      prev.innerHTML = "";
      var im = document.createElement("img");
      im.alt = ""; im.src = URL.createObjectURL(file);
      prev.appendChild(im);
      var cl = document.getElementById("clearPhoto"); if (cl) cl.hidden = false;
    }
    if (e.target.id === "s-color") {
      dlg.querySelector('input[name="hue"]').value = e.target.value;
      Array.prototype.forEach.call(dlg.querySelectorAll(".pal"), function (b) { b.setAttribute("aria-pressed", "false"); });
    }
  });
  dlg.addEventListener("close", function () { F = null; });

  init();
})();
