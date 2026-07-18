# Warehouse Manager — Bug & Polish Audit
# 184 issues catalogados — auditoría completa julio 2026 (actualizado 2026-07-16)
# 27 corregidos: B-7, CR-1..CR-9, NCR-1, NCR-2, A-1..A-11, NA-1 — Sesión 4 (2026-07-15)
# 22 corregidos: M-1..M-12, M-16, M-22, NM-2..NM-5, NM-7 + M-4 + M-2 — Sesión 6 (2026-07-16)
# +8 corregidos: M-15, M-18, M-19, M-23, M-32, M-36, M-37 + NM-6(ya estaba) — Sesión 6B (2026-07-16)
# +20 corregidos: M-3, M-24, M-25, M-26, M-27, M-28, M-29, M-30, M-31, M-33, M-34, M-35, NM-1, NM-8 + B-22, B-23 (admin locale+successId) — Sesión 7 (2026-07-16)
# +31 corregidos: B-1, B-2, B-5, B-6, B-8, B-9, B-10, B-11, B-12, B-13(N/A), B-14(ya ok), B-16, B-17, B-18, B-19, B-20, B-21, B-24(ya ok), B-25(pendiente), B-27, B-28, B-29, B-30, B-31, B-32, B-33, B-35, B-36, B-37, B-40..B-44, B-46, B-48..B-52, B-55 + NB-2(ok) — Sesión 8 (2026-07-16)
# +10 corregidos: B-3, B-4, B-15, B-25, B-38, B-39, B-45, B-47, B-54, B-13(ya ok) — Sesión 9 (2026-07-16)
#
# REGLAS para sesiones futuras:
# 1. Leer el issue COMPLETO antes de tocar cualquier archivo
# 2. Verificar que el fix no rompe otros archivos que usen el mismo campo/función
# 3. Hacer `npx next build` después de cada sesión — 0 errores antes de deploy
# 4. Marcar ✅ cuando esté resuelto con el commit hash
# 5. NO resolver bajos antes de resolver críticos y altos
# 6. Testear en dev local antes de `railway up`

---

## 🔴 CRÍTICOS (9) — Resolver primero, sesión 1

### CR-1 — QR scan siempre retorna "Vault not found" ✅ FIXED
**Archivo:** `app/scan/page.tsx` línea ~21  
**Problema:** El QR code en `vault/[id]/print/page.tsx` encoda el **PocketBase record ID** en la URL. El scan filtra por `box_id` (campo `genCode()`, ej: `AB12CD34`). Son campos distintos, nunca coinciden. Cada scan falla.  
**Fix:** En `app/scan/page.tsx` cambiar el filtro:
```ts
// Antes:
filter: `box_id="${boxId}" && company_id="${user.company_id}"`
// Después:
filter: `id="${boxId}" && company_id="${user.company_id}"`
```
**Cuidado:** Verificar que el `id` del URL realmente es el PB record ID y no el box_id — leer `vault/[id]/print/page.tsx` línea ~54 primero.

---

### CR-2 — No existe la ruta `/vault/[id]` — todos los QR codes dan 404 ✅ FIXED
**Archivo:** `app/vault/[id]/print/page.tsx` línea ~54  
**Problema:** El QR genera `https://managerwarehouse.cc/vault/${id}`. Existe `app/vault/[id]/print/page.tsx` pero NO `app/vault/[id]/page.tsx`. El URL del QR da 404.  
**Fix:** Crear `app/vault/[id]/page.tsx` que extraiga el vault de PocketBase por record ID y redirija:
```ts
router.replace(`/warehouses/${vault.warehouse_id}?vault=${vault.box_id}`)
```
**Nota:** Este fix está relacionado con CR-1 — resolver juntos en la misma sesión.

---

### CR-3 — Empresas rechazadas acceden al dashboard ✅ FIXED
**Archivo:** `components/AppShell.tsx` línea ~27  
**Problema:** Guard redirige a `/pending` solo si `company_approved === false && company_rejected !== true`. Cuando `company_rejected === true`, nada lo captura — el usuario entra al dashboard.  
**Fix:**
```ts
// Agregar ANTES del check de pending:
if (user.company_rejected === true) {
  router.replace('/rejected');
  return;
}
```
Crear `app/rejected/page.tsx` con mensaje: "Your company application was not approved. Contact support."

---

### CR-4 — Chat: mensajes propios aparecen al lado INCORRECTO ✅ FIXED
**Archivos:** `app/chat/page.tsx` línea ~169, `app/api/chat/messages/route.ts` líneas 48/99  
**Problema:** El API devuelve `sender_email: m.author_id` (campo mal nombrado — contiene un ID, no email). La comparación `msg.sender_email === user?.id` debería funcionar, pero verificar si hay discrepancia entre endpoints.  
**Fix paso a paso:**
1. En `app/api/chat/messages/route.ts` renombrar `sender_email` → `sender_id` en el response shape
2. En `app/chat/page.tsx` cambiar la comparación a `msg.sender_id === user?.id`
3. Verificar que `lib/api.ts` `mapMessage()` también use el campo correcto
**IMPORTANTE:** Si hay dos rutas de fetch (lib/api.ts directo vs /api/chat), ambas deben retornar el mismo campo.

---

### CR-5 — Admin panel: error.tsx expone stack traces en producción ✅ FIXED
**Archivo:** `app/admin-k9x2m7/error.tsx` línea ~9  
**Problema:** `{error.stack}` en un `<pre>` tag — en producción expone paths del servidor y posiciones del source.  
**Fix:**
```tsx
// Antes:
<pre>{error.stack}</pre>
// Después:
{process.env.NODE_ENV === 'development' && <pre>{error.stack}</pre>}
<p>An unexpected error occurred in the admin panel.</p>
```

---

### CR-6 — Admin panel sin protección server-side ✅ FIXED
**Archivo:** `app/admin-k9x2m7/page.tsx`  
**Problema:** Auth verificada solo en client-side JS. No hay middleware que bloquee el path.  
**Fix:** En `proxy.ts`, agregar el path al check de portal o crear un layout protegido:
```ts
// En proxy.ts agregar /admin-k9x2m7 a las rutas que requieren cookie admin_session
```
O crear `app/admin-k9x2m7/layout.tsx` con verificación server-side del cookie.

---

### CR-7 — Email inyectado en filtro PocketBase sin sanitizar ✅ FIXED
**Archivos:** `app/api/auth/send-password-reset/route.ts`, `app/api/auth/send-verification/route.ts`  
**Problema:** `` filter=`email="${email}"` `` — comillas en el email rompen el filtro.  
**Fix:** Sanitizar el email antes de interpolarlo:
```ts
// La función sf() en lib/api.ts hace el escape correcto
// Importarla o replicar: email.replace(/"/g, '\\"')
const safeEmail = email.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const filter = `email="${safeEmail}"`;
```

---

### CR-8 — `/deleted` no está en AUTH_ROUTES ✅ FIXED
**Archivo:** `components/AppShell.tsx` array `AUTH_ROUTES` línea ~10  
**Fix:** Agregar `'/deleted'` al array. Verificar también si `/scan` y `/vault` están incluidos.

---

### CR-9 — Cámara denegada: error invisible en modo inline ✅ FIXED
**Archivo:** `components/QRScanner.tsx` línea ~124  
**Problema:** Cuando `inline=true` retorna `cameraBlock` que no tiene display de errores. Camera denial = caja negra sin mensaje.  
**Fix:** Mover el display de errores dentro de `cameraBlock` para que aplique en ambos modos.

---

### NCR-1 — Login no bloquea empresas rechazadas ✅ FIXED
**Archivo:** `app/login/page.tsx` línea ~146  
**Problema:** Después de autenticar con Google, se verifica `suspended` y `!approved` pero **nunca `rejected`**. Empresas rechazadas son redirigidas a `/pending` en vez de `/rejected`. Bug gemelo de CR-3 pero en el flujo de login.  
**Fix:** Antes del check de `!approved`, agregar:
```ts
if (company.rejected) { router.replace('/rejected'); return; }
```

---

### NCR-2 — Filter injection en invite code join route ✅ FIXED
**Archivo:** `app/api/company/join/route.ts` línea ~32  
**Problema:** El `code` (invite code) se interpola directo en el filtro PocketBase sin sanitizar. Un código como `x" || approved=true || "` rompe el filtro y puede matchear cualquier empresa.  
**Fix:** Sanitizar antes de interpolar — mismo patrón que CR-7:
```ts
const safeCode = code.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
```

---

## 🟠 ALTOS (12) — Sesión 2 y 3

### A-1 — No se puede editar nombre desde el perfil ✅ FIXED
**Archivo:** `app/profile/page.tsx` línea ~189  
Nombre y email mostrados como texto estático.  
**Fix:** Campo editable inline con botón "Save" → `PUT /api/profile { name }`.

### A-2 — No hay cambio de contraseña desde el perfil ✅ FIXED
**Fix:** Sección "Change Password" con `current_password`, `new_password`, `confirm`. Usar el endpoint de PocketBase para cambio de contraseña autenticado.

### A-3 — No hay eliminación de cuenta ✅ FIXED
**Fix:** Botón "Delete Account" con `ConfirmModal` → nuevo endpoint `DELETE /api/account` que borra el registro de PB y llama `logout()`.

### A-4 — Workers no pueden salir de una empresa ✅ FIXED
**Fix:** Para `!isOwner`: botón "Leave Company" con `ConfirmModal` → `DELETE /api/company/members/self`.

### A-5 — Admin link hardcodeado con user ID literal ✅ FIXED
**Archivo:** `app/profile/page.tsx` línea ~295  
`user?.id === 'ezcrajrmevn36cu'` — si la cuenta cambia, el link desaparece.  
**Fix:** Cambiado a `user?.email === process.env.NEXT_PUBLIC_ADMIN_USER_EMAIL`.

### A-6 — No hay sistema de toasts ✅ FIXED
**Problema:** Ninguna mutación (crear, borrar, guardar) da feedback visual.  
**Fix:** Crear `components/Toast.tsx` + hook `useToast`. Exponer via contexto. Usarlo en:
- Crear/editar/borrar vault
- Crear/editar warehouse
- Cambiar status de tarea
- Enviar snapshot por email
- Generar invite code
- Guardar perfil

### A-7 — Session expiry banner nunca aparece ✅ FIXED
**Archivo:** `components/AppShell.tsx`  
**Fix:** Cambiar redirect a `/login?session=expired` cuando auth falla.

### A-8 — No hay returnTo después del login ✅ FIXED
**Fix:** En AppShell al redirigir: `router.replace('/login?returnTo=' + encodeURIComponent(pathname))`. En login page después de auth: `router.replace(params.get('returnTo') || '/dashboard')`.

### A-9 — PATCH admin companies nunca verifica si funcionó ✅ FIXED
**Archivo:** `app/api/admin/companies/[id]/route.ts` líneas 44, 57, 70, 79  
**Fix:** Después de cada `await fetch(...)`, verificar `if (!res.ok) return NextResponse.json({ error: 'PocketBase update failed' }, { status: 502 })`.

### A-10 — Joining empresa suspendida/rechazada no bloqueado ✅ FIXED
**Archivo:** `app/api/company/join/route.ts`  
**Fix:** Después de obtener `company`:
```ts
if (!company.approved || company.suspended || company.rejected) {
  return NextResponse.json({ error: 'This company is not currently active' }, { status: 403 });
}
```

### A-11 — Límite de miembros no enforced server-side ✅ FIXED
**Archivo:** `app/api/company/join/route.ts`  
**Fix:** Antes de unir, contar miembros con `perPage=1` y verificar contra `company.max_members`.

### NA-1 — Storage: client_name muestra ID en vez del nombre del cliente ✅ FIXED
**Archivo:** `lib/api.ts` línea ~75  
**Problema:** `mapStorage` mapea `client_id` (record ID de PocketBase) al campo `client_name`. Los nombres de clientes en la sección Storage **nunca se muestran** — solo aparece un ID opaco.  
**Fix:** Agregar `?expand=client_id` al GET de storage y mapear `s.expand?.client_id?.name || s.client_id`.

---

## 🟡 MEDIOS (45) — Sesiones 4, 5 y 6

### M-1 — Error states silenciosos — múltiples páginas ✅ FIXED
**Todos los `catch {}` vacíos devuelven pantalla vacía indistinguible de "sin datos".**  
**Archivos:** `warehouses/page.tsx`, `warehouses/[id]/page.tsx`, `dashboard/page.tsx`, `snapshots/page.tsx`, `deleted/page.tsx`, `stats/page.tsx`, `search/page.tsx`, `storage/page.tsx`, `storage/[id]/page.tsx`  
**Fix por página:** Agregar `const [error, setError] = useState<string|null>(null)`. En catch: `setError('Failed to load. Try again.')`. Renderizar debajo del header con botón retry.

### M-2 — Resultados de búsqueda no clickeables ✅ FIXED
**Archivo:** `app/search/page.tsx` líneas 227-250  
**Fix:** En cada row agregar `onClick={() => router.push(`/warehouses/${r.warehouse_id}?vault=${r.box_id}`)}` + `cursor-pointer hover:bg-gray-50`.

### M-3 — Stats: "Last 8 weeks" hardcodeado ✅ FIXED
**Archivo:** `app/stats/page.tsx` línea ~287  
**Fix:** Reemplazar con variable dinámica basada en el período seleccionado.

### M-4 — Chat polling 30 segundos ✅ FIXED
**Archivo:** `app/chat/page.tsx` línea ~91  
**Fix:** `setInterval(fetchMessages, 5000)`.

### M-5 — Tasks: vault link va al listado general ✅ FIXED
**Archivo:** `app/tasks/page.tsx` líneas 175, 273  
**Fix:** Link a `/vault/${task.vault_id}` (usa el redirect de CR-2).

### M-6 — Deleted page: sin columna warehouse, "Delete" ambiguo ✅ FIXED
**Fix:** Agregar columna "Warehouse" con lookup de nombre. Cambiar botón a "Permanently Delete".

### M-7 — Workers pueden borrar permanentemente en /deleted ✅ FIXED
**Archivo:** `app/deleted/page.tsx`  
**Fix:** `{isOwner && <button>Permanently Delete</button>}`.

### M-8 — ConfirmModal cierra antes de que termine la operación
**Archivo:** `components/ConfirmModal.tsx` línea ~45  
**Fix:** Convertir `onClick` en async, agregar estado `loading`, await `onConfirm()`, solo luego cerrar.

### M-9 — Fotos: límite inconsistente (4 UI / 6 código) ✅ FIXED
**Archivos:** `components/VaultForm.tsx`, `lib/api.ts`  
**Fix:** Decidir entre 4 o 6 y unificar en ambos archivos + los comentarios.

### M-10 — Vaults en columnas 9-11 no aparecen en email snapshot ✅ FIXED
**Archivo:** `lib/email.ts` línea ~469  
**Fix:** Reemplazar `const COLS = [1,2,3,4,5,6,7,8]` con el número real de columnas del almacén que viene en los datos del snapshot.

### M-11 — Sidebar y MobileNav duplican polling intervals ✅ FIXED
**Ambos están en DOM. Cada uno corre `useUnreadChat` y `usePendingTasks`.**  
**Fix:** Mover ambos hooks a `components/AppShell.tsx` y pasar `unreadCount` y `pendingCount` como props via contexto o props drilling.

### M-12 — getPbAdminToken duplicada en 5 archivos sin cache ✅ FIXED
**Archivos:** `activate/route.ts`, `confirm-password-reset/route.ts`, `send-password-reset/route.ts`, `send-verification/route.ts`, `verify-email/route.ts`  
**Fix:** En cada uno: `import { getPbAdminToken } from '@/lib/pb-admin'` y eliminar la función local.

### M-13 — lib/pb.ts hardcodea URL sin env var
**Archivo:** `lib/pb.ts` línea 3  
**Fix:** `new PocketBase(process.env.NEXT_PUBLIC_PB_URL || 'https://pocketbase-production-e699.up.railway.app')`.

### M-14 — STATUS_COLORS_HEX['DELIVERED'] color incorrecto
**Archivo:** `lib/constants.ts` línea ~17  
**Fix:** Cambiar `'#6366f1'` a `'#3b82f6'` para consistencia con los otros objetos.

### M-15 — setToken en lib/api.ts es un no-op exportado ✅ FIXED
**Archivo:** `lib/api.ts` línea ~8  
**Fix:** Eliminar `export const setToken = (_t: string) => {}`. Buscar si algo lo importa y limpiar esos imports.

### M-16 — useUnreadChat descarga 150 mensajes para contar ✅ FIXED
**Archivo:** `lib/use-unread-chat.ts`  
**Fix:** Usar `perPage=1&sort=-created` y solo comparar el timestamp del último mensaje con el último visto.

### M-17 — Badge pending tasks cuenta IN_PROGRESS
**Archivo:** `lib/use-pending-tasks.ts` línea ~17  
**Fix:** `tasks.filter(t => t.status === 'PENDING').length`.

### M-18 — Task assigned_to sin verificar empresa ✅ FIXED
**Archivos:** `app/api/tasks/route.ts`, `app/api/tasks/[id]/route.ts`  
**Fix:** Verificar que el `assigned_to` user_id pertenece a `company_id` antes de guardar.

### M-19 — Task status no validado ✅ FIXED
**Fix:** `const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'DONE']; if (!VALID_STATUSES.includes(body.status)) return error 400`.

### M-20 — sender_email en chat API contiene author_id ✅ FIXED
**Archivo:** `app/api/chat/messages/route.ts`  
**Fix:** Renombrar `sender_email` → `sender_id` en el response. Actualizar todos los consumidores. **Hacer junto con CR-4.**

### M-21 — No hay página /rejected ✅ FIXED
**Fix:** Crear `app/rejected/page.tsx`. **Hacer junto con CR-3.**

### M-22 — Pending page: empresas rechazadas nunca redirigidas ✅ FIXED
**Archivo:** `app/pending/page.tsx`  
**Fix:** En el check del polling: `if (company.rejected) { router.replace('/rejected'); return; }`.

### M-23 — Suspended page: email de soporte es noreply ✅ FIXED
**Archivo:** `app/suspended/page.tsx` línea ~39  
**Fix:** Cambiar a un email real que alguien monitoree.

### M-24 — Suspended page: sin polling para reinstatement ✅ FIXED
**Fix:** Agregar `setInterval` igual que en `pending/page.tsx` que verifique si la empresa fue reactivada.

### M-25 — Onboarding: industry dropdown no cierra con click fuera ✅ FIXED
**Archivo:** `app/onboarding/page.tsx`  
**Fix:** Agregar `useEffect` con `mousedown` listener igual que el avatar picker.

### M-26 — Onboarding: refresh en step 2 regresa a step 1 ✅ FIXED
**Fix:** `localStorage.setItem('onboarding_step', step)` al cambiar. Leer en el `useState` inicial.

### M-27 — Onboarding: sin guard para usuarios que ya completaron ✅ FIXED
**Fix:** `useEffect(() => { if (user?.profile_complete) router.replace('/dashboard'); }, [user])`.

### M-28 — Admin panel: sin botones Approve/Reject en UI ✅ FIXED
**Archivo:** `app/admin-k9x2m7/page.tsx`  
El API soporta `approve` y `reject` pero la UI no los tiene.  
**Fix:** Agregar botones "Approve ✓" y "Reject ✗" junto a las empresas en estado pending.

### M-29 — Admin panel: data truncada silenciosamente ✅ FIXED
**Archivo:** `app/api/admin/companies/route.ts`  
`perPage=200` y `perPage=500` son hardcodeados.  
**Fix:** Implementar paginación o al menos mostrar un aviso si `totalItems > perPage`.

### M-30 — Storage detail: spinner de Save invisible ✅ FIXED
**Archivo:** `app/storage/[id]/page.tsx` línea ~510  
**Fix:** Agregar clases: `border-2 border-white/40 border-t-white rounded-full`.

### M-31 — Storage detail: Clear slot tiene race condition ✅ FIXED
**Archivo:** `app/storage/[id]/page.tsx` líneas 381-382  
`setSlotForm(empty)` + `saveSlot()` inmediato — React state es async.  
**Fix:** Pasar los valores limpios directamente a `saveSlot({ ...emptySlot })` en lugar de leer del estado.

### M-32 — Storage: botón "New Storage Unit" visible para workers ✅ FIXED
**Archivo:** `app/storage/page.tsx` línea ~77  
**Fix:** Envolver en `{isOwner && <button>...}`.

### M-33 — Storage detail: access_code en plaintext ✅ FIXED
**Archivo:** `app/storage/[id]/page.tsx` línea ~481  
**Fix:** `[••••••] [Reveal]` con toggle `showCode`.

### M-34 — Storage detail: Nominatim sin User-Agent ✅ FIXED
**Archivo:** `app/storage/[id]/page.tsx` función `geocode()`  
**Fix:** Agregar header: `'User-Agent': 'WarehouseManager/1.0 (managerwarehouse.cc)'`.

### M-35 — Dashboard: "By Warehouse" muestra IDs de PocketBase ✅ FIXED
**Archivo:** `app/dashboard/page.tsx` líneas 182-185  
**Fix:** Hacer lookup de warehouses al cargar el dashboard y mapear IDs → nombres.

### M-36 — Print page: QR URL hardcodea dominio de producción ✅ FIXED
**Archivo:** `app/vault/[id]/print/page.tsx` línea ~54  
**Fix:** `process.env.NEXT_PUBLIC_APP_URL || 'https://managerwarehouse.cc'`.

### M-37 — Login: setLoading(false) no llamado en path de email no verificado ✅ FIXED
**Archivo:** `app/login/page.tsx` líneas 128-133  
**Fix:** Llamar `setLoading(false)` antes de `router.push('/verify-email')`.

### NM-1 — Chat: mensajes hard-capped a 150, historial se pierde permanentemente ✅ FIXED
**Archivo:** `app/api/chat/messages/route.ts` línea ~40  
**Problema:** `perPage=150` sin paginación. Al superar 150 mensajes los más viejos desaparecen del chat sin posibilidad de recuperarlos desde la UI.  
**Fix:** Implementar scroll infinito con cursor, o al menos aumentar el límite a 500 con paginación.

### NM-2 — QRScanner: doneRef no se resetea — cámara permanentemente muerta en re-render ✅ FIXED
**Archivo:** `components/QRScanner.tsx` línea ~81  
**Problema:** `doneRef.current = true` en el cleanup nunca se resetea a `false` al inicio del siguiente effect. Si el padre cambia `onResult`, la cámara se abre y se cierra inmediatamente — queda permanentemente muerta sin recovery.  
**Fix:** Agregar `doneRef.current = false` como **primera línea** dentro del cuerpo del effect (antes de llamar `start()`).

### NM-3 — Task status puede borrarse enviando PUT sin el campo `status`
**Archivo:** `app/api/tasks/[id]/route.ts` línea ~45  
**Problema:** `updateData = { status: body.status }` — si `body.status` es `undefined`, PocketBase puede borrar el campo. No hay validación de presencia antes del write.  
**Fix:** `if (!body.status) return NextResponse.json({ error: 'status required' }, { status: 400 })`.

### NM-4 — Admin: fallo al borrar usuario no detiene el borrado de la empresa ✅ FIXED
**Archivo:** `app/api/admin/companies/[id]/route.ts` líneas ~114-121  
**Problema:** `Promise.all(...)` borra usuarios individualmente pero no verifica fallos. Si un DELETE de usuario falla, el código sigue adelante y borra la empresa — quedan usuarios huérfanos.  
**Fix:** Usar `Promise.allSettled` y verificar que todos los rejections sean aceptables antes de proceder a borrar la empresa.

### NM-5 — Stats: contador de vaults no respeta el filtro de período ✅ FIXED
**Archivo:** `app/stats/page.tsx` línea ~512  
**Problema:** El subtítulo muestra `boxes.length` (total histórico) en vez de `filteredBoxes.length`. Cuando el usuario filtra por "7 días", los conteos de clientes se filtran correctamente pero el total de vaults sigue mostrando el número completo.  
**Fix:** Cambiar `boxes.length` → `filteredBoxes.length` en la línea del subtítulo.

### NM-6 — Restore en /deleted sin check de rol (mismo problema que M-7) ✅ FIXED
**Archivo:** `app/deleted/page.tsx` línea ~25  
**Problema:** La función `restore` no verifica rol — cualquier worker puede restaurar vaults al inventario activo sin restricción. M-7 ya documentaba esto para permanent delete, pero restore tiene el mismo problema.  
**Fix:** `{isOwner && <button onClick={() => restore(vault.id)}>Restore</button>}`.

### NM-7 — Verify email resend muestra éxito aunque el server falle ✅ FIXED
**Archivo:** `app/verify-email/page.tsx` línea ~24  
**Problema:** El botón "Resend" no verifica `res.ok`. Un 4xx/5xx del server igual ejecuta `setResent(true)` y muestra "Email resent successfully!" al usuario.  
**Fix:** `if (!res.ok) { setError('Failed to resend. Try again.'); return; }` antes de `setResent(true)`.

### NM-8 — Signup: Enter no submite en modo "create account" ✅ FIXED
**Archivo:** `app/signup/page.tsx`  
**Problema:** En modo "create account", Enter en los campos confirm-password y company-name no hace nada. El `onKeyDown` con Enter solo existe en modo join. Crear cuenta con solo teclado es imposible.  
**Fix:** Agregar `onKeyDown={e => e.key === 'Enter' && handleSubmit()}` en los campos confirm-password y company-name del modo create.

---

## 🟢 BAJOS (57) — Sesiones 7 y 8 (quick wins)

| # | Archivo | Problema | Fix rápido |
|---|---|---|---|
| B-1 | signup/login/join route | Invite code min length inconsistente (4 vs 6 vs 8) | Unificar a 8 |
| B-2 | app/profile/page.tsx | Botón "Generate Invite Code" sin loading state | `disabled={loading}` + spinner |
| B-3 | app/production/page.tsx | Flash de pantalla en blanco antes de redirigir | Redirect 308 en next.config.ts |
| B-4 | app/warehouses/[id]/page.tsx | Lightbox sin swipe en mobile | `onTouchStart`/`onTouchEnd` como en Tutorial.tsx |
| B-5 | app/verify-email/page.tsx | Falla silenciosamente si localStorage vacío | Mensaje de error explícito |
| B-6 | lib/auth-context.tsx | Logout usa `window.location.href` | `router.replace('/login')` |
| ~~B-7~~ | ~~lib/email.ts líneas 175-177~~ | ~~fmtTaskStatus retorna "Pending" para todo~~ | ✅ FIXED — ya maneja IN_PROGRESS / DONE / Pending correctamente |
| B-8 | lib/email.ts línea ~316 | Ruta admin hardcodeada en email | Constante `ADMIN_PATH` |
| B-9 | api/admin/notify/route.ts | "Brayan" hardcodeado en email | Env var `ADMIN_NAME` |
| B-10 | app/page.tsx línea ~334 | "Brayan" en dashboard mockup de la landing | Nombre genérico |
| B-11 | app/page.tsx línea ~57 | "Total Volts" — typo | "Total Vaults" |
| B-12 | app/page.tsx | Estadísticas inconsistentes (12K Teams vs 10K Users) | Unificar a una cifra coherente |
| B-13 | components/QRScanner.tsx | Puede reiniciar cámara en re-render del padre | Padre usa `useCallback` en `onResult` |
| B-14 | components/AppShell.tsx | `pathname` falta en useEffect dependency array | Agregar `pathname` al array |
| B-15 | app/snapshots/page.tsx | Report siempre renderiza 10 filas A-J | Usar filas reales del almacén |
| B-16 | app/activate/page.tsx | Enteramente en español | Traducir al inglés |
| B-17 | components/BottomNav.tsx | Dead code — nunca se usa | Eliminar el archivo |
| B-18 | lib/compress-image.ts línea ~38 | Permite 2.4MB aunque dice 1.2MB | Cambiar `* 2` a nada |
| B-19 | lib/api.ts líneas 31-35 | validatePhotos calcula bytes base64 mal | `Math.ceil(p.length * 3 / 4)` |
| B-20 | lib/api.ts línea ~33 | validatePhotos dice "5MB" pero limita a 7MB | Unificar número |
| B-21 | lib/api.ts línea 4 | BACKEND_URL exportado (visible en bundle) | Usar env var directamente |
| B-22 | app/admin-k9x2m7/page.tsx | Locale `es-AR` hardcodeado | Cambiar a `'en-US'` |
| B-23 | app/admin-k9x2m7/page.tsx | "Code sent" persiste al cambiar tabs | Limpiar `successId` al cambiar tab |
| B-24 | app/admin-k9x2m7/ | Texto mezclado español/inglés | Traducir "Panel de Admin" etc |
| B-25 | app/onboarding/page.tsx | Errores de PB raw al usuario | Normalizar a mensajes amigables |
| B-26 | app/onboarding/page.tsx | Error de step 1 persiste al volver | Limpiar `error` al cambiar step |
| B-27 | app/login/page.tsx líneas 246-255 | Banners informativos sin dismiss | Botón `×` o auto-dismiss 5s |
| B-28 | app/login/page.tsx | `?session=expired` nunca limpiado de URL | `router.replace('/login')` después de detectar |
| B-29 | app/login/page.tsx línea ~275 | Email field no submite en Enter | Agregar `onKeyDown` handler |
| B-30 | app/login/page.tsx | `_userId` dead parameter en joinCompany | Eliminar parámetro |
| B-31 | app/signup/page.tsx | Form no es `<form>` HTML (es `<div>`) | Envolver en `<form onSubmit>` |
| B-32 | app/signup/page.tsx | Password toggle solo en primer campo | Toggle también en confirm field |
| B-33 | app/signup/page.tsx | Double-click puede crear cuenta dos veces | Deshabilitar botón en primer click |
| B-34 | app/storage/page.tsx | Campo `state` no en el form de creación | Agregar input |
| B-35 | app/storage/page.tsx | File input no se resetea tras selección | `e.target.value = ''` |
| B-36 | app/storage/page.tsx | Status desconocido muestra "Available" silenciosamente | Mostrar "Unknown" |
| B-37 | app/storage/[id]/page.tsx | Foto acepta PDF | Remover `.pdf` del `accept` |
| B-38 | app/storage/[id]/page.tsx | Sin warning de unsaved changes al salir | `beforeunload` handler |
| B-39 | app/storage/[id]/page.tsx | Grid shrink no borra slots fuera de límites | Borrar slots con row/col > nuevas dims |
| B-40 | app/vault/[id]/print/page.tsx | `window.close()` no funciona si navegado directamente | Fallback a `router.push('/dashboard')` |
| B-41 | app/vault/[id]/print/page.tsx | Descarga todos los warehouses para obtener un nombre | `api.get('/api/warehouses/${id}')` |
| B-42 | app/vault/[id]/print/page.tsx | Nivel asume exactamente 2 niveles | Mapeo flexible |
| B-43 | app/vault/[id]/print/page.tsx | Sin `<title>` para PDF | Agregar título dinámico |
| B-44 | app/vault/[id]/print/page.tsx | Puede imprimir el spinner | Solo permitir print cuando datos están listos |
| B-45 | app/warehouses/[id]/page.tsx | Map view mobile sin texto | Cliente truncado en mobile |
| B-46 | api/chat/messages/route.ts | Cualquier miembro puede borrar mensajes de otros | Verificar `author_id === userId` |
| B-47 | api/chat/messages/route.ts | Sin rate limiting en POST | Max 30 msgs/min por usuario |
| B-48 | app/chat/page.tsx | Sin límite de caracteres en mensajes | `maxLength={2000}` |
| B-49 | app/chat/page.tsx | Botón delete invisible en mobile (solo hover) | Mostrar siempre para mensajes propios |
| B-50 | app/chat/page.tsx | Sin confirmación al borrar mensaje | Agregar ConfirmModal |
| B-51 | app/tasks/page.tsx | Enter en título submite el form | `e.preventDefault()` en keydown |
| B-52 | app/tasks/page.tsx | Sin indicador de tareas vencidas | Resaltar con `due_date < now` |
| B-53 | api/tasks/route.ts | body.type y body.priority sin validar | Verificar contra enum |
| B-54 | Múltiples forms | Inputs sin `id`/`htmlFor` (accesibilidad) | Agregar en login, signup, onboarding |
| B-55 | app/scan/page.tsx | `router.back()` puede salir de la app | `history.length > 1 ? back() : push('/dashboard')` |
| ~~NB-1~~ | ~~app/chat/page.tsx línea 169~~ | ~~`isMe` tiene dead branch `=== user?.email`~~ | ✅ FIXED junto con CR-4/M-20 |
| NB-2 | app/vault/[id]/print/page.tsx línea 29 | Endpoint `/api/boxes/` usado para recurso vault — verificar que es el alias correcto de la colección | Confirmar contra route handlers |

---

## Plan de sesiones estimado

| Sesión | Issues | Tiempo estimado |
|--------|--------|-----------------|
| **Sesión 1** | CR-1 a CR-9 + NCR-1 + NCR-2 (todos los críticos) | 2-3h |
| **Sesión 2** | A-1 a A-5 + NA-1 (perfil: editar nombre, password, delete account, leave company, admin link, storage client name) | 2-3h |
| **Sesión 3** | A-6 (toast system) + M-1 (error states en todas las páginas) | 2-3h |
| **Sesión 4** | A-7, A-8, A-9, A-10, A-11 + M-2 a M-10 | 2-3h |
| **Sesión 5** | M-11 a M-20 + NM-1 a NM-8 (lib/api/hooks cleanup + nuevos medios) | 2-3h |
| **Sesión 6** | M-21 a M-37 (páginas secundarias) | 2-3h |
| **Sesión 7** | B-1 a B-30 + NB-1 + NB-2 (primera mitad de bajos) | 2h |
| **Sesión 8** | B-31 a B-55 (segunda mitad de bajos) | 2h |

**Total estimado: 8 sesiones, ~20-24 horas de trabajo.**
**Bugs activos: 183 (184 total — 1 corregido: B-7)**

---

## Checklist de verificación por sesión

Antes de hacer `railway up` después de cada sesión:
- [ ] `npx next build` — 0 errores, 0 warnings críticos
- [ ] Testear flujo principal: login → dashboard → crear vault → ver warehouse
- [ ] Testear el feature específico que se corrigió
- [ ] Revisar que no hay `console.log` ni `alert()` nuevos
- [ ] Verificar que PocketBase sigue respondiendo
