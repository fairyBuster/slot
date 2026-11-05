# Jackpot Odyssey — Web Slot Game

Web build game slot Jackpot Odyssey (85 game: slot · fishing · plinko) — landscape, pakai art asli hasil rip dari APK.

## Menjalankan

```
node server.js
```

Buka http://localhost:8480 — selesai. Tanpa dependency (Node.js bawaan saja).

- **Server**: `server.js` (port 8480, JSON file DB di `data/`)
- **Client**: `index.html` + `app.js` + `style.css`
- **Mesin slot**: `slot.js` (dipakai bersama browser & server — spin dihitung server-side)

## Fitur

- Landing page gaya perusahaan: navbar, hero, game populer, keunggulan, footer
- Login / register / logout (password di-hash sha256 + salt)
- Admin panel di path `/admin` (approve deposit, kirim mail, atur probabilitas per game)
- Spin dihitung di server (tidak bisa curang saldo dari client)
- Autospin, MAX BET, win count-up, screen shake, kabinet ngambang, animasi koin
- VIP, Daily Bonus, Quest, Misi, Store (beli paket lewat admin), Settings
- Suara + toggle mute tersimpan
- Responsif: landing full mobile (rotate bebas, keyboard aman), stage game mengikuti layar

## Rute

| Path | Isi |
|---|---|
| `/` | Landing perusahaan |
| `/login` | Tab LOGIN |
| `/register` | Tab REGISTER |
| `/admin` | Admin panel |

## Deploy (Render.com — gratis)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/fairyBuster/slot)

Klik tombol di atas → login GitHub → Render baca `render.yaml` → app jalan otomatis di URL `https://jackpot-odyssey.onrender.com`.

- `PORT` otomatis di-set Render (`server.js` pakai `process.env.PORT || 8480`)
- Tanpa dependency, tanpa build step
- Catatan: disk free Render bersifat ephemeral — `data/` (user & transaksi) bisa reset saat redeploy. Untuk produksi serius: pakai persistent disk atau DB eksternal.

## Struktur

```
web4/
├── index.html        # halaman utama (landing + lobby + slot)
├── app.js            # logika client
├── style.css         # styling
├── server.js         # backend Node (API + file DB)
├── slot.js           # mesin slot (dipakai browser & server)
├── machines.js       # daftar 85 game
├── package.json      # metadata + start script
├── render.yaml       # blueprint deploy Render
├── start.bat         # shortcut jalan di Windows
├── assets/           # lobby, game/<id>/, sfx, anim, ui, spine
├── data/             # DB runtime (auto dibuat, tidak ikut repo)
└── spine-test/       # eksperimen animasi spine (tidak dipakai app)
```

## Catatan

- `data/` tidak ikut ke repo — server membuat otomatis saat pertama jalan
- Admin default: password `admin123` (ganti di `data/admin.json` setelah server pertama jalan)
- Saldo akun baru default 30.000.000 koin (demo)
