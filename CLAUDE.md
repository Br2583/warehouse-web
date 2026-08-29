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
- `proxy.ts` — (1) HTTP→HTTPS in prod, (2) guards `/admin-k9x2m7` via `admin_session` cookie, (3) 30-day inactivity timeout on protected routes via `wm_last_active` cookie (renamed from middleware.ts in Next.js 16)

## Routes
| Route | Description |
|-------|-------------|
| `/` | Landing — Claude Design redesign (Archivo font, warm palette, brand band) |
| `/login` | Google OAuth / create company / join with invite code |
| `/dashboard` | Stats overview, inventory, tasks, quick actions |
| `/warehouses` | List 3 warehouses with volt counts |
| `/warehouses/[id]` | Map grid + list view, CRUD volts, photo lightbox |
| `/search` | Global search across all warehouses |
| `/stats` | Analytics — status/job/warehouse/client breakdown |
| `/snapshots` | Daily snapshots, printable report, email via EmailJS |
| `/chat` | Team chat, polling every 10s |
| `/deleted` | Deleted volts — restore or permanent delete |
| `/profile` | User info, company, team members, change PIN |

## Security — Implemented
- **Multi-tenant isolation is enforced by PocketBase collection rules** (`company_id = @request.auth.company_id`) — the browser talks to PocketBase directly (`NEXT_PUBLIC_PB_URL` is public), so the rules ARE the boundary. Audited + verified 2026-08-29.
- `/admin-k9x2m7` guarded server-side in `proxy.ts` (admin_session cookie: SHA-256 + salt + timing-safe compare); each `/api/admin/*` route also checks `isAdminRequest`
- 30-day inactivity timeout on protected routes via `wm_last_active` cookie
- Cookie set server-side: `SameSite=Lax` (Strict broke OAuth redirect), `Secure` in production
- Filter injection guarded via `sf()` escape on every interpolated value
- Rate limiting (chat, email verify/reset, admin-login, join, notify)
- Security headers in `next.config.ts`: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- EmailJS keys in `.env.local` with NEXT_PUBLIC_ prefix
- `api.delete` handles 204 No Content safely
- Photos limited to 5MB each with user error feedback

## .env.local
```
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_gxur23h
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=warehouse_report  <- verify this is the real template ID in EmailJS dashboard
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=I_NflBogOJ5lZnKiG
# Server-only (no NEXT_PUBLIC): PB_ADMIN_EMAIL/PASSWORD, JWT_SECRET, ADMIN_SECRET,
# ADMIN_SESSION_SALT, BREVO_API_KEY, FIREBASE_SERVICE_ACCOUNT_JSON, R2_* (bucket warehouse-manager)
```

## Data Model (Volt)
```
box_id, warehouse_id, row (A-J), column (1-8), level (1=lower / 2=upper), position
client_name, job_type (Fire/Water/Moving/Storage), content_type (Boxes/Furniture/Both)
room_location[], vault_status[] (Total Loss / Needs Cleaning / Ready to Go / Storage Only)
packer, estado/status (PENDING/READY/DELIVERED), comments
photo_files[] (Cloudflare R2 via PocketBase S3, protected, max 6, ~2MB compressed, thumbs 300x300/100x100)
deleted_at/deleted_by (soft-delete: mark instead of destroy; keeps id/box_id/qr_token so the printed QR label survives a restore)
```
Photo URLs/tokens/thumbs are centralized in `lib/photo-url.ts`. Every vaults query
must filter `deleted_at=""` (or `!= ""` for the trash) — the main soft-delete risk.

## Conventions
- UI label: "Volt" (never "Box"). "Vault Status" = condition tags on a volt.
- Responsive grids: always `grid-cols-1 md:grid-cols-N`, never bare `grid-cols-N`
- No console.log in production. No alert() to show invitation codes (they show inline).
- Design: bg-gray-50 base, blue-600 accent, rounded-2xl cards, border-gray-100

## Deploy
- **Railway** auto-despliega en cada `git push origin main` (NO usar `railway up`)
- Backend PocketBase también en Railway; fotos en Cloudflare R2 (vía S3 de PocketBase)
- App Android (Capacitor) usa `server.url = managerwarehouse.cc` → los cambios web/backend NO requieren APK nueva
- Todas las variables de `.env.local` van en Railway → Variables panel

## Estado actual — En producción
- Desplegado en Railway (auto-deploy en cada push). Backend PocketBase + fotos R2 en vivo.
- Build limpio: `npx next build` y `tsc --noEmit` sin errores
- `proxy.ts` es la convención de middleware de Next.js 16
- 0 `console.log`/`alert()` en producción; `alt` en todas las imágenes
- SameSite=Lax en cookie (fix del loop infinito con Google OAuth)
- Auditoría de seguridad + bugs completa 2026-08-29: sin huecos ni bugs funcionales

## PENDING
- Menores (ver memoria `auditoria-completa-2026-08-29`): eslint `any` gradual, campo `users.avatar` sin usar
- Verificar EmailJS template ID `warehouse_report` en el dashboard de EmailJS
