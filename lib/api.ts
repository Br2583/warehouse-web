import { pb } from './pb';
import { genCode } from './utils';

// ─── Auth token helpers (now PocketBase manages the session) ──────────────────
export const getToken = (): string | null => pb.authStore.token || null;
export const removeToken = () => pb.authStore.clear();

// ─── Helpers ──────────────────────────────────────────────────────────────────
const companyId = () => pb.authStore.model?.company_id as string | undefined;
const userId    = () => pb.authStore.model?.id as string | undefined;

// Escape values interpolated into PocketBase filter strings to prevent injection
function sf(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// Sanitize error messages before surfacing them to the UI
function safeError(e: any): never {
  const msg: string = e?.message || '';
  const internal = /collection|filter|record|pocketbase|constraint|unique|field|relation/i.test(msg);
  throw new Error(internal ? 'Operation failed. Please try again.' : msg || 'An error occurred.');
}

// Validate photos array (client-side guard; real enforcement is in PocketBase rules)
function validatePhotos(photos: unknown): void {
  if (!Array.isArray(photos)) return;
  if (photos.length > 6) throw new Error('Maximum 6 photos allowed');
  for (const p of photos) {
    if (typeof p === 'string' && Math.ceil(p.length * 3 / 4) > 5 * 1024 * 1024) {
      throw new Error('Each photo must be under 5MB');
    }
  }
}

// Map a PocketBase vault record to the shape the pages expect
function mapVault(v: any) {
  return {
    box_id:       v.id,
    warehouse_id: v.warehouse_id,
    row:          v.row,
    column:       v.col,
    level:        v.level,
    position:     v.position || `${v.row}${v.col}-L${v.level}`,
    client_name:  v.client_name,
    client_id:    v.client_id,
    job_type:     v.job_type,
    vault_status: v.vault_status || [],
    content_type: v.content_type,
    room_location: v.room_location || [],
    packer:       v.packer,
    photos:       v.photos || [],
    comments:     v.comments,
    estado:       v.estado,
    status:       v.estado,
    qr_token:     v.qr_token,
    created:      v.created,
  };
}

// Map a PocketBase storage_units record
function mapStorage(s: any) {
  const rawPhotos = s.photos;
  const photos = Array.isArray(rawPhotos)
    ? rawPhotos
    : rawPhotos ? (typeof rawPhotos === 'string' ? JSON.parse(rawPhotos) : rawPhotos) : [];
  return {
    id:          s.id,
    unit_name:   s.unit_name,
    address:     s.address || '',
    city:        s.city || '',
    state:       s.state || '',
    client_name: s.expand?.client_id?.name || s.client_id || '',
    capacity:    s.capacity || '',
    access_code: s.access_code || '',
    status:      s.status || 'AVAILABLE',
    photos,
    notes:       s.notes || '',
    created:     s.created,
    slots:       s.slots || {},
    grid_rows:   s.grid_rows || 4,
    grid_cols:   s.grid_cols || 6,
  };
}

// Map a PocketBase chat_messages record to the Message shape
function mapMessage(m: any) {
  const raw = m.sent_at || m.created || '';
  return {
    id:          m.id,
    sender_name: m.author_name,
    sender_id:   m.author_id,
    text:        m.content,
    timestamp:   raw.replace(' ', 'T'),
  };
}

// Aggregate vaults into stats shape — single query, returns everything dashboard needs
async function buildStats() {
  const cid = companyId();
  if (!cid) return { total_boxes: 0, statuses: {}, by_warehouse: {}, job_types: {}, recent: [], sla_count: 0, histogram: [] };

  const [vaults, warehouses] = await Promise.all([
    pb.collection('vaults').getFullList({
      filter: `company_id="${cid}"`,
      fields: 'id,estado,warehouse_id,job_type,created,client_name,position',
    }),
    pb.collection('warehouses').getFullList({ filter: `company_id="${cid}"`, fields: 'id,name' }),
  ]);

  const whMap: Record<string, string> = {};
  for (const w of warehouses) whMap[w.id] = w.name;

  const statuses: Record<string, number> = {};
  const by_warehouse: Record<string, number> = {};
  const job_types: Record<string, number> = {};
  let sla_count = 0;
  const now = Date.now();

  for (const v of vaults) {
    const s = v.estado || 'PENDING';
    statuses[s] = (statuses[s] || 0) + 1;
    by_warehouse[v.warehouse_id] = (by_warehouse[v.warehouse_id] || 0) + 1;
    job_types[v.job_type || 'Other'] = (job_types[v.job_type || 'Other'] || 0) + 1;
    if (s === 'PENDING' && v.created) {
      const ts = new Date(v.created.includes('T') ? v.created : v.created.replace(' ', 'T') + 'Z').getTime();
      if (now - ts > 3 * 24 * 60 * 60 * 1000) sla_count++;
    }
  }

  const recent = [...vaults]
    .sort((a, b) => (b.created || '') > (a.created || '') ? 1 : -1)
    .slice(0, 5)
    .map(v => ({ box_id: v.id, client_name: v.client_name, position: v.position, estado: v.estado, status: v.estado, created: v.created }));

  const histogram: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    histogram.push({
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: vaults.filter(v => (v.created || '').split(/[ T]/)[0] === dateStr).length,
    });
  }

  return { total_boxes: vaults.length, statuses, by_warehouse, job_types, recent, sla_count, histogram };
}

// ─── Path router ──────────────────────────────────────────────────────────────
async function routeGet(path: string): Promise<any> {
  const url  = new URL(path, 'http://x');
  const p    = url.pathname;
  const q    = url.searchParams;
  const cid  = companyId();
  const uid  = userId();

  // ── Auth ──────────────────────────────────────────────────────────────────
  if (p === '/api/auth/me') {
    const m = pb.authStore.model;
    if (!m) { pb.authStore.clear(); throw new Error('401'); }
    let company_name = '';
    if (m.company_id) {
      try { const c = await pb.collection('companies').getOne(m.company_id); company_name = c.name; } catch {}
    }
    return {
      user_id:      m.id,
      email:        m.email,
      name:         m.name,
      picture:      m.avatar,
      company_id:   m.company_id,
      company_name,
      role:         m.role,
    };
  }

  // ── Boxes / Vaults ─────────────────────────────────────────────────────────
  if (p === '/api/boxes') {
    if (!cid) return [];
    const warehouseId = q.get('warehouse_id');
    const filter = warehouseId ? `company_id="${cid}" && warehouse_id="${sf(warehouseId)}"` : `company_id="${cid}"`;
    const items = await pb.collection('vaults').getFullList({
      filter,
      fields: 'id,warehouse_id,row,col,level,position,client_name,client_id,job_type,vault_status,content_type,room_location,packer,comments,estado,qr_token,company_id,created',
    });
    return items.map(mapVault).sort((a: any, b: any) => a.created < b.created ? -1 : 1);
  }

  // GET /api/boxes/:id
  const boxMatch = p.match(/^\/api\/boxes\/([^/]+)$/);
  if (boxMatch) {
    const v = await pb.collection('vaults').getOne(boxMatch[1]);
    if (v.company_id !== cid) throw new Error('Forbidden');
    return mapVault(v);
  }

  // ── Warehouses list ────────────────────────────────────────────────────────
  if (p === '/api/warehouses') {
    if (!cid) return [];
    const whs = await pb.collection('warehouses').getFullList({ filter: `company_id="${cid}"`, fields: 'id,name,address' });
    return whs.map(w => ({ id: w.id, name: w.name, address: w.address }));
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  if (p === '/api/stats/global') return buildStats();

  // ── Company ────────────────────────────────────────────────────────────────
  if (p === '/api/company/info') {
    if (!cid) return {};
    const c  = await pb.collection('companies').getOne(cid);
    const ms = await pb.collection('users').getFullList({ filter: `company_id="${cid}"`, fields: 'id' });
    return {
      id:         c.id,
      name:       c.name,
      invite_code: c.invite_code,
      member_count: ms.length,
      max_members: 50,
      is_owner:   c.owner_id === uid,
      active_invitation_codes: c.invite_code ? [c.invite_code] : [],
    };
  }

  if (p === '/api/company/members') {
    if (!cid) return [];
    const members = await pb.collection('users').getFullList({
      filter: `company_id="${cid}"`,
      fields: 'id,name,email,avatar_base64,role',
    });
    return members.map(m => ({
      user_id: m.id,
      name:    m.name,
      email:   m.email,
      picture: m.avatar_base64 || undefined,
      role:    m.role,
    }));
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────
  if (p === '/api/tasks') {
    const token = pb.authStore.token;
    if (!token) return [];
    const r = await fetch('/api/tasks', { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return [];
    return r.json();
  }

  // ── Chat ───────────────────────────────────────────────────────────────────
  if (p === '/api/chat/messages') {
    let chatCid = cid;
    if (!chatCid && uid) {
      const freshUser = await pb.collection('users').getOne(uid);
      chatCid = freshUser.company_id;
    }
    if (!chatCid) return [];
    // Fetch only last 150 messages sorted newest-first, then reverse for display
    const page = await pb.collection('chat_messages').getList(1, 500, {
      filter: `company_id="${chatCid}"`,
      sort: '-sent_at,-created',
      fields: 'id,author_name,author_id,content,sent_at,created',
    });
    return page.items.reverse().map(mapMessage);
  }

  // ── Search ────────────────────────────────────────────────────────────────
  if (p === '/api/search/global') {
    const q2          = q.get('q') || '';
    const status      = q.get('status') || '';
    const jobType     = q.get('job_type') || '';
    const warehouseId = q.get('warehouse_id') || '';
    const packer      = q.get('packer') || '';
    const hasFilter   = q2 || status || jobType || warehouseId || packer;
    if (!cid || !hasFilter) return [];
    let filter = `company_id="${cid}"`;
    if (status)      filter += ` && estado="${sf(status)}"`;
    if (jobType)     filter += ` && job_type="${sf(jobType)}"`;
    if (warehouseId) filter += ` && warehouse_id="${sf(warehouseId)}"`;
    if (packer)      filter += ` && packer~"${sf(packer)}"`;
    if (q2)          filter += ` && (client_name~"${sf(q2)}" || packer~"${sf(q2)}" || position~"${sf(q2)}" || comments~"${sf(q2)}" || job_type~"${sf(q2)}")`;
    const items = await pb.collection('vaults').getFullList({ filter });
    return items
      .sort((a: any, b: any) => a.created < b.created ? 1 : -1)
      .map(mapVault);
  }

  // ── Snapshots ──────────────────────────────────────────────────────────────
  if (p === '/api/snapshots') {
    if (!cid) return [];
    const items = await pb.collection('snapshots').getFullList({
      filter: `company_id="${cid}"`,
    });
    return items
      .sort((a: any, b: any) => a.date < b.date ? 1 : -1)
      .map(s => ({
        id:            s.id,
        date:          s.date,
        warehouse_name: (s.data as any)?.warehouse_name || 'Snapshot',
        box_count:     (s.data as any)?.box_count || 0,
        data:          s.data,
      }));
  }

  // ── Storage Units ─────────────────────────────────────────────────────────
  if (p === '/api/storage') {
    if (!cid) return [];
    const items = await pb.collection('storage_units').getFullList({
      filter: `company_id="${cid}"`,
      fields: 'id,unit_name,address,city,state,client_id,capacity,access_code,status,notes,photos,company_id,created,slots,grid_rows,grid_cols',
      expand: 'client_id',
    });
    return items
      .sort((a: any, b: any) => a.created < b.created ? 1 : -1)
      .map(s => {
        const mapped = mapStorage(s);
        // Only first photo for list cards — detail page loads full record
        return { ...mapped, photos: mapped.photos.slice(0, 1) };
      });
  }

  const storageOneMatch = p.match(/^\/api\/storage\/([^/]+)$/);
  if (storageOneMatch) {
    const s = await pb.collection('storage_units').getOne(storageOneMatch[1], { expand: 'client_id' });
    if (s.company_id !== cid) throw new Error('Forbidden');
    return mapStorage(s);
  }

  // ── Deleted Vaults ────────────────────────────────────────────────────────
  if (p === '/api/deleted-boxes') {
    if (!cid) return [];
    const items = await pb.collection('deleted_vaults').getFullList({
      filter: `company_id="${cid}"`,
      fields: 'id,company_id,created,vault_data',
    });
    return items
      .sort((a: any, b: any) => a.created < b.created ? 1 : -1)
      .map(d => {
        const vd = (d.vault_data as any) || {};
        return {
          id:          d.id,
          box_id:      vd.box_id || d.id,
          client_name: vd.client_name || '—',
          warehouse_id: vd.warehouse_id,
          position:    vd.position || '',
          deleted_at:  d.created,
          vault_data:  d.vault_data,
        };
      });
  }

  throw new Error(`Unknown GET path: ${p}`);
}

async function routePost(path: string, body: any): Promise<any> {
  const url = new URL(path, 'http://x');
  const p   = url.pathname;
  const cid = companyId();
  const uid = userId();

  // ── Auth: logout ──────────────────────────────────────────────────────────
  if (p === '/api/auth/logout') {
    pb.authStore.clear();
    return {};
  }

  // ── Boxes / Vaults ─────────────────────────────────────────────────────────
  if (p === '/api/boxes') {
    if (!cid) throw new Error('No company');
    validatePhotos(body.photos);
    const qr_token = genCode();
    const v = await pb.collection('vaults').create({
      box_id:       genCode(),
      company_id:   cid,
      warehouse_id: body.warehouse_id,
      row:          body.row,
      col:          body.column ?? body.col,
      level:        body.level,
      position:     body.position || `${body.row}${body.column ?? body.col}-L${body.level}`,
      client_name:  body.client_name,
      client_id:    body.client_id,
      job_type:     body.job_type,
      content_type: body.content_type || body.contents_type,
      room_location: body.room_location || [],
      vault_status:  body.vault_status || [],
      packer:       body.packer,
      photos:       body.photos || [],
      comments:     body.comments,
      estado:       body.estado || body.status || 'PENDING',
      qr_token,
      created_by:   uid,
    });
    return mapVault(v);
  }

  // ── Company: generate invite code ─────────────────────────────────────────
  if (p === '/api/company/generate-code') {
    const token = pb.authStore.token;
    if (!token) throw new Error('Not authenticated');
    const r = await fetch('/api/company/generate-code', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || 'Failed to generate code'); }
    return r.json();
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────
  if (p === '/api/tasks') {
    const token = pb.authStore.token;
    if (!token) throw new Error('Not authenticated');
    const r = await fetch('/api/tasks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error((data as any).error || 'Failed to create task');
    return data;
  }

  // ── Chat ───────────────────────────────────────────────────────────────────
  if (p === '/api/chat/messages') {
    // company_id might be missing from the cached model — fetch fresh if needed
    let chatCid = cid;
    if (!chatCid && uid) {
      const freshUser = await pb.collection('users').getOne(uid);
      chatCid = freshUser.company_id;
    }
    if (!chatCid) throw new Error('No company — please rejoin your company from the Profile page');
    const m = await pb.collection('chat_messages').create({
      company_id:  chatCid,
      author_id:   uid || (() => { throw new Error('Not authenticated'); })(),
      author_name: body.sender_name || pb.authStore.model?.name,
      content:     body.text,
      type:        'text',
    });
    return mapMessage(m);
  }

  // ── Storage Units ─────────────────────────────────────────────────────────
  if (p === '/api/storage') {
    if (!cid) throw new Error('No company');
    validatePhotos(body.photos);
    const s = await pb.collection('storage_units').create({
      company_id:  cid,
      unit_name:   body.unit_name,
      address:     body.address || '',
      city:        body.city || '',
      state:       body.state || '',
      client_id:   body.client_name || '',
      capacity:    body.capacity || '',
      access_code: body.access_code || '',
      status:      body.status || 'AVAILABLE',
      photos:      body.photos || [],
      notes:       body.notes || '',
      created_by:  uid,
    });
    return mapStorage(s);
  }

  // ── Snapshots: create ─────────────────────────────────────────────────────
  const snapCreateMatch = p.match(/^\/api\/snapshots\/create\/([^/]+)$/);
  if (snapCreateMatch) {
    if (!cid) throw new Error('No company');
    const warehouseRef = snapCreateMatch[1];
    let filter = `company_id="${cid}"`;
    if (warehouseRef && warehouseRef !== 'all') filter += ` && warehouse_id="${warehouseRef}"`;
    const vaults = await pb.collection('vaults').getFullList({ filter });
    const warehouses = await pb.collection('warehouses').getFullList({ filter: `company_id="${cid}"` });
    const wh = warehouses.find(w => w.id === warehouseRef);
    const s = await pb.collection('snapshots').create({
      company_id: cid,
      date: new Date().toISOString().split('T')[0],
      data: {
        warehouse_name: wh?.name || 'All Warehouses',
        box_count: vaults.length,
        // Exclude photos — snapshots are for reporting, not media storage
        vaults: vaults.map(v => { const { photos, ...rest } = mapVault(v); return rest; }),
      },
      created_by: uid,
    });
    return { id: s.id, date: s.date };
  }

  // ── Deleted vaults: restore ───────────────────────────────────────────────
  const restoreMatch = p.match(/^\/api\/deleted-boxes\/([^/]+)\/restore$/);
  if (restoreMatch) {
    if (!cid) throw new Error('No company');
    const dv = await pb.collection('deleted_vaults').getOne(restoreMatch[1]);
    if (dv.company_id !== cid) throw new Error('Forbidden');
    const vd = (dv.vault_data as any) || {};
    // vault_data was saved with mapped field names (mapVault renames col→column, id→box_id)
    // so we explicitly remap back to PocketBase field names
    await pb.collection('vaults').create({
      warehouse_id:  vd.warehouse_id,
      row:           vd.row,
      col:           vd.column ?? vd.col,
      level:         vd.level,
      position:      vd.position,
      client_name:   vd.client_name,
      client_id:     vd.client_id,
      job_type:      vd.job_type,
      content_type:  vd.content_type,
      room_location: vd.room_location || [],
      vault_status:  vd.vault_status || [],
      packer:        vd.packer,
      photos:        vd.photos || [],
      comments:      vd.comments,
      estado:        vd.estado || 'PENDING',
      company_id:    cid,
    });
    await pb.collection('deleted_vaults').delete(restoreMatch[1]);
    return { success: true };
  }

  throw new Error(`Unknown POST path: ${p}`);
}

async function routePut(path: string, body: any): Promise<any> {
  const url = new URL(path, 'http://x');
  const p   = url.pathname;
  const uid = userId();
  const cid = companyId();

  // PUT /api/profile
  if (p === '/api/profile') {
    if (!uid) throw new Error('Not authenticated');
    const u = await pb.collection('users').update(uid, { name: body.name });
    return { name: u.name };
  }

  // PUT /api/company/info
  if (p === '/api/company/info') {
    const token = pb.authStore.token;
    if (!token) throw new Error('Not authenticated');
    const r = await fetch('/api/company/info', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: body.name }),
    });
    if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || 'Failed to update company'); }
    return r.json();
  }

  // PUT /api/boxes/:id
  const boxMatch = p.match(/^\/api\/boxes\/([^/]+)$/);
  if (boxMatch) {
    const existing = await pb.collection('vaults').getOne(boxMatch[1]);
    if (existing.company_id !== cid) throw new Error('Forbidden');
    validatePhotos(body.photos);
    const v = await pb.collection('vaults').update(boxMatch[1], {
      client_name:  body.client_name,
      client_id:    body.client_id,
      job_type:     body.job_type,
      content_type: body.content_type || body.contents_type,
      room_location: body.room_location || [],
      vault_status:  body.vault_status || [],
      packer:       body.packer,
      photos:       body.photos || [],
      comments:     body.comments,
      estado:       body.estado || body.status,
    });
    return mapVault(v);
  }

  // PUT /api/storage/:id
  const storageMatch = p.match(/^\/api\/storage\/([^/]+)$/);
  if (storageMatch) {
    const existingStorage = await pb.collection('storage_units').getOne(storageMatch[1]);
    if (existingStorage.company_id !== cid) throw new Error('Forbidden');
    validatePhotos(body.photos);
    await pb.collection('storage_units').update(storageMatch[1], {
      unit_name:   body.unit_name,
      address:     body.address || '',
      city:        body.city || '',
      state:       body.state || '',
      client_id:   body.client_name || '',
      capacity:    body.capacity || '',
      access_code: body.access_code || '',
      status:      body.status || 'AVAILABLE',
      photos:      body.photos || [],
      notes:       body.notes || '',
      slots:       body.slots ?? undefined,
      grid_rows:   body.grid_rows ?? undefined,
      grid_cols:   body.grid_cols ?? undefined,
    });
    const s = await pb.collection('storage_units').getOne(storageMatch[1]);
    return mapStorage(s);
  }

  // PUT /api/tasks/:id
  const taskMatch = p.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskMatch) {
    const token = pb.authStore.token;
    if (!token) throw new Error('Not authenticated');
    const r = await fetch(`/api/tasks/${taskMatch[1]}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error((data as any).error || 'Failed to update task');
    return data;
  }

  throw new Error(`Unknown PUT path: ${p}`);
}

async function routeDelete(path: string): Promise<any> {
  const url = new URL(path, 'http://x');
  const p   = url.pathname;
  const cid = companyId();

  // DELETE /api/boxes/:id — soft delete (move to deleted_vaults)
  const boxMatch = p.match(/^\/api\/boxes\/([^/]+)$/);
  if (boxMatch) {
    const vaultId = boxMatch[1];
    const v = await pb.collection('vaults').getOne(vaultId);
    if (v.company_id !== cid) throw new Error('Forbidden');
    if (cid) {
      await pb.collection('deleted_vaults').create({
        company_id: cid,
        vault_data: mapVault(v),
        deleted_by: userId() || '',
        reason: 'manual',
      });
    }
    await pb.collection('vaults').delete(vaultId);
    return null;
  }

  // DELETE /api/storage/:id
  const storageDelMatch = p.match(/^\/api\/storage\/([^/]+)$/);
  if (storageDelMatch) {
    const storDel = await pb.collection('storage_units').getOne(storageDelMatch[1]);
    if (storDel.company_id !== cid) throw new Error('Forbidden');
    await pb.collection('storage_units').delete(storageDelMatch[1]);
    return null;
  }

  // DELETE /api/chat/messages/:id
  const chatMatch = p.match(/^\/api\/chat\/messages\/([^/]+)$/);
  if (chatMatch) {
    const chatMsg = await pb.collection('chat_messages').getOne(chatMatch[1]);
    if (chatMsg.company_id !== cid || chatMsg.author_id !== userId()) throw new Error('Forbidden');
    await pb.collection('chat_messages').delete(chatMatch[1]);
    return null;
  }

  // DELETE /api/snapshots/:id
  const snapMatch = p.match(/^\/api\/snapshots\/([^/]+)$/);
  if (snapMatch) {
    const snap = await pb.collection('snapshots').getOne(snapMatch[1]);
    if (snap.company_id !== cid) throw new Error('Forbidden');
    await pb.collection('snapshots').delete(snapMatch[1]);
    return null;
  }

  // DELETE /api/deleted-boxes/:id — permanent delete
  const delMatch = p.match(/^\/api\/deleted-boxes\/([^/]+)$/);
  if (delMatch) {
    const dv = await pb.collection('deleted_vaults').getOne(delMatch[1]);
    if (dv.company_id !== cid) throw new Error('Forbidden');
    await pb.collection('deleted_vaults').delete(delMatch[1]);
    return null;
  }

  // DELETE /api/tasks/:id
  const taskDelMatch = p.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskDelMatch) {
    const token = pb.authStore.token;
    if (!token) throw new Error('Not authenticated');
    const r = await fetch(`/api/tasks/${taskDelMatch[1]}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.status !== 204 && !r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error((data as any).error || 'Failed to delete task');
    }
    return null;
  }

  throw new Error(`Unknown DELETE path: ${p}`);
}

// ─── Public API (same interface as before) ────────────────────────────────────
export const api = {
  get:    (path: string)            => routeGet(path).catch(safeError),
  post:   (path: string, body: any) => routePost(path, body).catch(safeError),
  put:    (path: string, body: any) => routePut(path, body).catch(safeError),
  delete: (path: string)            => routeDelete(path).catch(safeError),
};
