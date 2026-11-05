/* Jackpot Odyssey — landscape build. Logika di slot.js, daftar game di machines.js */
(function () {
  var S = window.SLOT;
  var $ = function (id) { return document.getElementById(id); };

  var BETS = [200, 1000, 5000, 25000, 100000, 500000, 1000000, 2000000];
  var MACHINES = window.MACHINES || ["1175"];
  var PACKS = [
    { amt: 25000000, label: "25 JT", hot: false },
    { amt: 100000000, label: "100 JT", hot: true },
    { amt: 250000000, label: "250 JT", hot: false },
    { amt: 1000000000, label: "1 M", hot: false }
  ];
  var EXTRA = 9;
  var AUTO_MAX = 25;

  var state = {
    bal: Number(localStorage.getItem("jo5.bal") || 30000000),
    bet: Number(localStorage.getItem("jo5.bet") || 25000),
    win: 0,
    fast: localStorage.getItem("jo5.fast") === "1",
    machine: localStorage.getItem("jo5.machine") || MACHINES[0],
    busy: false,
    auto: 0,
    autoTimer: 0
  };
  if (BETS.indexOf(state.bet) < 0) state.bet = 25000; // bet lama di luar ladder → default

  /* ---------------- fitur: mail/quest/misi/event/vip/daily ---------------- */
  var TODAY = new Date().toISOString().slice(0, 10);
  var SAVE = {
    days: JSON.parse(localStorage.getItem("jo5.days") || "[]"),
    vip: Number(localStorage.getItem("jo5.vip") || 0),
    vipLast: localStorage.getItem("jo5.vipLast") || "",
    mail: JSON.parse(localStorage.getItem("jo5.mail") || "[]"),
    name: localStorage.getItem("jo5.name") || "",
    quest: JSON.parse(localStorage.getItem("jo5.quest") || "{}"),
    event: localStorage.getItem("jo5.event") || "",
    mis: JSON.parse(localStorage.getItem("jo5.mis") || "{}")
  };
  if (!SAVE.quest.s) SAVE.quest.s = 0;
  if (!SAVE.quest.w) SAVE.quest.w = 0;
  if (!SAVE.quest.m) SAVE.quest.m = [];
  if (!SAVE.quest.c) SAVE.quest.c = {};
  if (SAVE.mis.d !== TODAY) { SAVE.mis = { d: TODAY, spin: 0, win: 0, daily: false, c: {} }; saveAll(); }
  function saveAll() {
    localStorage.setItem("jo5.days", JSON.stringify(SAVE.days));
    localStorage.setItem("jo5.vip", SAVE.vip);
    localStorage.setItem("jo5.vipLast", SAVE.vipLast);
    localStorage.setItem("jo5.mail", JSON.stringify(SAVE.mail));
    localStorage.setItem("jo5.name", SAVE.name);
    localStorage.setItem("jo5.quest", JSON.stringify(SAVE.quest));
    localStorage.setItem("jo5.event", SAVE.event);
    localStorage.setItem("jo5.mis", JSON.stringify(SAVE.mis));
  }

  var DAILY_REWARDS = [10000, 15000, 20000, 30000, 40000, 50000, 75000];
  var QUESTS = [
    { id: "s", title: "Mainkan 25 spin", need: 25, get: function () { return SAVE.quest.s; }, reward: 100000 },
    { id: "w", title: "Kumpulkan kemenangan 10 JT", need: 10000000, get: function () { return SAVE.quest.w; }, reward: 250000 },
    { id: "m", title: "Buka 8 mesin berbeda", need: 8, get: function () { return SAVE.quest.m.length; }, reward: 50000 }
  ];
  var MISSIONS = [
    { id: "spin", title: "Spin 3x hari ini", need: 3, get: function () { return SAVE.mis.spin; }, reward: 25000 },
    { id: "win", title: "Menang 1x hari ini", need: 1, get: function () { return SAVE.mis.win; }, reward: 25000 },
    { id: "daily", title: "Klaim bonus harian", need: 1, get: function () { return SAVE.mis.daily ? 1 : 0; }, reward: 25000 }
  ];
  var MAILS = [
    { id: 1, t: "Selamat datang!", d: "Bonus sambutan untuk pemain baru", r: 5000000 },
    { id: 2, t: "Hadiah harian", d: "Koin gratis tiap hari untukmu", r: 1500000 },
    { id: 3, t: "Bonus event", d: "Event Monopoly sedang berlangsung", r: 25000000, g: true },
    { id: 4, t: "Pesan admin", d: "Terima kasih sudah bermain!", r: 500000 }
  ];
  var VIP_RANKS = [0, 1500, 5000, 15000];
  var DEP = { amt: 100000000, bank: "BCA" };

  /* ---------------- server / auth ---------------- */
  var API = {
    tok: localStorage.getItem("jo5.tok") || "",
    me: null,
    call: async function (url, body, admin) {
      var h = {};
      if (body) h["Content-Type"] = "application/json";
      h["X-Token"] = admin ? ADM.tok : API.tok;
      var r = await fetch(url, { method: body ? "POST" : "GET", headers: h, body: body ? JSON.stringify(body) : undefined });
      return r.json();
    }
  };
  var ADM = { tok: "" };
  var MAILCACHE = [];
  var lastSyncAt = 0;

  /* probabilitas menang per game (diatur admin, dipakai server saat spin) */
  var PROBS = {};

  function applyUser(u) {
    state.bal = u.bal;
    SAVE.days = u.days || [];
    SAVE.vip = u.vip || 0;
    SAVE.vipLast = u.vipLast || "";
    SAVE.name = u.nick || "";
    SAVE.quest = u.quest || SAVE.quest;
    SAVE.mis = u.mis || SAVE.mis;
    SAVE.mail = (u.mailRead || []).slice();
    saveAll();
    paint(); paintDaily(); paintVip(); paintName(); paintMailBadge();
  }
  function pollMe() {
    if (!API.me) return;
    API.call("/api/games").then(function (r) { if (r.ok) PROBS = r.games || {}; });
    API.call("/api/me").then(function (r) {
      if (!r.ok) return;
      API.me = r.user;
      if (!state.busy && Date.now() - lastSyncAt > 4000 && r.user.bal !== state.bal) {
        state.bal = r.user.bal; paint();
      }
      SAVE.vip = r.user.vip; SAVE.vipLast = r.user.vipLast;
      SAVE.days = r.user.days || [];
      SAVE.mis = r.user.mis; SAVE.quest = r.user.quest;
      SAVE.mail = (r.user.mailRead || []).slice();
      saveAll();
      paintMailBadge();
    });
  }

  function renderMail() {
    var box = $("mlist");
    if (!box) return;
    if (!API.me) { box.innerHTML = ""; return; }
    box.innerHTML = '<div class="ver">Memuat pesan…</div>';
    API.call("/api/mails").then(function (r) {
      if (!r.ok) { box.innerHTML = '<div class="ver">Gagal memuat pesan</div>'; return; }
      MAILCACHE = r.mails;
      SAVE.mail = r.mails.filter(function (m) { return m.read; }).map(function (m) { return m.id; });
      box.innerHTML = r.mails.length ? r.mails.map(function (m) {
        return '<div class="mrow' + (m.read ? ' done' : '') + '">' +
          '<img class="mico" src="assets/lobby/coin.png" alt="">' +
          '<span class="mt"><b>' + m.title + '</b><span>' + m.body + '</span></span>' +
          (m.reward ? '<span class="mr">' + fmt(m.reward) + '</span>' : '') +
          '<button class="mini ' + (m.read ? '' : 'buy') + '" data-mail="' + m.id + '"' + (m.read ? ' disabled' : '') + '>' + (m.read ? 'SUDAH' : 'KLAIM') + '</button>' +
          '</div>';
      }).join("") : '<div class="ver">Kotak masuk kosong</div>';
      paintMailBadge();
    });
  }
  function paintMailBadge() {
    var n = MAILCACHE.filter(function (m) { return !m.read; }).length;
    ["mailbadge", "mailbadge2"].forEach(function (id) {
      var b = $(id);
      if (b) { b.textContent = n; b.style.display = n ? "" : "none"; }
    });
  }
  function renderList(boxId, list, claimed, attr) {
    var box = $(boxId);
    if (!box) return;
    box.innerHTML = list.map(function (q) {
      var cur = Math.min(q.get(), q.need);
      var done = !!claimed[q.id];
      return '<div class="qrow' + (done ? ' done' : '') + '">' +
        '<span class="qt">' + q.title + '<em>' + fmt(cur) + ' / ' + fmt(q.need) + '</em></span>' +
        '<span class="qbar"><i style="width:' + Math.round(cur / q.need * 100) + '%"></i></span>' +
        '<span class="qr">+' + fmt(q.reward) + '</span>' +
        '<button class="mini ' + (done ? '' : 'buy') + '" ' + attr + '="' + q.id + '"' + (done ? ' disabled' : '') + '>' + (done ? 'SUDAH' : 'KLAIM') + '</button>' +
        '</div>';
    }).join("");
  }
  function renderQuests() { renderList("qlist", QUESTS, SAVE.quest.c, "data-q"); }
  function renderMissions() { renderList("missionlist", MISSIONS, SAVE.mis.c, "data-m"); }

  function vipRank() {
    var r = 0;
    for (var i = 0; i < VIP_RANKS.length; i++) if (SAVE.vip >= VIP_RANKS[i]) r = i;
    return r;
  }
  function paintVip() {
    var r = vipRank();
    var next = VIP_RANKS[Math.min(r + 1, VIP_RANKS.length - 1)];
    var pct = r >= VIP_RANKS.length - 1 ? 100 : Math.min(100, Math.round((SAVE.vip - VIP_RANKS[r]) / (next - VIP_RANKS[r]) * 100));
    if ($("vip-fill")) $("vip-fill").style.width = pct + "%";
    if ($("vip-pct")) $("vip-pct").textContent = pct + "%";
    if ($("vip-rank")) $("vip-rank").textContent = r + 1;
    if ($("vip-pts")) $("vip-pts").textContent = fmt(SAVE.vip);
    if ($("vip-pts2")) $("vip-pts2").textContent = fmt(SAVE.vip);
    var b = document.querySelector('[data-act="vipclaim"]');
    if (b) {
      var amt = 50000 + 25000 * r;
      if (SAVE.vipLast === TODAY) { b.textContent = "SUDAH DIKLAIM"; b.disabled = true; }
      else { b.textContent = "KLAIM +" + fmt(amt); b.disabled = false; }
    }
  }
  function paintDaily() {
    var d = document.querySelectorAll(".dday");
    var n = SAVE.days.length;
    for (var i = 0; i < d.length; i++) {
      var day = Number(d[i].getAttribute("data-day"));
      if (day <= n) {
        d[i].classList.add("done");
        d[i].classList.remove("today");
        if (!d[i].querySelector(".chk")) {
          var c = document.createElement("span");
          c.className = "chk";
          c.textContent = "\u2713";
          d[i].appendChild(c);
        }
      } else if (day === n + 1) {
        d[i].classList.add("today");
      }
    }
    if ($("reward-days")) $("reward-days").textContent = n + "/30";
  }
  function claimDay(day) {
    var n = SAVE.days.length;
    if (day !== n + 1) { toast("Klaim dulu hari ke-" + (n + 1)); return; }
    API.call("/api/claim", { kind: "daily", id: day }).then(function (r) {
      if (!r.ok) { toast(r.err || "Gagal klaim"); return; }
      state.bal = r.bal; paint(); winFx(r.amt); sfx("bigwin");
      toast("Bonus hari ke-" + day + ": +" + fmt(r.amt));
      if (r.user) applyUser(r.user);
      paintDaily();
    });
  }
  function paintName() {
    var p = $("pname");
    if (p) p.textContent = SAVE.name ? SAVE.name.toUpperCase() : "MY PROFILE";
    var lb = document.querySelector('[data-act="login"] b');
    if (lb) lb.textContent = SAVE.name ? SAVE.name.toUpperCase().slice(0, 8) : "LOGIN";
  }

  /* ---------------- audio ---------------- */
  var SFX = {};
  var bgm = null;
  var muted = localStorage.getItem("jo5.muted") === "1";

  function makeSfx(name, vol) {
    var a = new Audio("assets/sfx/" + name + ".mp3");
    a.volume = vol;
    a.preload = "auto";
    SFX[name] = a;
    return a;
  }
  function sfx(name) {
    if (muted || !SFX[name]) return;
    var a = SFX[name].cloneNode();
    a.volume = SFX[name].volume;
    a.play().catch(function () {});
  }
  function startBgm() {
    if (!bgm) {
      bgm = new Audio("assets/sfx/bgm_base.mp3");
      bgm.loop = true;
      bgm.volume = 0.32;
    }
    if (!muted && bgm.paused) bgm.play().catch(function () {});
  }
  function setMuted(m) {
    muted = m;
    localStorage.setItem("jo5.muted", m ? "1" : "0");
    if (bgm) { if (m) bgm.pause(); else bgm.play().catch(function () {}); }
    ["mute", "mute2"].forEach(function (id) {
      var b = $(id);
      if (b) b.classList.toggle("off", m);
    });
    toast(m ? "Suara mati" : "Suara nyala");
  }

  function fmt(n) { return Math.round(n).toLocaleString("id-ID"); }
  function paint() {
    $("bal").textContent = fmt(state.bal);
    $("bal-h").textContent = fmt(state.bal);
    $("bet").textContent = fmt(state.bet);
    $("win").textContent = fmt(state.win);
    localStorage.setItem("jo5.bal", state.bal);
    localStorage.setItem("jo5.bet", state.bet);
  }
  function countUp(el, to) {
    var from = Number(String(el.textContent).replace(/\./g, "")) || 0;
    var t0 = 0;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / 600);
      el.textContent = fmt(from + (to - from) * p);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------------- stage ---------------- */
  function fit() {
    var W = 1200;
    var r = window.innerWidth / window.innerHeight;      // rasio layar
    var H = Math.max(540, Math.min(1200 / r, 780));       // tinggi adaptif: 540 (20:9) s/d 780 (4:3)
    var s = Math.min(window.innerWidth / W, window.innerHeight / H);
    $("stage").style.width = W + "px";
    $("stage").style.height = H + "px";
    $("stage").style.transform = "translate(-50%,-50%) scale(" + s + ")";
  }

  var toastT = 0;
  function toast(m) {
    var el = $("toast");
    el.textContent = m;
    el.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.classList.remove("show"); }, 1700);
  }

  function page(id) {
    ["vip", "daily", "gameslist"].forEach(function (k) { $(k).classList.toggle("show", k === id); });
  }

  function renderGames() {
    var box = $("ggrid");
    if (box.children.length) return;
    var list = window.GAMES || [];
    box.innerHTML = list.map(function (g, i) {
      return '<button class="gcard' + (g.id === state.machine ? ' on' : '') + '" data-machine="' + g.id +
        '" style="animation-delay:' + Math.min(i * 18, 500) + 'ms">' +
        (i < 3 ? '<img class="gnew" src="assets/lobby/new_badge.png" alt="">' : '') +
        '<img src="assets/game/' + g.id + '/cabinet.png" alt="" loading="lazy">' +
        (g.name ? '<span>' + g.name + '</span>' : '') + '</button>';
    }).join("");
  }

  function winFx(amount) {
    var fx = $("fx");
    var el = document.createElement("div");
    el.className = "floatwin";
    el.textContent = "+" + fmt(amount);
    fx.appendChild(el);
    for (var i = 0; i < 9; i++) {
      var c = document.createElement("img");
      c.className = "coinfx";
      c.src = "assets/lobby/coin.png";
      c.style.left = (30 + Math.random() * 40) + "%";
      c.style.top = (45 + Math.random() * 15) + "%";
      c.style.setProperty("--dx", Math.round((Math.random() - 0.5) * 320) + "px");
      c.style.setProperty("--dy", Math.round(-120 - Math.random() * 140) + "px");
      c.style.animationDelay = (Math.random() * 0.18).toFixed(2) + "s";
      fx.appendChild(c);
      (function (node) { setTimeout(function () { node.remove(); }, 1500); })(c);
    }
    setTimeout(function () { el.remove(); }, 1600);
    if (amount >= state.bet * 20) {
      $("stage").classList.add("shake");
      setTimeout(function () { $("stage").classList.remove("shake"); }, 460);
    }
  }

  function show(id) {
    ["lobby", "slot"].forEach(function (k) { $(k).classList.toggle("active", k === id); });
    if (id === "slot") {
      layout(); idle();
      requestAnimationFrame(function () { layout(); idle(); });
    }
  }

  /* ---------------- reels ---------------- */
  function cellH() {
    return parseFloat(getComputedStyle($("reels")).getPropertyValue("--cell")) || 74;
  }
  function layout() {
    var w = $("reels").clientWidth || 500;
    var c = Math.max(48, Math.min(92, Math.floor((w - 16) / 5)));
    $("reels").style.setProperty("--cell", c + "px");
  }
  function hasGameArt(id) {
    var list = window.GAMES || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return true;
    return false;
  }
  function symUrl(id) {
    return (hasGameArt(state.machine) ? "assets/game/" + state.machine + "/" : "assets/sym/") + id + ".png";
  }
  function buildShell() {
    var box = $("reels");
    if (box.children.length) return;
    for (var i = 0; i < S.REELS; i++) {
      var r = document.createElement("div");
      r.className = "reel";
      box.appendChild(r);
    }
  }
  function makeStrip(col, finals) {
    var ch = cellH();
    var px = Math.round(ch * 0.84);
    var ids = [];
    for (var i = 0; i < EXTRA; i++) ids.push(S.pick());
    ids = ids.concat(finals);
    var strip = document.createElement("div");
    strip.className = "strip";
    strip.innerHTML = ids.map(function (id) {
      return '<div class="cell" style="height:' + ch + 'px"><img src="' + symUrl(id) +
        '" style="width:' + px + 'px;height:' + px + 'px" alt=""></div>';
    }).join("");
    col.innerHTML = "";
    col.appendChild(strip);
    return strip;
  }
  function idle() {
    buildShell();
    var cols = $("reels").children;
    for (var i = 0; i < cols.length; i++) {
      var s = makeStrip(cols[i], [S.pick(), S.pick(), S.pick()]);
      s.style.transform = "translateY(-" + EXTRA * cellH() + "px)";
    }
  }
  function clearWins() {
    var w = document.querySelectorAll(".cell.win");
    for (var i = 0; i < w.length; i++) w[i].classList.remove("win");
  }
  function markWins(wins) {
    var cols = $("reels").children;
    wins.forEach(function (w) {
      w.cells.forEach(function (cr) {
        var strip = cols[cr[0]].firstChild;
        var cell = strip && strip.children[EXTRA + cr[1]];
        if (cell) cell.classList.add("win");
      });
    });
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function spin() {
    if (state.busy) return;
    state.busy = true;
    $("spin").disabled = true;
    var res;
    try { res = await API.call("/api/spin", { machine: state.machine, bet: state.bet }); }
    catch (e) { state.busy = false; $("spin").disabled = false; toast("Koneksi gagal"); return; }
    if (!res.ok) { state.busy = false; $("spin").disabled = false; toast(res.err || "Spin gagal"); return; }
    state.bal = res.bal;
    SAVE.quest.s++;
    SAVE.mis.spin++;
    SAVE.vip += 12;
    clearWins();
    state.win = 0;
    paint();
    sfx("board_click");

    var grid = res.grid;
    var cols = $("reels").children;
    var strips = [];
    for (var i = 0; i < cols.length; i++) strips.push(makeStrip(cols[i], grid[i]));
    var h = cellH();
    var base = state.fast ? 240 : 600, gap = state.fast ? 50 : 110;
    await wait(16);
    strips.forEach(function (s, i) {
      s.style.transition = "transform " + (base + i * gap) + "ms cubic-bezier(.16,.84,.22,1)";
      s.style.transform = "translateY(-" + EXTRA * h + "px)";
    });
    for (var k = 0; k < 5; k++) {
      setTimeout(function () { sfx("auto_spin"); }, base + k * gap);
    }
    await wait(base + 4 * gap + 60);

    var wins = S.evalLines(grid);
    if (wins.length) {
      var total = res.total;
      markWins(wins);
      state.win = total;
      paint();
      countUp($("win"), total);
      sfx("bigwin");
      winFx(total);
      SAVE.quest.w += total;
      SAVE.mis.win = 1;
      [].forEach.call(document.querySelectorAll(".cell.win img"), function (im) {
        im.parentNode.classList.add("pop");
        setTimeout(function () { im.parentNode.classList.remove("pop"); }, 320);
      });
      var five = wins.some(function (w) { return w.count === 5; });
      if (five || Math.random() < 0.02) {
        var amt = total * (five ? 5 : 3);
        $("jp-amt").textContent = fmt(amt);
        $("jackpot").classList.add("show");
        sfx("jackpot_grand");
        state.auto = 0;
        paintAuto();
      }
    }
    saveAll();
    API.call("/api/misprog", { spin: 1, win: wins.length ? 1 : 0, machine: state.machine });
    state.busy = false;
    $("spin").disabled = false;

    if (state.auto > 0) {
      state.auto--;
      paintAuto();
      if (state.auto > 0) state.autoTimer = setTimeout(spin, state.fast ? 500 : 900);
      else toast("Autospin selesai");
    }
  }

  function paintAuto() {
    var b = $("auto");
    if (!b) return;
    b.classList.toggle("on", state.auto > 0);
    var n = b.querySelector("b");
    if (n) n.textContent = state.auto > 0 ? state.auto : "AUTO";
  }

  function toggleAuto() {
    if (state.auto > 0) {
      state.auto = 0;
      clearTimeout(state.autoTimer);
      toast("Autospin berhenti");
    } else {
      state.auto = AUTO_MAX;
      sfx("auto_spin");
      toast("Autospin " + AUTO_MAX + "x");
      if (!state.busy) spin();
    }
    paintAuto();
  }

  /* ---------------- init ---------------- */
  function init() {
    fit();
    window.addEventListener("resize", fit);
    paint();
    layout();
    idle();
    addSparkles();
    show("lobby");
    makeSfx("board_click", 0.7);
    makeSfx("auto_spin", 0.5);
    makeSfx("bigwin", 0.85);
    makeSfx("jackpot_grand", 0.9);
    makeSfx("jackpot_major", 0.85);
    paintAuto();
    ["mute", "mute2"].forEach(function (id) {
      var b = $(id);
      if (b) b.classList.toggle("off", muted);
    });

    $("packs").innerHTML = PACKS.map(function (p, i) {
      return '<div class="pack">' + (p.hot ? '<span class="hot">SALE</span>' : '') +
        '<img src="assets/lobby/coin.png" alt="">' +
        '<span class="amt num">' + p.label + '</span>' +
        '<button class="mini buy" data-pack="' + i + '">BELI</button></div>';
    }).join("");

    $("spin").onclick = spin;
    $("auto").onclick = toggleAuto;
    ["mute", "mute2"].forEach(function (id) {
      var b = $(id);
      if (b) b.onclick = function () { setMuted(!muted); };
    });
    $("plus").onclick = function () {
      var i = BETS.indexOf(state.bet); state.bet = BETS[(i + 1) % BETS.length]; paint();
    };
    $("minus").onclick = function () {
      var i = BETS.indexOf(state.bet); state.bet = BETS[(i - 1 + BETS.length) % BETS.length]; paint();
    };

    document.addEventListener("keydown", function (e) {
      if (e.code === "Space" && $("slot").classList.contains("active")) {
        e.preventDefault();
        spin();
      }
    });

    document.addEventListener("click", function (e) {
      startBgm();
      var card = e.target.closest(".gcard");
      if (card) {
        $("gameslist").classList.remove("show");
        openMachine(card.getAttribute("data-machine"));
        return;
      }
      var pane = e.target.closest(".pane");
      if (pane) { openMachine(pane.getAttribute("data-machine")); $("profile").classList.remove("show"); return; }
      var pack = e.target.closest("[data-pack]");
      if (pack) {
        var pi2 = Number(pack.getAttribute("data-pack"));
        API.call("/api/buypack", { i: pi2 }).then(function (r) {
          if (!r.ok) { toast(r.err || "Gagal pesan paket"); return; }
          toast("Paket dipesan! Menunggu persetujuan admin");
        });
        return;
      }
      var mel = e.target.closest("[data-mel]");
      if (mel) {
        var mn = mel.getAttribute("data-mel");
        if (mn === "bgm_base") { startBgm(); toast("BGM diputar"); }
        else { sfx(mn); toast("Jingle diputar"); }
        return;
      }
      var mb = e.target.closest("[data-mail]");
      if (mb) {
        var mid = mb.getAttribute("data-mail");
        API.call("/api/claim", { kind: "mail", id: mid }).then(function (r) {
          if (!r.ok) { toast(r.err || "Gagal klaim"); return; }
          state.bal = r.bal; paint(); winFx(r.amt); sfx("bigwin");
          toast("Koin masuk +" + fmt(r.amt));
          if (r.user) applyUser(r.user);
          renderMail();
        });
        return;
      }
      var qb = e.target.closest("[data-q]");
      if (qb) {
        var qid = qb.getAttribute("data-q");
        API.call("/api/claim", { kind: "quest", id: qid }).then(function (r) {
          if (!r.ok) { toast(r.err || "Gagal klaim"); return; }
          state.bal = r.bal; paint(); winFx(r.amt); sfx("bigwin");
          toast("Quest selesai +" + fmt(r.amt));
          if (r.user) applyUser(r.user);
          renderQuests();
        });
        return;
      }
      var ms = e.target.closest("[data-m]");
      if (ms) {
        var mid2 = ms.getAttribute("data-m");
        API.call("/api/claim", { kind: "mission", id: mid2 }).then(function (r) {
          if (!r.ok) { toast(r.err || "Gagal klaim"); return; }
          state.bal = r.bal; paint(); winFx(r.amt); sfx("bigwin");
          toast("Misi selesai +" + fmt(r.amt));
          if (r.user) applyUser(r.user);
          renderMissions();
        });
        return;
      }
      var depB = e.target.closest("[data-dep]");
      if (depB) {
        DEP.amt = Number(depB.getAttribute("data-dep"));
        var deps = document.querySelectorAll("[data-dep]");
        for (var di = 0; di < deps.length; di++) deps[di].classList.toggle("on", deps[di] === depB);
        if ($("dep-sum")) $("dep-sum").textContent = fmt(DEP.amt);
        sfx("board_click");
        return;
      }
      var bankB = e.target.closest("[data-bank]");
      if (bankB) {
        DEP.bank = bankB.getAttribute("data-bank");
        var banks = document.querySelectorAll("[data-bank]");
        for (var bi = 0; bi < banks.length; bi++) banks[bi].classList.toggle("on", banks[bi] === bankB);
        sfx("board_click");
        return;
      }
      var wbankB = e.target.closest("[data-wbank]");
      if (wbankB) {
        var wbanks = document.querySelectorAll("[data-wbank]");
        for (var wi = 0; wi < wbanks.length; wi++) wbanks[wi].classList.toggle("on", wbanks[wi] === wbankB);
        sfx("board_click");
        return;
      }
      var wdB = e.target.closest("[data-wd]");
      if (wdB) {
        var pct = Number(wdB.getAttribute("data-wd"));
        $("wd-amt").value = Math.floor(state.bal * pct / 100);
        sfx("board_click");
        return;
      }
      var dday = e.target.closest(".dday");
      if (dday) { claimDay(Number(dday.getAttribute("data-day"))); return; }
      var rs = e.target.closest("#rate span");
      if (rs) {
        var stars = document.querySelectorAll("#rate span");
        var idx = 0;
        for (var si = 0; si < stars.length; si++) if (stars[si] === rs) idx = si;
        for (var sj = 0; sj < stars.length; sj++) stars[sj].classList.toggle("on", sj <= idx);
        sfx("jackpot_major");
        toast("Terima kasih atas rating " + (idx + 1) + " bintang!");
        return;
      }
      var b = e.target.closest("[data-act]");
      if (!b) return;
      var a = b.getAttribute("data-act");
      sfx("board_click");
      if (a === "buy" || a === "sale") $("store").classList.add("show");
      else if (a === "settings") $("settings").classList.add("show");
      else if (a === "close") {
        var wasAdmin = $("adminpop").classList.contains("show");
        ["store", "settings", "vip", "daily", "gameslist", "profile",
          "notice", "mailpop", "loginpop", "questpop", "missionpop",
          "melodypop", "eventpop", "contactpop", "deppop", "wdpop", "adminpop", "jackpot"].forEach(function (id) {
          $(id).classList.remove("show");
        });
        if (wasAdmin) location.hash = "#/";
      }
      else if (a === "lgclose") { $("lgmodal").classList.remove("show"); location.hash = "#/"; }
      else if (a === "back") { state.auto = 0; paintAuto(); show("lobby"); }
      else if (a === "jackpot") {
        $("jp-amt").textContent = fmt(state.bet * 500);
        $("jackpot").classList.add("show");
      }
      else if (a === "maxbet") {
        state.bet = BETS[BETS.length - 1]; paint(); toast("Taruhan maksimum");
      }
      else if (a === "fb") $("loginpop").classList.add("show");
      else if (a === "login") { $("profile").classList.toggle("show"); paintName(); }
      else if (a === "mail") { renderMail(); $("mailpop").classList.add("show"); $("profile").classList.remove("show"); }
      else if (a === "vip") { paintVip(); page("vip"); }
      else if (a === "collect") { paintDaily(); page("daily"); }
      else if (a === "profile") $("profile").classList.toggle("show");
      else if (a === "allgames") { renderGames(); page("gameslist"); }
      else if (a === "contact") { $("contactpop").classList.add("show"); $("profile").classList.remove("show"); }
      else if (a === "offer") {
        API.call("/api/claim", { kind: "offer" }).then(function (r) {
          if (!r.ok) { toast(r.err || "Gagal klaim"); return; }
          state.bal = r.bal; paint(); winFx(r.amt); sfx("bigwin");
          toast("Special offer +" + fmt(r.amt));
          if (r.user) applyUser(r.user);
        });
      }
      else if (a === "mission") { renderMissions(); $("missionpop").classList.add("show"); }
      else if (a === "quests") { renderQuests(); $("questpop").classList.add("show"); }
      else if (a === "melody") $("melodypop").classList.add("show");
      else if (a === "event") $("eventpop").classList.add("show");
      else if (a === "notice") $("notice").classList.add("show");
      else if (a === "deposit") { if ($("dep-sum")) $("dep-sum").textContent = fmt(DEP.amt); $("deppop").classList.add("show"); }
      else if (a === "withdraw") { $("wd-bal").textContent = fmt(state.bal); $("wd-amt").value = ""; $("wdpop").classList.add("show"); }
      else if (a === "evclaim") {
        API.call("/api/claim", { kind: "event" }).then(function (r) {
          if (!r.ok) { toast(r.err || "Gagal klaim"); return; }
          state.bal = r.bal; paint();
          winFx(r.amt); sfx("jackpot_grand");
          toast("Hadiah event +" + fmt(r.amt));
          if (r.user) applyUser(r.user);
        });
      }
      else if (a === "vipclaim") {
        API.call("/api/claim", { kind: "vip" }).then(function (r) {
          if (!r.ok) { toast(r.err || "Gagal klaim"); return; }
          state.bal = r.bal; paint(); winFx(r.amt); sfx("jackpot_major");
          toast("VIP reward +" + fmt(r.amt));
          if (r.user) applyUser(r.user);
          paintVip();
        });
      }
    });

    $("opt-fast").checked = state.fast;
    $("opt-fast").onchange = function () {
      state.fast = this.checked;
      localStorage.setItem("jo5.fast", state.fast ? "1" : "0");
      toast(this.checked ? "Spin cepat" : "Spin normal");
    };
    $("opt-sound").checked = !muted;
    $("opt-sound").onchange = function () { setMuted(!this.checked); };
    $("opt-reset").onclick = function () {
      state.bet = 25000; state.win = 0; paint();
      toast("Taruhan direset ke default");
    };

    renderMail();
    paintDaily();
    paintVip();
    paintName();

    $("do-login").onclick = function () {
      var v = $("nick").value.trim();
      if (!v) { toast("Isi nama dulu"); return; }
      SAVE.name = v; saveAll();
      $("loginpop").classList.remove("show");
      paintName();
      sfx("jackpot_major");
      toast("Selamat datang, " + v + "!");
    };
    $("nick").addEventListener("keydown", function (e) {
      if (e.key === "Enter") $("do-login").click();
    });

    $("do-deposit").onclick = function () {
      var custom = Number(String($("dep-custom").value).replace(/[^0-9]/g, "")) || 0;
      var amt = custom >= 1000000 ? custom : DEP.amt;
      API.call("/api/deposit", { amount: amt, bank: DEP.bank }).then(function (r) {
        if (!r.ok) { toast(r.err || "Gagal"); return; }
        $("deppop").classList.remove("show");
        $("dep-custom").value = "";
        sfx("jackpot_major");
        toast("Deposit " + DEP.bank + " " + fmt(amt) + " diajukan — tunggu approval admin");
      });
    };
    $("dep-custom").addEventListener("input", function () {
      var v = Number(String(this.value).replace(/[^0-9]/g, "")) || 0;
      var deps = document.querySelectorAll("[data-dep]");
      for (var di = 0; di < deps.length; di++) deps[di].classList.toggle("on", !v && deps[di].getAttribute("data-dep") == DEP.amt);
      if ($("dep-sum")) $("dep-sum").textContent = v ? fmt(v) : fmt(DEP.amt);
    });
    $("do-withdraw").onclick = function () {
      var amt = Number(String($("wd-amt").value).replace(/[^0-9]/g, "")) || 0;
      if (amt < 500000) { toast("Minimal withdraw 500 rb"); return; }
      if (amt > state.bal) { toast("Saldo tidak cukup"); return; }
      API.call("/api/withdraw", { amount: amt, bank: DEP.bank }).then(function (r) {
        if (!r.ok) { toast(r.err || "Gagal"); return; }
        state.bal = r.bal; paint();
        $("wdpop").classList.remove("show");
        var fx = $("fx"), el = document.createElement("div");
        el.className = "floatwin neg";
        el.textContent = "-" + fmt(amt);
        fx.appendChild(el);
        setTimeout(function () { el.remove(); }, 1600);
        sfx("jackpot_major");
        toast("Withdraw " + fmt(amt) + " diajukan — tunggu approval admin");
      });
    };
    $("wd-amt").addEventListener("keydown", function (e) {
      if (e.key === "Enter") $("do-withdraw").click();
    });

    $("opt-bgm").onchange = function () {
      if (this.checked) { if (!muted) startBgm(); }
      else if (bgm) bgm.pause();
    };
    $("vol").oninput = function () {
      if (bgm) bgm.volume = Number(this.value) / 100;
    };

    if (!sessionStorage.getItem("jo5.notice")) {
      sessionStorage.setItem("jo5.notice", "1");
    }

    /* ---------- landing / auth ---------- */
    function showLanding(v) { $("landing").classList.toggle("show", v); }
    function enterGame(u) {
      API.me = u;
      applyUser(u);
      showLanding(false);
      renderMail();
      paintName();
      if (!sessionStorage.getItem("jo5.notice")) {
        sessionStorage.setItem("jo5.notice", "1");
        $("notice").classList.add("show");
      }
      sfx("jackpot_major");
      toast("Selamat datang, " + (u.nick || u.user) + "!");
    }
    $("lg-do-login").onclick = function () {
      var user = $("lg-user").value.trim(), pass = $("lg-pass").value;
      if (!user || !pass) { $("lg-err").textContent = "Isi username & password"; return; }
      $("lg-err").textContent = "";
      API.call("/api/login", { user: user, pass: pass }).then(function (r) {
        if (!r.ok) { $("lg-err").textContent = r.err; return; }
        API.tok = r.token; localStorage.setItem("jo5.tok", r.token);
        enterGame(r.user);
        location.hash = "#/";
      });
    };
    $("rg-do-register").onclick = function () {
      var user = $("rg-user").value.trim(), nick = $("rg-nick").value.trim(), pass = $("rg-pass").value;
      if (!user || !pass) { $("lg-err").textContent = "Isi username & password"; return; }
      $("lg-err").textContent = "";
      API.call("/api/register", { user: user, pass: pass, nick: nick }).then(function (r) {
        if (!r.ok) { $("lg-err").textContent = r.err; return; }
        API.tok = r.token; localStorage.setItem("jo5.tok", r.token);
        enterGame(r.user);
        location.hash = "#/";
      });
    };
    ["lg-user", "lg-pass", "rg-user", "rg-nick", "rg-pass"].forEach(function (id) {
      $(id).addEventListener("keydown", function (e) {
        if (e.key === "Enter") (id.indexOf("rg") === 0 ? $("rg-do-register") : $("lg-do-login")).click();
      });
    });
    function setLandingTab(t) {
      document.querySelectorAll("#landing .lg-tab").forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-lt") === t); });
      $("lg-login").style.display = t === "login" ? "" : "none";
      $("lg-register").style.display = t === "register" ? "" : "none";
      $("lg-err").textContent = "";
      $("lgmodal").classList.add("show");
    }
    document.addEventListener("click", function (e) {
      var lt = e.target.closest("[data-lt]");
      if (lt) {
        var t = lt.getAttribute("data-lt");
        setLandingTab(t);
        location.hash = "#/" + t;
      }
    });
    $("lg-admin").onclick = function () {
      $("landing").classList.remove("show");
      $("adminpop").classList.add("show");
      location.hash = "#/admin";
    };

    /* ---------- admin ---------- */
    function adminDash(r) {
      var s = r.stats;
      $("ad-stats").innerHTML =
        '<span>USER <b>' + s.users + '</b></span>' +
        '<span>TX PENDING <b>' + s.pending + '</b></span>' +
        '<span>TOTAL DEP OK <b>' + fmt(s.okDep) + '</b></span>';
      $("ad-users").innerHTML = '<table class="adtable"><tr><th>USER</th><th>NICK</th><th>SALDO</th><th>VIP</th><th>ST</th><th>AKSI</th></tr>' +
        r.users.map(function (u) {
          return '<tr><td>' + u.user + '</td><td>' + (u.nick || "-") + '</td><td>' + fmt(u.bal) + '</td><td>' + fmt(u.vip) + '</td><td>' +
            (u.status === "block" ? '<i class="stbl">BLOCK</i>' : '<i class="stok">OK</i>') + '</td><td class="adacts">' +
            '<button class="mini buy" data-adj="' + u.user + '" data-amt="100000000">+100JT</button>' +
            '<button class="mini sale" data-adj="' + u.user + '" data-amt="-50000000">-50JT</button>' +
            '<button class="mini" data-blk="' + u.user + '">' + (u.status === "block" ? "BUKA" : "BLOKIR") + '</button>' +
            '</td></tr>';
        }).join("") + '</table>';
      $("ad-txs").innerHTML = '<table class="adtable"><tr><th>JENIS</th><th>USER</th><th>JUMLAH</th><th>BANK</th><th>STATUS</th><th>AKSI</th></tr>' +
        r.txs.map(function (t) {
          return '<tr><td>' + (t.type === "dep" ? "DEPOSIT" : t.type === "buy" ? "BUY PACK" : "WITHDRAW") + '</td><td>' + t.user + '</td><td>' + fmt(t.amount) + '</td><td>' + (t.bank || "-") + '</td><td>' +
            (t.status === "ok" ? '<i class="stok">OK</i>' : t.status === "rej" ? '<i class="stbl">REJECT</i>' : '<i class="stpd">PENDING</i>') + '</td><td class="adacts">' +
            (t.status === "pending"
              ? '<button class="mini buy" data-ap="' + t.id + '">SETUJU</button><button class="mini sale" data-rj="' + t.id + '">TOLAK</button>'
              : "-") +
            '</td></tr>';
        }).join("") + '</table>';
      $("ad-m-target").innerHTML = '<option value="all">SEMUA USER</option>' + r.users.map(function (u) {
        return '<option value="' + u.user + '">' + u.user + '</option>';
      }).join("");
    }
    function adminLoad() {
      API.call("/api/admin/overview", null, true).then(function (r) {
        if (!r.ok) {
          toast("Sesi admin habis, login ulang");
          $("admin-login").style.display = "";
          $("admin-dash").style.display = "none";
          return;
        }
        adminDash(r);
      });
      API.call("/api/games").then(function (r) {
        if (r.ok) { PROBS = r.games || {}; renderAdminGames(PROBS); }
      });
    }
    function renderAdminGames(games) {
      var rows = window.GAMES.map(function (g) {
        var p = isFinite(Number(games[g.id])) ? Number(games[g.id]) : 40;
        return '<tr><td>' + (g.name || "-") + '</td><td>' + g.id + '</td>' +
          '<td><input class="adprob" data-gm="' + g.id + '" type="number" min="0" max="100" step="1" value="' + p + '"> %</td>' +
          '<td><button class="mini buy" data-gmsave="' + g.id + '">SIMPAN</button></td></tr>';
      }).join("");
      $("ad-games").innerHTML = '<table class="adtable"><tr><th>GAME</th><th>ID</th><th>PROB MENANG (%)</th><th></th></tr>' + rows + '</table>';
    }
    $("ad-do-login").onclick = function () {
      ADM.tok = "";
      API.call("/api/admin/login", { pass: $("ad-pass").value }).then(function (r) {
        if (!r.ok) { toast(r.err || "Password salah"); return; }
        ADM.tok = r.token;
        $("admin-login").style.display = "none";
        $("admin-dash").style.display = "";
        adminLoad();
      });
    };
    $("ad-logout").onclick = function () {
      ADM.tok = "";
      $("admin-login").style.display = "";
      $("admin-dash").style.display = "none";
      $("ad-pass").value = "";
      $("adminpop").classList.remove("show");
      if (!API.me) $("landing").classList.add("show");
      location.hash = "#/";
    };
    $("ad-m-send").onclick = function () {
      API.call("/api/admin/mail", {
        target: $("ad-m-target").value,
        title: $("ad-m-title").value,
        body: $("ad-m-body").value,
        reward: Number(String($("ad-m-reward").value).replace(/[^0-9]/g, "")) || 0
      }, true).then(function (r) {
        if (!r.ok) { toast(r.err); return; }
        toast("Mail terkirim!");
        $("ad-m-title").value = ""; $("ad-m-body").value = ""; $("ad-m-reward").value = "";
      });
    };
    document.addEventListener("click", function (e) {
      var ap = e.target.closest("[data-ap]");
      if (ap) {
        API.call("/api/admin/approve", { id: ap.getAttribute("data-ap") }, true).then(function (r) {
          if (r.ok) { toast("Transaksi disetujui"); adminLoad(); }
        });
        return;
      }
      var rj = e.target.closest("[data-rj]");
      if (rj) {
        API.call("/api/admin/reject", { id: rj.getAttribute("data-rj") }, true).then(function (r) {
          if (r.ok) { toast("Transaksi ditolak"); adminLoad(); }
        });
        return;
      }
      var adj = e.target.closest("[data-adj]");
      if (adj) {
        API.call("/api/admin/adjust", { user: adj.getAttribute("data-adj"), amount: Number(adj.getAttribute("data-amt")) }, true).then(function (r) {
          if (r.ok) { toast("Saldo user diupdate"); adminLoad(); }
        });
        return;
      }
      var blk = e.target.closest("[data-blk]");
      if (blk) {
        API.call("/api/admin/toggle", { user: blk.getAttribute("data-blk") }, true).then(function (r) {
          if (r.ok) { toast("Status user diubah"); adminLoad(); }
        });
        return;
      }
      var gs = e.target.closest("[data-gmsave]");
      if (gs) {
        var mid = gs.getAttribute("data-gmsave");
        var inp = document.querySelector('[data-gm="' + mid + '"]');
        var p = Number(inp ? inp.value : NaN);
        if (!isFinite(p) || p < 0 || p > 100) { toast("Probabilitas harus 0-100"); return; }
        API.call("/api/admin/setgame", { machine: mid, prob: p }, true).then(function (r) {
          if (r.ok) { PROBS[mid] = p; toast("Prob. " + (window.GAME_NAMES[mid] || mid) + " = " + p + "%"); }
        });
        return;
      }
      var atb = e.target.closest("[data-at]");
      if (atb) {
        var t = atb.getAttribute("data-at");
        document.querySelectorAll("[data-at]").forEach(function (x) { x.classList.toggle("on", x === atb); });
        ["users", "txs", "mail", "games"].forEach(function (k) { $("ad-" + k).style.display = k === t ? "" : "none"; });
      }
    });
    $("do-logout").onclick = function () {
      API.call("/api/logout", {}).then(function () {
        localStorage.removeItem("jo5.tok");
        localStorage.removeItem("jo5.name");
        localStorage.removeItem("jo5.bal");
        location.hash = "#/";
        location.reload();
      });
    };

    /* ---------- boot: wajib login + routing path ---------- */
    function route() {
      var h = (location.hash || "").replace(/\/+$/, "") || "#/";
      if (h === "#/login") { setLandingTab("login"); showLanding(true); return; }
      if (h === "#/register") { setLandingTab("register"); showLanding(true); return; }
      if (h === "#/admin") { $("landing").classList.remove("show"); $("adminpop").classList.add("show"); return; }
      $("lgmodal").classList.remove("show");
      if (API.me) { showLanding(false); show("lobby"); }
      else showLanding(true);
    }
    window.addEventListener("hashchange", route);
    /* mapping pathname → hash: /login, /register, /admin */
    var path = (location.pathname || "").replace(/\/+$/, "") || "/";
    if (!location.hash || location.hash === "#" || location.hash === "#/") {
      if (path === "/login" || path === "/register" || path === "/admin") {
        history.replaceState(null, "", path + "#/" + path.slice(1));
      }
    }
    if (API.tok) {
      API.call("/api/me").then(function (r) {
        if (r.ok) { enterGame(r.user); route(); }
        else { localStorage.removeItem("jo5.tok"); route(); }
      });
    } else route();

    setInterval(pollMe, 6000);
    API.call("/api/games").then(function (r) { if (r.ok) PROBS = r.games || {}; });

    var t = 23 * 3600 + 43 * 60 + 6;
    setInterval(function () {
      t = t > 0 ? t - 1 : 0;
      var hh = String(Math.floor(t / 3600)).padStart(2, "0");
      var mm = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
      var ss = String(t % 60).padStart(2, "0");
      var txt = hh + ":" + mm + ":" + ss;
      $("timer").textContent = txt;
      var t2 = $("timer2"); if (t2) t2.textContent = txt;
      var t3 = $("timer3"); if (t3) t3.textContent = txt;
    }, 1000);
  }

  function addSparkles() {
    var cab = document.querySelector(".cabinet");
    if (!cab || cab.querySelector(".sparkle")) return;
    var i, el;
    for (i = 0; i < 7; i++) {
      el = document.createElement("i");
      el.className = "sparkle";
      el.style.left = (8 + Math.random() * 84) + "%";
      el.style.bottom = (10 + Math.random() * 60) + "%";
      el.style.animationDelay = (Math.random() * 5).toFixed(2) + "s";
      el.style.animationDuration = (3.6 + Math.random() * 2.4).toFixed(2) + "s";
      cab.appendChild(el);
    }
    for (i = 0; i < 3; i++) {
      el = document.createElement("img");
      el.className = "coinfloat";
      el.src = "assets/lobby/coin.png";
      el.style.left = (18 + i * 28) + "%";
      el.style.bottom = "4%";
      el.style.animationDelay = (i * 1.4).toFixed(2) + "s";
      cab.appendChild(el);
    }
  }

  function openMachine(id) {
    state.machine = id;
    state.auto = 0;
    if (SAVE.quest.m.indexOf(id) < 0) { SAVE.quest.m.push(id); saveAll(); }
    paintAuto();
    localStorage.setItem("jo5.machine", id);
    var cab = $("game-cab");
    if (hasGameArt(id)) {
      cab.src = "assets/game/" + id + "/cabinet.png";
      $("game-bg").src = "assets/game/" + id + "/cabinet.png";
    } else {
      cab.src = "assets/machines/" + id + ".png";
      $("game-bg").src = "assets/lobby/bg.png";
    }
    var name = window.GAME_NAMES && window.GAME_NAMES[id];
    var nm = document.getElementById("game-name");
    if (name) {
      if (!nm) {
        nm = document.createElement("div");
        nm.id = "game-name";
        nm.className = "game-name";
        $("slot").appendChild(nm);
      }
      nm.textContent = name;
    } else if (nm) {
      nm.remove();
    }
    $("reels").innerHTML = "";
    show("slot");
  }

  window.__JO = {
    get bgm() { return bgm ? { paused: bgm.paused, t: Math.round(bgm.currentTime * 10) / 10, vol: bgm.volume } : null; },
    get muted() { return muted; },
    sfxLoaded: function () { return Object.keys(SFX); },
    winFx: function (n) { winFx(n || state.bet * 25); }
  };

  init();
})();
