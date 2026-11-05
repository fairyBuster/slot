/* Jackpot Odyssey — server Node.js (tanpa dependency) */
var http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");

var ROOT = __dirname;
var SLOT = require("./slot.js");
var BETS = [200, 1000, 5000, 25000, 100000, 500000, 1000000, 2000000];
var DATA = path.join(ROOT, "data");
var PORT = 8480;
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA);

var FILES = { users: "users.json", txs: "txs.json", mails: "mails.json", admin: "admin.json", games: "games.json" };
var DB = {};
function load(name, def) {
  try { DB[name] = JSON.parse(fs.readFileSync(path.join(DATA, FILES[name]), "utf8")); }
  catch (e) { DB[name] = def; }
}
function save(name) { fs.writeFileSync(path.join(DATA, FILES[name]), JSON.stringify(DB[name], null, 1)); }
load("users", {}); load("txs", []); load("mails", []);
load("admin", { pass: "admin123", logged: [] });
load("games", {});

var SESS = {};
function hash(s) { return crypto.createHash("sha256").update("jo5|" + s).digest("hex"); }
function uid() { return crypto.randomBytes(8).toString("hex"); }
function today() { return new Date().toISOString().slice(0, 10); }
function num(v) { var n = Number(v); return isFinite(n) ? Math.floor(n) : 0; }

var DAILY = [10000, 15000, 20000, 30000, 40000, 50000, 75000];
var QUEST_R = { s: 100000, w: 250000, m: 50000 };
var MIS_R = { spin: 25000, win: 25000, daily: 25000 };
var VIP_RANKS = [0, 1500, 5000, 15000];
var PACKS = [
  { amt: 25000000, label: "25 JT" },
  { amt: 100000000, label: "100 JT" },
  { amt: 250000000, label: "250 JT" },
  { amt: 1000000000, label: "1 M" }
];

function unreadOf(u) {
  return DB.mails.filter(function (m) {
    return (m.user === "all" || m.user === u.user) && !(u.mailRead || []).includes(m.id);
  }).length;
}
function pubUser(u) {
  return {
    user: u.user, nick: u.nick, bal: u.bal, vip: u.vip || 0, status: u.status || "ok",
    reg: u.reg, quest: u.quest, mis: u.mis, days: u.days || [], vipLast: u.vipLast || "",
    mailRead: u.mailRead || [], unread: unreadOf(u)
  };
}
function findUser(name) {
  var k = Object.keys(DB.users).find(function (x) { return x.toLowerCase() === String(name).toLowerCase(); });
  return k ? DB.users[k] : null;
}
function newUser(user, pass, nick) {
  var salt = crypto.randomBytes(6).toString("hex");
  var u = {
    user: user, nick: nick, pass: hash(salt + ":" + pass), salt: salt,
    bal: 30000000, vip: 0, status: "ok", reg: Date.now(),
    quest: { s: 0, w: 0, m: [], c: {} },
    mis: { d: today(), spin: 0, win: 0, daily: false, c: {} },
    days: [], vipLast: "", mailRead: []
  };
  DB.users[user] = u; save("users");
  DB.mails.push({
    id: uid(), user: user, from: "Admin", title: "Selamat datang!",
    body: "Bonus sambutan 100 RB menantimu. Klaim lewat kotak masuk ya!", reward: 100000,
    time: Date.now()
  });
  save("mails");
  return u;
}
function sendMail(target, title, body, reward) {
  DB.mails.push({
    id: uid(), user: target, from: "Admin", title: title, body: body,
    reward: num(reward) || 0, time: Date.now()
  });
  save("mails");
}

function auth(req) {
  var t = req.headers["x-token"];
  var s = SESS[t];
  if (!s || !s.user) return null;
  var u = DB.users[s.user];
  return u ? { u: u, tok: t } : null;
}
function authAdmin(req) {
  var t = req.headers["x-token"];
  var s = SESS[t];
  if (!s || !s.admin) return null;
  return s;
}

var MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".gif": "image/gif", ".jpg": "image/jpeg", ".wav": "audio/wav",
  ".mp3": "audio/mpeg", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp"
};

function serveStatic(req, res, urlPath) {
  var p = urlPath === "/" ? "/index.html" : urlPath;
  var file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, function (err, buf) {
    if (err) {
      // fallback: rute SPA seperti /login, /register, /admin → index.html
      if (!path.extname(p)) {
        fs.readFile(path.join(ROOT, "index.html"), function (e2, b2) {
          if (e2) { res.writeHead(404, { "Content-Type": "text/plain" }); res.end("404"); return; }
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(b2);
        });
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain" }); res.end("404");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(buf);
  });
}

function send(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

var server = http.createServer(function (req, res) {
  var url = req.url.split("?")[0];
  if (!url.startsWith("/api/")) { serveStatic(req, res, url); return; }

  var body = "";
  req.on("data", function (c) { body += c; });
  req.on("end", function () {
    var q = {};
    try { q = body ? JSON.parse(body) : {}; } catch (e) { q = {}; }
    var m = req.method;

    /* ---------- auth ---------- */
    if (url === "/api/register" && m === "POST") {
      var user = String(q.user || "").trim().replace(/\s+/g, "");
      var pass = String(q.pass || "");
      var nick = String(q.nick || "").trim().slice(0, 14) || user;
      if (!/^[a-zA-Z0-9_]{3,16}$/.test(user)) return send(res, 400, { ok: false, err: "Username 3-16 huruf/angka" });
      if (pass.length < 4) return send(res, 400, { ok: false, err: "Password minimal 4 karakter" });
      if (findUser(user)) return send(res, 400, { ok: false, err: "Username sudah dipakai" });
      var nu = newUser(user, pass, nick);
      var tok = uid(); SESS[tok] = { user: user };
      return send(res, 200, { ok: true, token: tok, user: pubUser(nu) });
    }
    if (url === "/api/login" && m === "POST") {
      var lu = findUser(q.user);
      if (!lu) return send(res, 400, { ok: false, err: "Username tidak ditemukan" });
      if (lu.pass !== hash(lu.salt + ":" + q.pass)) return send(res, 400, { ok: false, err: "Password salah" });
      if (lu.status === "block") return send(res, 400, { ok: false, err: "Akun diblokir. Hubungi admin" });
      if (lu.mis.d !== today()) { lu.mis = { d: today(), spin: 0, win: 0, daily: false, c: {} }; save("users"); }
      var ltok = uid(); SESS[ltok] = { user: lu.user };
      return send(res, 200, { ok: true, token: ltok, user: pubUser(lu) });
    }
    if (url === "/api/logout" && m === "POST") {
      delete SESS[req.headers["x-token"]];
      return send(res, 200, { ok: true });
    }
    if (url === "/api/me" && m === "GET") {
      var a = auth(req);
      if (!a) return send(res, 401, { ok: false, err: "Belum login" });
      if (a.u.mis.d !== today()) { a.u.mis = { d: today(), spin: 0, win: 0, daily: false, c: {} }; save("users"); }
      return send(res, 200, { ok: true, user: pubUser(a.u) });
    }

    /* ---------- user actions ---------- */
    if (url === "/api/spin" && m === "POST") {
      var as = auth(req); if (!as) return send(res, 401, { ok: false });
      var u = as.u;
      var bet = num(q.bet);
      if (BETS.indexOf(bet) < 0) return send(res, 400, { ok: false, err: "Taruhan tidak valid" });
      if (u.bal < bet) return send(res, 400, { ok: false, err: "Saldo tidak cukup" });
      var mid = String(q.machine || "").slice(0, 16);
      var p = num(DB.games[mid]);
      if (!isFinite(p)) p = 40;
      p = Math.max(0, Math.min(100, p));
      var want = Math.random() * 100 < p;
      var grid = SLOT.spinGrid();
      for (var t = 0; t < 24 && (SLOT.evalLines(grid).length > 0) !== want; t++) grid = SLOT.spinGrid();
      var wins = SLOT.evalLines(grid);
      var total = wins.reduce(function (a, w) { return a + w.pay; }, 0) * (bet / SLOT.LINES.length);
      u.bal = u.bal - bet + total;
      save("users");
      return send(res, 200, { ok: true, grid: grid, bal: u.bal, total: total });
    }
    if (url === "/api/misprog" && m === "POST") {
      var ap = auth(req); if (!ap) return send(res, 401, { ok: false });
      var u = ap.u;
      if (u.mis.d !== today()) u.mis = { d: today(), spin: 0, win: 0, daily: false, c: {} };
      if (q.spin) { u.mis.spin++; u.quest.s++; }
      if (q.win) { u.mis.win++; u.quest.w++; }
      if (q.machine && !u.quest.m.includes(q.machine)) u.quest.m.push(q.machine);
      save("users");
      return send(res, 200, { ok: true, mis: u.mis, quest: u.quest });
    }
    if (url === "/api/claim" && m === "POST") {
      var ac = auth(req); if (!ac) return send(res, 401, { ok: false });
      var u = ac.u, kind = q.kind, id = q.id, amt = 0, err = "";
      if (kind === "mission") {
        if (u.mis.c[id]) err = "Sudah diklaim";
        else if (id === "spin" && u.mis.spin < 3) err = "Belum selesai";
        else if (id === "win" && u.mis.win < 1) err = "Belum selesai";
        else if (id === "daily" && !u.mis.daily) err = "Klaim bonus harian dulu";
        else { u.mis.c[id] = 1; amt = MIS_R[id]; }
      }
      else if (kind === "quest") {
        if (u.quest.c[id]) err = "Sudah diklaim";
        else if (id === "s" && u.quest.s < 25) err = "Belum selesai";
        else if (id === "w" && u.quest.w < 10000000) err = "Belum selesai";
        else if (id === "m" && u.quest.m.length < 8) err = "Belum selesai";
        else { u.quest.c[id] = 1; amt = QUEST_R[id]; }
      }
      else if (kind === "mail") {
        var mail = DB.mails.find(function (x) { return x.id === id; });
        if (!mail || (mail.user !== "all" && mail.user !== u.user)) err = "Pesan tidak ada";
        else if ((u.mailRead || []).includes(id)) err = "Sudah diklaim";
        else { (u.mailRead = u.mailRead || []).push(id); amt = mail.reward || 0; }
      }
      else if (kind === "vip") {
        if (u.vipLast === today()) err = "Sudah diklaim hari ini";
        else {
          var r = 0;
          for (var i = 0; i < VIP_RANKS.length; i++) if (u.vip >= VIP_RANKS[i]) r = i;
          amt = 50000 + 25000 * r;
          u.vipLast = today();
        }
      }
      else if (kind === "offer") {
        if (u.offer) err = "Sudah diklaim";
        else { u.offer = 1; amt = 250000; }
      }
      else if (kind === "event") {
        if (u.event === today()) err = "Sudah diklaim hari ini";
        else { u.event = today(); amt = 250000; }
      }
      else if (kind === "daily") {
        var day = num(id);
        if (day !== u.days.length + 1) err = "Klaim berurutan dari hari ke-" + (u.days.length + 1);
        else if (u.days.includes(today())) err = "Sudah diklaim hari ini";
        else {
          amt = DAILY[(day - 1) % DAILY.length];
          u.days.push(today()); u.mis.daily = true;
        }
      }
      else err = "Jenis klaim tidak dikenal";
      if (err) return send(res, 400, { ok: false, err: err });
      u.bal += amt; save("users");
      return send(res, 200, { ok: true, amt: amt, bal: u.bal, user: pubUser(u) });
    }
    if (url === "/api/mails" && m === "GET") {
      var am = auth(req); if (!am) return send(res, 401, { ok: false });
      var list = DB.mails
        .filter(function (x) { return x.user === "all" || x.user === am.u.user; })
        .map(function (x) {
          return {
            id: x.id, from: x.from, title: x.title, body: x.body, reward: x.reward || 0,
            time: x.time, read: (am.u.mailRead || []).includes(x.id)
          };
        })
        .sort(function (a, b) { return b.time - a.time; });
      return send(res, 200, { ok: true, mails: list });
    }
    if (url === "/api/games" && m === "GET") {
      return send(res, 200, { ok: true, games: DB.games });
    }
    if (url === "/api/deposit" && m === "POST") {
      var ad = auth(req); if (!ad) return send(res, 401, { ok: false });
      var amount = num(q.amount);
      if (amount < 1000000) return send(res, 400, { ok: false, err: "Minimal deposit 1 JT" });
      var tx = { id: uid(), user: ad.u.user, type: "dep", amount: amount, bank: q.bank || "BCA", status: "pending", time: Date.now() };
      DB.txs.unshift(tx); save("txs");
      return send(res, 200, { ok: true, tx: tx });
    }
    if (url === "/api/withdraw" && m === "POST") {
      var aw = auth(req); if (!aw) return send(res, 401, { ok: false });
      var wamt = num(q.amount);
      if (wamt < 500000) return send(res, 400, { ok: false, err: "Minimal withdraw 500 rb" });
      if (wamt > aw.u.bal) return send(res, 400, { ok: false, err: "Saldo tidak cukup" });
      aw.u.bal -= wamt; save("users");
      var wtx = { id: uid(), user: aw.u.user, type: "wd", amount: wamt, bank: q.bank || "BCA", status: "pending", time: Date.now() };
      DB.txs.unshift(wtx); save("txs");
      return send(res, 200, { ok: true, tx: wtx, bal: aw.u.bal });
    }
    if (url === "/api/buypack" && m === "POST") {
      var ab = auth(req); if (!ab) return send(res, 401, { ok: false });
      var pi = num(q.i);
      if (!(pi >= 0 && pi < PACKS.length)) return send(res, 400, { ok: false, err: "Paket tidak valid" });
      var btx = { id: uid(), user: ab.u.user, type: "buy", amount: PACKS[pi].amt, note: "Beli paket " + PACKS[pi].label, status: "pending", time: Date.now() };
      DB.txs.unshift(btx); save("txs");
      return send(res, 200, { ok: true, tx: btx });
    }

    /* ---------- admin ---------- */
    if (url === "/api/admin/login" && m === "POST") {
      if (hash(q.pass) !== hash(DB.admin.pass)) return send(res, 400, { ok: false, err: "Password admin salah" });
      var atok = uid(); SESS[atok] = { admin: true };
      return send(res, 200, { ok: true, token: atok });
    }
    if (url === "/api/admin/overview" && m === "GET") {
      if (!authAdmin(req)) return send(res, 401, { ok: false });
      var users = Object.values(DB.users).map(function (u) { return pubUser(u); });
      var pending = DB.txs.filter(function (t) { return t.status === "pending"; });
      var okDep = DB.txs.filter(function (t) { return t.type === "dep" && t.status === "ok"; })
        .reduce(function (s, t) { return s + t.amount; }, 0);
      return send(res, 200, {
        ok: true,
        stats: { users: users.length, pending: pending.length, okDep: okDep },
        users: users, txs: DB.txs.slice(0, 100)
      });
    }
    if (url === "/api/admin/approve" && m === "POST") {
      if (!authAdmin(req)) return send(res, 401, { ok: false });
      var tx = DB.txs.find(function (t) { return t.id === q.id; });
      if (!tx || tx.status !== "pending") return send(res, 400, { ok: false, err: "Transaksi tidak valid" });
      tx.status = "ok"; save("txs");
      var u = DB.users[tx.user];
      if (u && (tx.type === "dep" || tx.type === "buy")) {
        u.bal += tx.amount;
        if (tx.type === "dep") u.vip = (u.vip || 0) + Math.floor(tx.amount / 100000);
        save("users");
      }
      return send(res, 200, { ok: true });
    }
    if (url === "/api/admin/reject" && m === "POST") {
      if (!authAdmin(req)) return send(res, 401, { ok: false });
      var tx = DB.txs.find(function (t) { return t.id === q.id; });
      if (!tx || tx.status !== "pending") return send(res, 400, { ok: false, err: "Transaksi tidak valid" });
      tx.status = "rej"; save("txs");
      if (tx.type === "wd") {
        var u = DB.users[tx.user];
        if (u) { u.bal += tx.amount; save("users"); }
      }
      return send(res, 200, { ok: true });
    }
    if (url === "/api/admin/adjust" && m === "POST") {
      if (!authAdmin(req)) return send(res, 401, { ok: false });
      var u = findUser(q.user);
      if (!u) return send(res, 400, { ok: false, err: "User tidak ada" });
      u.bal = Math.max(0, u.bal + num(q.amount));
      save("users");
      return send(res, 200, { ok: true, bal: u.bal });
    }
    if (url === "/api/admin/mail" && m === "POST") {
      if (!authAdmin(req)) return send(res, 401, { ok: false });
      if (!q.title) return send(res, 400, { ok: false, err: "Judul kosong" });
      sendMail(q.target === "all" ? "all" : String(q.target), String(q.title).slice(0, 60), String(q.body || "").slice(0, 300), q.reward);
      return send(res, 200, { ok: true });
    }
    if (url === "/api/admin/toggle" && m === "POST") {
      if (!authAdmin(req)) return send(res, 401, { ok: false });
      var u = findUser(q.user);
      if (!u) return send(res, 400, { ok: false, err: "User tidak ada" });
      u.status = u.status === "block" ? "ok" : "block";
      save("users");
      return send(res, 200, { ok: true, status: u.status });
    }
    if (url === "/api/admin/changepass" && m === "POST") {
      if (!authAdmin(req)) return send(res, 401, { ok: false });
      if (String(q.pass || "").length < 4) return send(res, 400, { ok: false, err: "Minimal 4 karakter" });
      DB.admin.pass = String(q.pass); save("admin");
      return send(res, 200, { ok: true });
    }
    if (url === "/api/admin/setgame" && m === "POST") {
      if (!authAdmin(req)) return send(res, 401, { ok: false });
      var gid = String(q.machine || "");
      var prob = Number(q.prob);
      if (!/^[a-zA-Z0-9_-]{1,16}$/.test(gid)) return send(res, 400, { ok: false, err: "ID game tidak valid" });
      if (!isFinite(prob) || prob < 0 || prob > 100) return send(res, 400, { ok: false, err: "Probabilitas harus 0-100" });
      DB.games[gid] = prob; save("games");
      return send(res, 200, { ok: true, games: DB.games });
    }

    send(res, 404, { ok: false, err: "API tidak ditemukan" });
  });
});

server.listen(PORT, function () {
  console.log("Jackpot Odyssey server jalan di http://localhost:" + PORT);
  console.log("Admin password default: admin123");
});
