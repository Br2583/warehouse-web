import { pb } from './pb';
import { genCode } from './utils';

export const BACKEND_URL = 'https://pocketbase-production-e699.up.railway.app';

// ─── Auth token helpers (now PocketBase manages the session) ──────────────────
export const getToken = (): string | null => pb.authStore.token || null;
export const setToken = (_t: string) => {};
export const removeToken = () => pb.authStore.clear();

// ─── Helpers ──────────────────────────────────────────────────────────────────
const companyId = () => pb.authStore.model?.company_id as string | undefined;
const userId    = () => pb.authStore.model?.id as string | undefined;

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
    client_name: s.client_id || '',
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
  return {
    id:            m.id,
    sender_name:   m.author_name,
    sender_email:  m.author_id,
    sender_photo:  m.author_avatar,
    text:          m.content,
    timestamp:     m.created?.replace(' ', 'T') ?? new Date().toISOString(),
  };
}

// Aggregate vaults into stats shape
async function buildStats() {
  const cid = companyId();
  if (!cid) return { total_boxes: 0, statuses: {}, by_warehouse: {} };

  const [vaults, warehouses] = await Promise.all([
    pb.collection('vaults').getFullList({ filter: `company_id="${cid}"`, fields: 'id,estado,warehouse_id,job_type' }),
    pb.collection('warehouses').getFullList({ filter: `company_id="${cid}"`, fields: 'id,name' }),
  ]);

  const whMap: Record<string, string> = {};
  for (const w of warehouses) whMap[w.id] = w.name;

  const statuses: Record<string, number> = {};
  const by_warehouse: Record<string, number> = {};
  const job_types: Record<string, number> = {};
  for (const v of vaults) {
    const s = v.estado || 'PENDING';
    statuses[s] = (statuses[s] || 0) + 1;
    const wName = whMap[v.warehouse_id] || 'Unknown';
    by_warehouse[wName] = (by_warehouse[wName] || 0) + 1;
    const jt = v.job_type || 'Other';
    job_types[jt] = (job_types[jt] || 0) + 1;
  }
  return { total_boxes: vaults.length, statuses, by_warehouse, job_types };
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
      pin_changed:  !!m.pin,
    };
  }

  // ── Boxes / Vaults ─────────────────────────────────────────────────────────
  if (p === '/api/boxes') {
    if (!cid) return [];
    const warehouseId = q.get('warehouse_id');
    const filter = warehouseId ? `company_id="${cid}" && warehouse_id="${warehouseId}"` : `company_id="${cid}"`;
    const items = await pb.collection('vaults').getFullList({ filter });
    return items.map(mapVault).sort((a: any, b: any) => a.created < b.created ? -1 : 1);
  }

  // GET /api/boxes/:id
  const boxMatch = p.match(/^\/api\/boxes\/([^/]+)$/);
  if (boxMatch) {
    const v = await pb.collection('vaults').getOne(boxMatch[1]);
    return mapVault(v);
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
      fields: 'id,name,email,avatar,role',
    });
    return members.map(m => ({
      user_id: m.id,
      name:    m.name,
      email:   m.email,
      picture: m.avatar,
      role:    m.role,
    }));
  }

  // ── Work Orders ────────────────────────────────────────────────────────────
  if (p === '/api/work-orders') {
    if (!cid) return [];
    const items = await pb.collection('work_orders').getFullList({
      filter:  `company_id="${cid}"`,
    });
    const phaseMap: Record<string, number> = { PENDING: 1, IN_PROGRESS: 2, REVIEW: 3, DONE: 4 };
    return items
      .sort((a: any, b: any) => a.created < b.created ? 1 : -1)
      .map(o => ({
        id:          o.id,
        work_order_id: o.id,
        client_name: o.notes ? o.notes.split('\n')[0] : 'Work Order',
        work_type:   o.type,
        type:        o.type,
        status:      (o.status || 'PENDING').toLowerCase(),
        phase:       phaseMap[o.status] || 1,
        date:        o.due_date ? o.due_date.replace(' ', 'T').split('T')[0] : o.created?.split(' ')[0],
        notes:       o.notes,
        assigned_to: o.assigned_to,
        vault_id:    o.vault_id,
        created:     o.created,
      }));
  }

  // GET /api/work-orders/search-volts/:q — vault search for work order creation
  const svMatch = p.match(/^\/api\/work-orders\/search-volts\/(.+)$/);
  if (svMatch) {
    if (!cid) return [];
    const q = decodeURIComponent(svMatch[1]).toLowerCase();
    const vaults = await pb.collection('vaults').getFullList({
      filter: `company_id="${cid}" && (client_name~"${q}" || position~"${q}" || packer~"${q}")`,
      sort: 'client_name',
    });
    return vaults.map(mapVault);
  }

  // GET /api/work-orders/:id
  const woMatch = p.match(/^\/api\/work-orders\/([^/]+)$/);
  if (woMatch) {
    const phaseMap2: Record<string, number> = { PENDING: 1, IN_PROGRESS: 2, REVIEW: 3, DONE: 4 };
    const o = await pb.collection('work_orders').getOne(woMatch[1]);
    return {
      id:            o.id,
      work_order_id: o.id,
      client_name:   o.notes ? o.notes.split('\n')[0] : 'Work Order',
      work_type:     o.type,
      status:        (o.status || 'PENDING').toLowerCase(),
      phase:         phaseMap2[o.status] || 1,
      date:          o.due_date ? o.due_date.replace(' ', 'T').split('T')[0] : o.created?.split(' ')[0],
      notes:         o.notes,
      vault_ids:     o.vault_id ? [o.vault_id] : [],
      vaults:        [],
    };
  }

  // ── Chat ───────────────────────────────────────────────────────────────────
  if (p === '/api/chat/messages') {
    let chatCid = cid;
    if (!chatCid && uid) {
      const freshUser = await pb.collection('users').getOne(uid);
      chatCid = freshUser.company_id;
    }
    if (!chatCid) return [];
    const items = await pb.collection('chat_messages').getFullList({
      filter: `company_id="${chatCid}"`,
    });
    return items
      .sort((a: any, b: any) => a.created < b.created ? -1 : 1)
      .map(mapMessage);
  }

  // ── Search ────────────────────────────────────────────────────────────────
  if (p === '/api/search/global') {
    const q2 = q.get('q') || '';
    if (!cid || !q2) return [];
    const filter = `company_id="${cid}" && (client_name~"${q2}" || packer~"${q2}" || position~"${q2}" || comments~"${q2}" || estado="${q2}")`;
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
    const items = await pb.collection('storage_units').getFullList({});
    return items
      .sort((a: any, b: any) => a.created < b.created ? 1 : -1)
      .map(mapStorage);
  }

  const storageOneMatch = p.match(/^\/api\/storage\/([^/]+)$/);
  if (storageOneMatch) {
    const s = await pb.collection('storage_units').getOne(storageOneMatch[1]);
    return mapStorage(s);
  }

  // ── Deleted Vaults ────────────────────────────────────────────────────────
  if (p === '/api/deleted-boxes') {
    if (!cid) return [];
    const items = await pb.collection('deleted_vaults').getFullList({
      filter: `company_id="${cid}"`,
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

  // ── Auth: change-pin ──────────────────────────────────────────────────────
  if (p === '/api/auth/change-pin') {
    if (!uid) throw new Error('Not authenticated');
    const current = pb.authStore.model?.pin;
    if (current && current !== body.current_pin) throw new Error('Incorrect PIN');
    await pb.collection('users').update(uid, { pin: body.new_pin });
    return { success: true };
  }

  // ── Boxes / Vaults ─────────────────────────────────────────────────────────
  if (p === '/api/boxes') {
    if (!cid) throw new Error('No company');
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
    if (!cid) throw new Error('No company');
    const code = genCode();
    await pb.collection('companies').update(cid, { invite_code: code });
    return { invite_code: code };
  }

  // ── Work Orders ────────────────────────────────────────────────────────────
  if (p === '/api/work-orders') {
    if (!cid) throw new Error('No company');
    const o = await pb.collection('work_orders').create({
      company_id:  cid,
      type:        body.work_type || body.type || 'Cleaning',
      vault_id:    body.vault_ids?.[0] || body.vault_id || '',
      assigned_to: body.assigned_to || '',
      status:      'PENDING',
      due_date:    body.date || '',
      notes:       body.notes || body.client_name || '',
      created_by:  uid,
    });
    return { ...o };
  }

  // PUT work-order volt status — /api/work-orders/:id/volt
  const woVoltMatch = p.match(/^\/api\/work-orders\/([^/]+)\/volt$/);
  if (woVoltMatch) {
    const o = await pb.collection('work_orders').getOne(woVoltMatch[1]);
    const newStatus = body.status === 'completed' ? 'DONE' : body.status.toUpperCase().replace('-', '_');
    await pb.collection('work_orders').update(o.id, { status: newStatus });
    return { success: true };
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
      company_id:    chatCid,
      author_id:     uid || body.sender_email,
      author_name:   body.sender_name || pb.authStore.model?.name,
      author_avatar: body.sender_photo || '',
      content:       body.text,
      type:          'text',
    });
    return mapMessage(m);
  }

  // ── Storage Units ─────────────────────────────────────────────────────────
  if (p === '/api/storage') {
    if (!cid) throw new Error('No company');
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
        vaults: vaults.map(mapVault),
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

  // PUT /api/boxes/:id
  const boxMatch = p.match(/^\/api\/boxes\/([^/]+)$/);
  if (boxMatch) {
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

  // PUT /api/work-orders/:id/phase — update phase only
  const woPhaseMatch = p.match(/^\/api\/work-orders\/([^/]+)\/phase$/);
  if (woPhaseMatch) {
    const phaseToStatus: Record<number, string> = { 1: 'PENDING', 2: 'IN_PROGRESS', 3: 'REVIEW', 4: 'DONE' };
    await pb.collection('work_orders').update(woPhaseMatch[1], {
      status: phaseToStatus[body.phase as number] || 'PENDING',
    });
    return { success: true };
  }

  // PUT /api/work-orders/:id
  const woMatch = p.match(/^\/api\/work-orders\/([^/]+)$/);
  if (woMatch) {
    const statusMap: Record<string, string> = {
      pending: 'PENDING', in_progress: 'IN_PROGRESS', review: 'REVIEW', completed: 'DONE',
    };
    await pb.collection('work_orders').update(woMatch[1], {
      type:        body.work_type || body.type,
      status:      statusMap[body.status] || body.status?.toUpperCase() || 'PENDING',
      notes:       body.notes,
      assigned_to: body.assigned_to,
      due_date:    body.date,
    });
    return { success: true };
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
    await pb.collection('storage_units').delete(storageDelMatch[1]);
    return null;
  }

  // DELETE /api/chat/messages/:id
  const chatMatch = p.match(/^\/api\/chat\/messages\/([^/]+)$/);
  if (chatMatch) {
    await pb.collection('chat_messages').delete(chatMatch[1]);
    return null;
  }

  // DELETE /api/snapshots/:id
  const snapMatch = p.match(/^\/api\/snapshots\/([^/]+)$/);
  if (snapMatch) {
    await pb.collection('snapshots').delete(snapMatch[1]);
    return null;
  }

  // DELETE /api/deleted-boxes/:id — permanent delete
  const delMatch = p.match(/^\/api\/deleted-boxes\/([^/]+)$/);
  if (delMatch) {
    await pb.collection('deleted_vaults').delete(delMatch[1]);
    return null;
  }

  // DELETE /api/work-orders/:id
  const woMatch = p.match(/^\/api\/work-orders\/([^/]+)$/);
  if (woMatch) {
    await pb.collection('work_orders').delete(woMatch[1]);
    return null;
  }

  throw new Error(`Unknown DELETE path: ${p}`);
}

// ─── Public API (same interface as before) ────────────────────────────────────
export const api = {
  get: (path: string) => routeGet(path),
  post: (path: string, body: any) => routePost(path, body),
  put: (path: string, body: any) => routePut(path, body),
  delete: (path: string) => routeDelete(path),
};
