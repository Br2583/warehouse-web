import { pb } from './pb';
import { warmThumbnails } from './photo-url';
import { genCode } from './utils';

// ─── Auth token helpers (now PocketBase manages the session) ──────────────────
export const getToken = (): string | null => pb.authStore.token || null;
export const removeToken = () => pb.authStore.clear();

// ─── Helpers ──────────────────────────────────────────────────────────────────
const companyId = () => pb.authStore.model?.company_id as string | undefined;
const userId    = () => pb.authStore.model?.id as string | undefined;

// Escape values interpolated into PocketBase filter strings to prevent injection
export function sf(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// Fire-and-forget activity log — never blocks the main operation
function logActivity(data: {
  action: 'CREATED' | 'EDITED' | 'DELETED' | 'RESTORED' | 'MOVED';
  entity_type: 'vault' | 'storage' | 'task' | 'loose_item';
  entity_id: string;
  entity_label: string;
  before_data?: Record<string, any>;
}) {
  const cid  = companyId();
  const uid  = userId();
  const name = pb.authStore.model?.name as string || 'Unknown';
  if (!cid || !uid) return;
  pb.collection('activity_logs').create({
    company_id:   cid,
    user_id:      uid,
    user_name:    name,
    action:       data.action,
    entity_type:  data.entity_type,
    entity_id:    data.entity_id,
    entity_label: data.entity_label,
    before_data:  data.before_data ? JSON.stringify(data.before_data) : '',
  }).catch(() => {});
}

// Sanitize error messages before surfacing them to the UI
function safeError(e: any): never {
  const msg: string = e?.message || '';
  const internal = /collection|filter|record|pocketbase|constraint|unique|field|relation/i.test(msg);
  throw new Error(internal ? 'Operation failed. Please try again.' : msg || 'An error occurred.');
}

const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // matches the maxSize on the PocketBase file fields

/**
 * Guards the photos payload before it reaches PocketBase. Entries are either
 * File objects (a new upload) or strings (a filename already stored in R2 that
 * the user is keeping), so only the Files need checking.
 */
function validatePhotos(photos: unknown, maxPhotos = 6): void {
  if (!Array.isArray(photos)) return;
  if (photos.length > maxPhotos) throw new Error(`Maximum ${maxPhotos} photos allowed`);
  for (const p of photos) {
    if (p instanceof File && p.size > MAX_PHOTO_BYTES) {
      throw new Error('Each photo must be under 2MB after compression');
    }
  }
}

/**
 * Turns the photos payload into what PocketBase expects for a file field.
 *
 * Sending kept filenames and new Files together in the same field sets the
 * field to exactly that set — verified against the server. An empty array is
 * ignored by the SDK, so clearing every photo needs an empty string instead.
 */
function photosPayload(photos: unknown): (string | File)[] | string {
  const list = Array.isArray(photos) ? photos : [];
  const keep = list.filter((p): p is string => typeof p === 'string' && !!p);
  const files = list.filter((p): p is File => p instanceof File);
  const all = [...keep, ...files];
  return all.length ? all : '';
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
    pack_date:    v.pack_date || '',
    // Filenames stored in R2, not image data. Build a URL with photoUrl().
    photos:       v.photo_files || [],
    photo_ref:    { id: v.id, collectionName: 'vaults' },
    comments:     v.comments,
    estado:       v.estado,
    status:       v.estado,
    qr_token:     v.qr_token,
    created:      v.created,
  };
}

// Map a PocketBase storage_units record
function mapStorage(s: any) {
  const photos = Array.isArray(s.photo_files) ? s.photo_files : [];
  return {
    id:          s.id,
    photo_ref:   { id: s.id, collectionName: 'storage_units' },
    unit_name:   s.unit_name,
    address:     s.address || '',
    city:        s.city || '',
    state:       s.state || '',
    client_name: s.client_name || '',
    capacity:    s.capacity || '',
    access_code: s.access_code || '',
    status:      s.status || 'AVAILABLE',
    photos,
    notes:       s.notes || '',
    intake_date: s.intake_date || '',
    created:     s.created,
    slots:       s.slots || {},
    grid_rows:   s.grid_rows || 4,
    grid_cols:   s.grid_cols || 6,
  };
}

// Map a PocketBase loose_items record
function mapLooseItem(item: any) {
  const photos = Array.isArray(item.photo_files) ? item.photo_files : [];
  const condition = Array.isArray(item.condition)
    ? item.condition
    : item.condition ? (typeof item.condition === 'string' ? JSON.parse(item.condition) : item.condition) : [];
  return {
    id:             item.id,
    warehouse_id:   item.warehouse_id,
    client_name:    item.client_name || '',
    grid_x:         item.grid_x || '1',
    grid_y:         item.grid_y || '1',
    item_type:      (item.item_type || 'Boxes') as 'Boxes' | 'Furniture',
    furniture_type: item.furniture_type || '',
    color:          item.color || '',
    condition,
    status:         item.status || 'PENDING',
    photos,
    photo_ref:      { id: item.id, collectionName: 'loose_items' },
    comments:       item.comments || '',
    created:        item.created,
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
  const token = pb.authStore.token;
  if (!token) return { total_boxes: 0, statuses: {}, by_warehouse: {}, job_types: {}, recent: [], sla_count: 0, histogram: [], wh_map: {} };
  const r = await fetch('/api/stats', { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error('Failed to load stats');
  return r.json();
}

// ─── Path router ──────────────────────────────────────────────────────────────
async function routeGet(path: string): Promise<any> {
  const url  = new URL(path, 'http://x');
  const p    = url.pathname;
  const q    = url.searchParams;
  const cid  = companyId();
  const uid  = userId();

  // ── Boxes / Vaults ─────────────────────────────────────────────────────────
  if (p === '/api/boxes') {
    if (!cid) return [];
    const warehouseId  = q.get('warehouse_id');
    const clientFilter = q.get('client_name');
    let filter = `company_id="${cid}" && deleted_at = ""`;
    if (warehouseId)  filter += ` && warehouse_id="${sf(warehouseId)}"`;
    if (clientFilter) filter += ` && client_name="${sf(clientFilter)}"`;
    const items = await pb.collection('vaults').getFullList({
      filter,
      fields: 'id,warehouse_id,row,col,level,position,client_name,client_id,job_type,vault_status,content_type,room_location,packer,pack_date,comments,estado,qr_token,company_id,created,photo_files',
    });
    return items.map(mapVault).sort((a: any, b: any) => a.created < b.created ? -1 : 1);
  }

  // GET /api/boxes/:id
  const boxMatch = p.match(/^\/api\/boxes\/([^/]+)$/);
  if (boxMatch) {
    const v = await pb.collection('vaults').getOne(boxMatch[1]);
    if (v.deleted_at) throw new Error('This vault is in the recycle bin.');
    if (v.company_id !== cid) throw new Error('Forbidden');
    return mapVault(v);
  }

  // ── Warehouses list ────────────────────────────────────────────────────────
  if (p === '/api/warehouses') {
    if (!cid) return [];
    const whs = await pb.collection('warehouses').getFullList({ filter: `company_id="${cid}"`, fields: 'id,name,address,rows,cols,loose_rows,loose_cols' });
    return whs.map(w => ({ id: w.id, name: w.name, address: w.address, rows: Number(w.rows) || 10, cols: Number(w.cols) || 8, loose_rows: Number(w.loose_rows) || 5, loose_cols: Number(w.loose_cols) || 5 }));
  }

  // GET /api/warehouses/:id
  const whMatch = p.match(/^\/api\/warehouses\/([^/]+)$/);
  if (whMatch) {
    const w = await pb.collection('warehouses').getOne(whMatch[1]);
    if (w.company_id !== cid) throw new Error('Forbidden');
    return { id: w.id, name: w.name, address: w.address, loose_rows: Number(w.loose_rows) || 5, loose_cols: Number(w.loose_cols) || 5 };
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
      max_members: c.max_members || 50,
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
    // Fetch last 500 messages sorted newest-first, then reverse for display
    const page = await pb.collection('chat_messages').getList(1, 500, {
      filter: `company_id="${chatCid}"`,
      sort: '-sent_at,-id',
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
    if (!cid || !hasFilter) return { vaults: [], storageUnits: [] };
    let filter = `company_id="${cid}" && deleted_at = ""`;
    if (status)      filter += ` && estado="${sf(status)}"`;
    if (jobType)     filter += ` && job_type="${sf(jobType)}"`;
    if (warehouseId) filter += ` && warehouse_id="${sf(warehouseId)}"`;
    if (packer)      filter += ` && packer~"${sf(packer)}"`;
    if (q2)          filter += ` && (client_name~"${sf(q2)}" || packer~"${sf(q2)}" || position~"${sf(q2)}" || comments~"${sf(q2)}" || job_type~"${sf(q2)}")`;
    const items = await pb.collection('vaults').getFullList({
      filter,
      fields: 'id,warehouse_id,row,col,level,position,client_name,client_id,job_type,vault_status,content_type,room_location,packer,pack_date,comments,estado,qr_token,company_id,created,photo_files',
    });
    const vaults = items
      .sort((a: any, b: any) => a.created < b.created ? 1 : -1)
      .map(mapVault);
    let storageUnits: any[] = [];
    if (q2) {
      const storageItems = await pb.collection('storage_units').getFullList({
        filter: `company_id="${cid}" && (client_name~"${sf(q2)}" || unit_name~"${sf(q2)}" || address~"${sf(q2)}" || notes~"${sf(q2)}")`,
        fields: 'id,unit_name,client_name,address,city,state,status,intake_date,created',
      });
      storageUnits = storageItems
        .sort((a: any, b: any) => a.created < b.created ? 1 : -1)
        .map((s: any) => ({
          id:          s.id,
          unit_name:   s.unit_name,
          client_name: s.client_name,
          address:     s.address,
          city:        s.city,
          state:       s.state,
          status:      s.status,
          intake_date: s.intake_date || '',
          created:     s.created,
        }));
    }
    let looseItems: any[] = [];
    if (cid) {
      try {
        let looseFilter = `company_id="${cid}"`;
        if (q2) looseFilter += ` && (client_name~"${sf(q2)}" || comments~"${sf(q2)}" || furniture_type~"${sf(q2)}")`;
        if (status) looseFilter += ` && status="${sf(status)}"`;
        if (warehouseId) looseFilter += ` && warehouse_id="${sf(warehouseId)}"`;
        const raw = await pb.collection('loose_items').getFullList({
          filter: looseFilter,
          sort: '-id',
          fields: 'id,client_name,furniture_type,comments,warehouse_id,company_id,created',
        });
        looseItems = raw.map(mapLooseItem);
      } catch {}
    }
    return { vaults, storageUnits, looseItems };
  }

  // ── Snapshots ──────────────────────────────────────────────────────────────
  if (p === '/api/snapshots') {
    if (!cid) return [];
    const items = await pb.collection('snapshots').getFullList({
      filter: `company_id="${cid}"`,
      fields: 'id,date,company_id,data',
      sort: '-date',
    });
    return items
      .map(s => {
        const data = typeof s.data === 'string'
          ? (() => { try { return JSON.parse(s.data); } catch { return {}; } })()
          : (s.data || {});
        return {
          id:             s.id,
          date:           s.date,
          warehouse_name: data.warehouse_name || 'Snapshot',
          box_count:      data.box_count || 0,
          data,
        };
      });
  }

  // ── Storage Units ─────────────────────────────────────────────────────────
  if (p === '/api/storage') {
    if (!cid) return [];
    const items = await pb.collection('storage_units').getFullList({
      filter: `company_id="${cid}"`,
      fields: 'id,unit_name,address,city,state,client_name,capacity,access_code,status,notes,intake_date,photo_files,company_id,created,slots,grid_rows,grid_cols',
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

  // ── Loose Items ───────────────────────────────────────────────────────────
  if (p === '/api/loose-items') {
    if (!cid) return [];
    const wid = q.get('warehouse_id') || '';
    if (!wid) return [];
    const items = await pb.collection('loose_items').getFullList({
      filter: `company_id="${cid}" && warehouse_id="${sf(wid)}"`,
      sort: 'id',
      fields: 'id,warehouse_id,client_name,grid_x,grid_y,item_type,furniture_type,color,condition,status,comments,photo_files,created',
    });
    return items.map(mapLooseItem);
  }

  // ── Activity Log ──────────────────────────────────────────────────────────
  if (p === '/api/activity') {
    if (!cid) return { items: [], totalPages: 0, totalItems: 0, page: 1 };
    const actRole = pb.authStore.model?.role as string | undefined;
    if (actRole !== 'owner' && actRole !== 'manager') return { items: [], totalPages: 0, totalItems: 0, page: 1 };
    const pageNum   = Number(q.get('page') || '1');
    const perPage   = Number(q.get('perPage') || '25');
    const period    = q.get('period') || '';
    const filterUid = q.get('userId') || '';
    const filterAct = q.get('action') || '';
    // activity_logs has no deleted_at — filtering on it makes PocketBase reject
    // the whole query, which is what broke this page.
    let filter = `company_id="${cid}"`;
    if (period === 'today') {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      filter += ` && created >= "${start.toISOString()}"`;
    } else if (period === 'week') {
      filter += ` && created >= "${new Date(Date.now() - 7 * 86400000).toISOString()}"`;
    } else if (period === 'month') {
      filter += ` && created >= "${new Date(Date.now() - 30 * 86400000).toISOString()}"`;
    }
    if (filterUid) filter += ` && user_id="${sf(filterUid)}"`;
    if (filterAct) filter += ` && action="${sf(filterAct)}"`;
    const result = await pb.collection('activity_logs').getList(pageNum, perPage, {
      filter,
      sort: '-created',
      fields: 'id,user_id,user_name,action,entity_type,entity_id,entity_label,created,before_data',
    });
    return { items: result.items, totalPages: result.totalPages, totalItems: result.totalItems, page: result.page };
  }

  // ── Deleted Vaults ────────────────────────────────────────────────────────
  if (p === '/api/deleted-boxes') {
    if (!cid) return [];
    // The bin is now just the vaults carrying a deleted_at mark
    const items = await pb.collection('vaults').getFullList({
      filter: `company_id="${cid}" && deleted_at != ""`,
      fields: 'id,warehouse_id,position,client_name,deleted_at,row,col,level',
      sort: '-deleted_at',
    });
    return items.map(v => ({
      id:           v.id,
      box_id:       v.id,
      client_name:  v.client_name || '—',
      warehouse_id: v.warehouse_id,
      position:     v.position || `${v.row}${v.col}-L${v.level}`,
      deleted_at:   v.deleted_at,
    }));
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
    // Reject if the target position is already occupied
    const col = body.column ?? body.col;
    const existing = await pb.collection('vaults').getFullList({
      filter: `company_id="${cid}" && warehouse_id="${sf(body.warehouse_id)}" && row="${sf(body.row)}" && deleted_at = ""`,
      fields: 'id,col,level',
    });
    if (existing.some((v: any) => Number(v.col) === Number(col) && Number(v.level) === Number(body.level))) {
      throw new Error('This position is already occupied. Choose a different cell or move the existing vault first.');
    }
    const qr_token = genCode();
    let v: any;
    try {
      v = await pb.collection('vaults').create({
        box_id:       genCode(),
        company_id:   cid,
        warehouse_id: body.warehouse_id,
        row:          body.row,
        col:          col,
        level:        body.level,
        position:     body.position || `${body.row}${col}-L${body.level}`,
        client_name:  body.client_name,
        client_id:    body.client_id,
        job_type:     body.job_type,
        content_type: body.content_type || body.contents_type,
        room_location: body.room_location || [],
        vault_status:  body.vault_status || [],
        packer:       body.packer,
        pack_date:    body.pack_date || '',
        // Files go to R2; the SDK turns the payload into FormData when it sees them
        photo_files:  photosPayload(body.photos),
        comments:     body.comments,
        estado:       body.estado || body.status || 'PENDING',
        qr_token,
        created_by:   uid,
      });
    } catch (e: any) {
      // Unique constraint violation: another request created a vault at this position concurrently
      if (e?.status === 400 && JSON.stringify(e?.data || {}).includes('not_unique')) {
        throw new Error('This position was just taken by another user. Please choose a different cell.');
      }
      throw e;
    }
    warmThumbnails({ id: v.id, collectionName: 'vaults' }, v.photo_files);
    logActivity({ action: 'CREATED', entity_type: 'vault', entity_id: v.id, entity_label: `Vault ${v.row}${v.col}-L${v.level} · ${body.client_name || '—'} · ${body.job_type || '—'}` });
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
    logActivity({ action: 'CREATED', entity_type: 'task', entity_id: (data as any).id || '', entity_label: `Task: ${body.title || body.type || '—'}` });
    return data;
  }

  // ── Chat ───────────────────────────────────────────────────────────────────
  if (p === '/api/chat/messages') {
    // Route through the HTTP handler so the 30 msg/min rate limit is enforced.
    const pbToken = pb.authStore.token;
    if (!pbToken) throw new Error('Not authenticated');
    const r = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pbToken}` },
      body: JSON.stringify({ text: body.text, sender_name: body.sender_name }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error((data as any).error || 'Failed to send message');
    return data;
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
      client_name: body.client_name || '',
      capacity:    body.capacity || '',
      access_code: body.access_code || '',
      status:      body.status || 'AVAILABLE',
      photo_files: photosPayload(body.photos),
      notes:       body.notes || '',
      intake_date: body.intake_date || '',
      created_by:  uid,
    });
    logActivity({ action: 'CREATED', entity_type: 'storage', entity_id: s.id, entity_label: `Storage: ${body.unit_name}` });
    return mapStorage(s);
  }

  // ── Snapshots: create ─────────────────────────────────────────────────────
  const snapCreateMatch = p.match(/^\/api\/snapshots\/create\/([^/]+)$/);
  if (snapCreateMatch) {
    if (!cid) throw new Error('No company');
    const warehouseRef = snapCreateMatch[1];
    let filter = `company_id="${cid}" && deleted_at = ""`;
    if (warehouseRef && warehouseRef !== 'all') filter += ` && warehouse_id="${sf(warehouseRef)}"`;
    const vaults = await pb.collection('vaults').getFullList({
      filter,
      fields: 'id,warehouse_id,row,col,level,position,client_name,client_id,job_type,vault_status,content_type,room_location,packer,pack_date,comments,estado,qr_token,company_id,created,photo_files',
    });
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
    const role = pb.authStore.model?.role as string | undefined;
    if (role !== 'owner' && role !== 'manager') throw new Error('Only managers and owners can restore vaults');

    // The vault was never destroyed — it is the same row, still carrying its
    // id, box_id, qr_token and photos. Restoring is clearing the mark, so the
    // QR label printed and stuck on the physical vault keeps working.
    let v: any;
    try {
      v = await pb.collection('vaults').getFirstListItem(
        `id="${sf(restoreMatch[1])}" && company_id="${cid}" && deleted_at != ""`
      );
    } catch {
      throw new Error('This vault has already been restored or permanently deleted.');
    }

    // Someone may have taken the slot while it sat in the bin
    const occupying = await pb.collection('vaults').getFullList({
      filter: `company_id="${cid}" && warehouse_id="${sf(v.warehouse_id)}" && row="${sf(v.row)}" && deleted_at = ""`,
      fields: 'id,col,level,client_name,position',
    });
    const occupant = occupying.find((o: any) => Number(o.col) === Number(v.col) && Number(o.level) === Number(v.level));
    if (occupant) {
      const pos = v.position || `${v.row}${v.col}-L${v.level}`;
      const who = occupant.client_name ? ` (${occupant.client_name})` : '';
      throw new Error(`Position ${pos} is already occupied${who}. Move or delete that vault first, then restore this one.`);
    }

    await pb.collection('vaults').update(v.id, { deleted_at: '', deleted_by: '' });
    logActivity({ action: 'RESTORED', entity_type: 'vault', entity_id: v.id, entity_label: `Vault ${v.position || '—'} · ${v.client_name || '—'}` });
    return { success: true };
  }

  // ── Loose Items ───────────────────────────────────────────────────────────
  if (p === '/api/loose-items') {
    if (!cid) throw new Error('No company');
    validatePhotos(body.photos, 4);
    // Straight to PocketBase rather than through the API route: a File cannot
    // survive JSON.stringify, and the collection already allows same-company writes.
    const rec = await pb.collection('loose_items').create({
      company_id:     cid,
      warehouse_id:   body.warehouse_id,
      client_name:    body.client_name || '',
      grid_x:         String(body.grid_x ?? '1'),
      grid_y:         String(body.grid_y ?? '1'),
      item_type:      body.item_type || 'Boxes',
      furniture_type: body.furniture_type || '',
      color:          body.color || '',
      condition:      body.condition || [],
      status:         body.status || 'PENDING',
      comments:       body.comments || '',
      photo_files:    photosPayload(body.photos),
    });
    warmThumbnails({ id: rec.id, collectionName: 'loose_items' }, rec.photo_files);
    const created = mapLooseItem(rec);
    logActivity({ action: 'CREATED', entity_type: 'loose_item', entity_id: created.id, entity_label: `Loose Item · ${created.client_name || '—'} · ${created.item_type || '—'}` });
    return created;
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
    if (!body.name?.trim()) throw new Error('Name is required');
    if (body.name.trim().length > 100) throw new Error('Name must be 100 characters or fewer');
    const u = await pb.collection('users').update(uid, { name: body.name.trim() });
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
    if (existing.deleted_at) throw new Error('This vault is in the recycle bin. Restore it before editing.');
    validatePhotos(body.photos);
    const beforeSnapshot = mapVault(existing);
    const v = await pb.collection('vaults').update(boxMatch[1], {
      client_name:  body.client_name,
      client_id:    body.client_id,
      job_type:     body.job_type,
      content_type: body.content_type || body.contents_type,
      room_location: body.room_location || [],
      vault_status:  body.vault_status || [],
      packer:       body.packer,
      pack_date:    body.pack_date,
      photo_files:  photosPayload(body.photos),
      comments:     body.comments,
      estado:       body.estado || body.status,
    });
    warmThumbnails({ id: v.id, collectionName: 'vaults' }, v.photo_files);
    logActivity({ action: 'EDITED', entity_type: 'vault', entity_id: v.id, entity_label: `Vault ${v.row}${v.col}-L${v.level} · ${v.client_name || '—'}`, before_data: beforeSnapshot });
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
      client_name: body.client_name || '',
      capacity:    body.capacity || '',
      access_code: body.access_code || '',
      status:      body.status || 'AVAILABLE',
      photo_files: photosPayload(body.photos),
      notes:       body.notes || '',
      intake_date: body.intake_date ?? undefined,
      slots:       body.slots ?? undefined,
      grid_rows:   body.grid_rows ?? undefined,
      grid_cols:   body.grid_cols ?? undefined,
    });
    logActivity({ action: 'EDITED', entity_type: 'storage', entity_id: storageMatch[1], entity_label: `Storage: ${body.unit_name || existingStorage.unit_name}` });
    const s = await pb.collection('storage_units').getOne(storageMatch[1]);
    return mapStorage(s);
  }

  // PUT /api/boxes/:id/move
  const moveMatch = p.match(/^\/api\/boxes\/([^/]+)\/move$/);
  if (moveMatch) {
    const vaultId = moveMatch[1];
    if (!cid) throw new Error('No company');
    const { warehouse_id, row, col, level, confirmSwap } = body;
    const destCol   = Number(col);
    const destLevel = Number(level);
    if (!warehouse_id || !row || isNaN(destCol) || destCol < 1 || isNaN(destLevel) || destLevel < 1) {
      throw new Error('Invalid move parameters');
    }

    const source = await pb.collection('vaults').getOne(vaultId);
    if (source.company_id !== cid) throw new Error('Forbidden');
    if (source.deleted_at) throw new Error('This vault is in the recycle bin. Restore it before moving.');

    // No-op: already at the requested position
    if (
      source.warehouse_id === warehouse_id &&
      source.row === row &&
      Number(source.col) === destCol &&
      Number(source.level) === destLevel
    ) {
      return { moved: false, unchanged: true };
    }

    const newPosition = `${row}${destCol}-L${destLevel}`;
    // Filter by company + warehouse + row, then check col/level in JS to avoid field-type ambiguity
    const candidates = await pb.collection('vaults').getFullList({
      filter: `company_id="${cid}" && warehouse_id="${sf(warehouse_id)}" && row="${sf(row)}" && deleted_at = ""`,
      fields: 'id,client_name,job_type,position,row,col,level,warehouse_id',
    });
    const occupant = candidates.find((v: any) =>
      v.id !== vaultId && Number(v.col) === destCol && Number(v.level) === destLevel
    ) ?? null;

    if (occupant) {
      if (!confirmSwap) {
        return {
          occupied: true,
          occupant: { id: occupant.id, client_name: occupant.client_name, job_type: occupant.job_type, position: occupant.position },
        };
      }
      const oldPosition = source.position || `${source.row}${source.col}-L${source.level}`;
      // Helper: retry a PB PATCH up to 3 times with exponential backoff
      const patchWithRetry = async (id: string, data: object, attempts = 3): Promise<void> => {
        for (let i = 0; i < attempts; i++) {
          try { await pb.collection('vaults').update(id, data); return; }
          catch (e) {
            if (i === attempts - 1) throw e;
            await new Promise(r => setTimeout(r, 150 * Math.pow(2, i)));
          }
        }
      };
      // Step 1: move source to destination
      await patchWithRetry(vaultId, { warehouse_id, row, col: destCol, level: destLevel, position: newPosition });
      try {
        // Step 2: move occupant to source's old position (3 retries with backoff)
        await patchWithRetry(occupant.id, {
          warehouse_id: source.warehouse_id,
          row: source.row, col: Number(source.col), level: Number(source.level),
          position: oldPosition,
        });
      } catch {
        // Step 2 failed: rollback step 1 with retries
        try {
          await patchWithRetry(vaultId, {
            warehouse_id: source.warehouse_id,
            row: source.row, col: Number(source.col), level: Number(source.level),
            position: oldPosition,
          });
          throw new Error('Swap failed — please try again');
        } catch (rbErr: any) {
          if (rbErr?.message === 'Swap failed — please try again') throw rbErr;
          // Rollback also failed after retries — log and surface to user
          logActivity({ action: 'MOVED', entity_type: 'vault', entity_id: vaultId, entity_label: `⚠️ Swap incomplete: ${newPosition} moved but ${occupant.position} rollback failed — manual correction needed` });
          throw new Error('Swap partially failed — please refresh and verify positions manually');
        }
      }
      logActivity({ action: 'MOVED', entity_type: 'vault', entity_id: vaultId, entity_label: `Vault swapped: ${source.position || `${source.row}${source.col}-L${source.level}`} ↔ ${newPosition}` });
      return { moved: true, swapped: true };
    }

    await pb.collection('vaults').update(vaultId, { warehouse_id, row, col: destCol, level: destLevel, position: newPosition });
    logActivity({ action: 'MOVED', entity_type: 'vault', entity_id: vaultId, entity_label: `Vault ${source.position || `${source.row}${source.col}-L${source.level}`} → ${newPosition}` });
    return { moved: true, swapped: false };
  }

  // PUT /api/activity/:id/revert — undo a vault edit using stored before_data
  const revertMatch = p.match(/^\/api\/activity\/([^/]+)\/revert$/);
  if (revertMatch) {
    const actId = revertMatch[1];
    const log = await pb.collection('activity_logs').getOne(actId);
    if (log.company_id !== cid) throw new Error('Forbidden');
    if (log.action !== 'EDITED' || log.entity_type !== 'vault') throw new Error('Can only revert vault edits');
    if (!log.before_data) throw new Error('No snapshot available for this action');
    let prev: Record<string, any>;
    try { prev = JSON.parse(log.before_data); } catch { throw new Error('Snapshot data is corrupted'); }
    let target: any;
    try { target = await pb.collection('vaults').getOne(log.entity_id, { fields: 'id,company_id,deleted_at' }); }
    catch { throw new Error('This vault has been deleted and cannot be reverted'); }
    if (target.deleted_at) throw new Error('This vault is in the recycle bin. Restore it before reverting.');
    // Photos are deliberately left alone: a photo removed in the edit being
    // undone is already gone from R2, so "restoring" its filename would point
    // at nothing. Reverting covers the text fields only.
    await pb.collection('vaults').update(log.entity_id, {
      client_name:   prev.client_name,
      client_id:     prev.client_id,
      job_type:      prev.job_type,
      content_type:  prev.content_type,
      room_location: prev.room_location || [],
      vault_status:  prev.vault_status || [],
      packer:        prev.packer,
      pack_date:     prev.pack_date,
      comments:      prev.comments,
      estado:        prev.estado,
    });
    logActivity({ action: 'EDITED', entity_type: 'vault', entity_id: log.entity_id, entity_label: `Vault ${prev.position || '—'} · ${prev.client_name || '—'} (reverted)` });
    return { success: true };
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
    const statusSuffix = body.status ? ` → ${body.status}` : '';
    logActivity({ action: 'EDITED', entity_type: 'task', entity_id: taskMatch[1], entity_label: `Task: ${(data as any).title || body.title || '—'}${statusSuffix}` });
    return data;
  }

  // PUT /api/loose-items/:id
  const looseItemMatch = p.match(/^\/api\/loose-items\/([^/]+)$/);
  if (looseItemMatch) {
    validatePhotos(body.photos, 4);
    const existingLoose = await pb.collection('loose_items').getOne(looseItemMatch[1]);
    if (existingLoose.company_id !== cid) throw new Error('Forbidden');
    const rec = await pb.collection('loose_items').update(looseItemMatch[1], {
      client_name:    body.client_name || '',
      grid_x:         String(body.grid_x ?? existingLoose.grid_x ?? '1'),
      grid_y:         String(body.grid_y ?? existingLoose.grid_y ?? '1'),
      item_type:      body.item_type || 'Boxes',
      furniture_type: body.furniture_type || '',
      color:          body.color || '',
      condition:      body.condition || [],
      status:         body.status || 'PENDING',
      comments:       body.comments || '',
      photo_files:    photosPayload(body.photos),
    });
    warmThumbnails({ id: rec.id, collectionName: 'loose_items' }, rec.photo_files);
    const updated = mapLooseItem(rec);
    logActivity({ action: 'EDITED', entity_type: 'loose_item', entity_id: updated.id, entity_label: `Loose Item · ${updated.client_name || '—'} · ${updated.item_type || '—'}` });
    return updated;
  }

  // PUT /api/warehouses/:id/grid — update rows/cols
  const gridMatch = p.match(/^\/api\/warehouses\/([^/]+)\/grid$/);
  if (gridMatch) {
    const wh = await pb.collection('warehouses').getOne(gridMatch[1]);
    if (wh.company_id !== cid) throw new Error('Forbidden');
    const rows = Math.min(10, Math.max(1, Number(body.rows) || wh.rows));
    const cols = Math.min(11, Math.max(1, Number(body.cols) || wh.cols));
    await pb.collection('warehouses').update(gridMatch[1], { rows, cols });
    return { rows, cols };
  }

  // PUT /api/warehouses/:id/loose-grid
  const looseGridMatch = p.match(/^\/api\/warehouses\/([^/]+)\/loose-grid$/);
  if (looseGridMatch) {
    const wh = await pb.collection('warehouses').getOne(looseGridMatch[1]);
    if (wh.company_id !== cid) throw new Error('Forbidden');
    const rows = Math.min(20, Math.max(1, Number(body.loose_rows) || 5));
    const cols = Math.min(20, Math.max(1, Number(body.loose_cols) || 5));
    await pb.collection('warehouses').update(looseGridMatch[1], { loose_rows: rows, loose_cols: cols });
    return { loose_rows: rows, loose_cols: cols };
  }

  throw new Error(`Unknown PUT path: ${p}`);
}

async function routeDelete(path: string): Promise<any> {
  const url = new URL(path, 'http://x');
  const p   = url.pathname;
  const cid = companyId();

  // DELETE /api/boxes/:id — marks the vault deleted; the record and its photos stay put
  const boxMatch = p.match(/^\/api\/boxes\/([^/]+)$/);
  if (boxMatch) {
    const vaultId = boxMatch[1];
    const v = await pb.collection('vaults').getOne(vaultId);
    if (v.company_id !== cid) throw new Error('Forbidden');
    if (v.deleted_at) return null; // ya estaba en la papelera
    const position = v.position || `${v.row}${v.col}-L${v.level}`;
    // Nothing is destroyed or copied: the row keeps its id, box_id, qr_token and
    // photos, so a restore leaves the printed QR label still pointing at it. The
    // unique position index is partial (WHERE deleted_at = ''), so the slot frees up.
    await pb.collection('vaults').update(vaultId, {
      deleted_at: new Date().toISOString(),
      deleted_by: userId() || '',
    });
    const { photos: _p, ...vaultSnap } = mapVault(v);
    logActivity({ action: 'DELETED', entity_type: 'vault', entity_id: vaultId, entity_label: `Vault ${position} · ${v.client_name || '—'}`, before_data: vaultSnap });
    return null;
  }

  // DELETE /api/storage/:id
  const storageDelMatch = p.match(/^\/api\/storage\/([^/]+)$/);
  if (storageDelMatch) {
    const storDel = await pb.collection('storage_units').getOne(storageDelMatch[1]);
    if (storDel.company_id !== cid) throw new Error('Forbidden');
    logActivity({ action: 'DELETED', entity_type: 'storage', entity_id: storageDelMatch[1], entity_label: `Storage: ${storDel.unit_name}` });
    await pb.collection('storage_units').delete(storageDelMatch[1]);
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
    // Only a vault already in the bin can be destroyed for good
    let dv: any;
    try {
      dv = await pb.collection('vaults').getFirstListItem(
        `id="${sf(delMatch[1])}" && company_id="${cid}" && deleted_at != ""`
      );
    } catch {
      throw new Error('This vault has already been restored or permanently deleted.');
    }
    const dvId = dv.id as string;
    const originalVaultId = dvId;
    // Removing the record also removes its photos from R2 — PocketBase handles that
    await pb.collection('vaults').delete(dvId);
    // Clean up activity_log entries via server-side route (uses admin token to bypass PB rules)
    const token = pb.authStore.token;
    if (token && cid) {
      fetch('/api/activity/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ originalVaultId, dvId, companyId: cid }),
      }).catch(() => {});
    }
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
    logActivity({ action: 'DELETED', entity_type: 'task', entity_id: taskDelMatch[1], entity_label: 'Task deleted' });
    return null;
  }

  // DELETE /api/loose-items/:id
  const looseDelMatch = p.match(/^\/api\/loose-items\/([^/]+)$/);
  if (looseDelMatch) {
    const token = getToken() || '';
    const r = await fetch(`/api/loose-items/${looseDelMatch[1]}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.status !== 204 && !r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error((data as any).error || 'Failed to delete item');
    }
    logActivity({ action: 'DELETED', entity_type: 'loose_item', entity_id: looseDelMatch[1], entity_label: 'Loose Item deleted' });
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
