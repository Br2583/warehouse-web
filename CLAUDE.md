@AGENTS.md
@BUGS.md

# Warehouse Manager — Project Context

## Stack
- Next.js 16.2.6, React 19, TypeScript, Tailwind v4
- Framer Motion, Lucide React, Recharts, EmailJS, Radix UI
- Backend: `https://storagemap-3.emergent.host` (external, not in this repo)
- Auth: Google OAuth via `https://auth.emergentagent.com`

## Architecture
- `lib/api.ts` — single BACKEND_URL (exported) + all API calls (get/post/put/delete)
- `lib/auth-context.tsx` — AuthProvider, useAuth hook
- `components/AppShell.tsx` — shows BottomNav on auth routes
- `components/Sidebar.tsx` — desktop only (hidden on mobile)
- `components/BottomNav.tsx` — mobile bottom nav (5 items)
- `proxy.ts` — checks portal_unlocked cookie, refreshes sliding 2h window (renamed from middleware.ts in Next.js 16)
- `app/api/portal/route.ts` — server-side portal code check with rate limiting

## Routes
| Route | Description |
|-------|-------------|
| `/` | Landing — video bg, portal access, typewriter |
| `/login` | Google OAuth / create company / join with invite code |
| `/dashboard` | Stats overview, inventory, production, quick actions |
| `/warehouses` | List 3 warehouses with volt counts |
| `/warehouses/[id]` | Map grid + list view, CRUD volts, photo lightbox |
| `/search` | Global search across all warehouses |
| `/production` | Work orders (Cleaning/Restoration/Delivery) |
| `/stats` | Analytics — status/job/warehouse/client breakdown |
| `/snapshots` | Daily snapshots, printable report, email via EmailJS |
| `/chat` | Team chat, polling every 10s |
| `/deleted` | Deleted volts — restore or permanent delete |
| `/profile` | User info, company, team members, change PIN |

## Security — Implemented
- Portal code in `.env.local` as `PORTAL_CODE` (server-only, never in browser bundle)
- `app/api/portal/route.ts` verifies server-side — 5 attempts max, 30s lockout per IP
- Middleware enforces 2-hour sliding inactivity timeout on `portal_unlocked` cookie
- Cookie set server-side: `SameSite=Lax` (Strict broke OAuth redirect), `Secure` in production
- Security headers in `next.config.ts`: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- EmailJS keys in `.env.local` with NEXT_PUBLIC_ prefix
- `api.delete` handles 204 No Content safely
- Photos limited to 5MB each with user error feedback

## .env.local
```
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_gxur23h
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=warehouse_report  <- verify this is the real template ID in EmailJS dashboard
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=I_NflBogOJ5lZnKiG
PORTAL_CODE=2019   <- change here anytime, restart server for it to take effect
```

## Data Model (Volt)
```
box_id, warehouse_id, row (A-J), column (1-8), level (1=lower / 2=upper), position
client_name, job_type (Fire/Water/Moving/Storage), content_type (Boxes/Furniture/Both)
room_location[], vault_status[] (Total Loss / Needs Cleaning / Ready to Go / Storage Only)
packer, photos[] (base64, max 6, 5MB each), estado/status (PENDING/READY/DELIVERED), comments
```

## Conventions
- UI label: "Volt" (never "Box"). "Vault Status" = condition tags on a volt.
- Responsive grids: always `grid-cols-1 md:grid-cols-N`, never bare `grid-cols-N`
- No console.log in production. No alert() to show invitation codes (they show inline).
- Design: bg-gray-50 base, blue-600 accent, rounded-2xl cards, border-gray-100

## Portal Code Runtime Change
- `data/portal-code.json` — written by `POST /api/portal/change-code`, gitignored
- `app/api/portal/route.ts` reads file first, falls back to `PORTAL_CODE` env var
- Change requires current code as verification; owner-only UI in `/profile`

## Deploy — Next Session
- **Railway** — plataforma elegida ($5/mes, subdominio gratis `xxx.up.railway.app`)
- Pasos: subir repo a GitHub → crear cuenta Railway → conectar repo → pegar variables de .env.local → listo
- `data/portal-code.json` necesita volumen persistente en Railway (configurar en settings)
- Build command: `npm run build` — Start command: `npm run start`
- Todas las variables de .env.local van en Railway → Variables panel

## Estado actual — Todo listo para producción
- Build limpio: `npx next build` sin warnings ni errores
- `middleware.ts` migrado a `proxy.ts` (Next.js 16 convention)
- Todos los `alert()` reemplazados por banners de error inline
- Todos los `console.error` eliminados de producción
- `alt` en todas las imágenes
- Mobile: landing, portal modal y login se ven bien en 375px
- SameSite=Lax en cookie (fix del loop infinito con Google OAuth)
- ngrok instalado en `C:\Users\PC\ngrok\ngrok.exe` para testing local

## PENDING — Next Session
1. **Desplegar en Railway** — usuario tiene $5, listo para hacerlo
2. **Verificar EmailJS template ID** — confirmar que `warehouse_report` es el ID real en el dashboard de EmailJS
