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

## Struktur asset

- `assets/lobby/` — art lobby (kabinet, banner, koin, icon)
- `assets/game/<id>/` — per game: cabinet, s1..s5 (simbol), s6 (logo)
- `assets/sfx/` · `assets/anim/` — suara & animasi (spin button dll)
- `assets/ui/` — ikon UI
- `machines.js` — daftar 85 game (di-generate dari `tools/build_all_games.py`)

## Catatan

- `data/` tidak ikut ke repo — server membuat otomatis saat pertama jalan
- Admin default: password `admin123` (ganti di `data/admin.json` setelah server pertama jalan)
- Saldo akun baru default 30.000.000 koin (demo)
