'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArchiveBoxIcon, PlusIcon, MagnifyingGlassIcon, TrashIcon, XMarkIcon, CameraIcon,
  Squares2X2Icon, ListBulletIcon, PencilIcon, ChevronLeftIcon, ChevronRightIcon,
  QrCodeIcon, Cog6ToothIcon, ArrowsRightLeftIcon, ArrowPathIcon,
} from '@/components/icons';
import ConfirmModal from '@/components/ConfirmModal';
import Sidebar from '@/components/Sidebar';
import VaultForm, { VaultFormData } from '@/components/VaultForm';
import PhotoAddButton from '@/components/PhotoAddButton';
import QRScanner from '@/components/QRScanner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useParams, useSearchParams } from 'next/navigation';
import { compressImage } from '@/lib/compress-image';
import { QRCodeSVG } from 'qrcode.react';
import { STATUS_COLORS, STATUS_CELL } from '@/lib/constants';

interface Box {
  box_id: string;
  warehouse_id: string;
  row: string;
  column: number;
  level: number;
  position: string;
  client_name: string;
  job_type: string;
  vault_status: string[];
  content_type: string;
  room_location: string[];
  packer: string;
  pack_date: string;
  photos: string[];
  comments: string;
  estado: string;
  status: string;
  created: string;
}

interface LooseItem {
  id: string;
  warehouse_id: string;
  client_name: string;
  grid_x: string;
  grid_y: string;
  item_type: 'Boxes' | 'Furniture';
  furniture_type: string;
  color: string;
  condition: string[];
  status: string;
  photos: string[];
  comments: string;
  created: string;
}

interface LooseForm {
  client_name: string;
  item_type: 'Boxes' | 'Furniture';
  furniture_type: string;
  color: string;
  condition: string[];
  status: string;
  photos: string[];
  comments: string;
}

const ROWS    = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const COLUMNS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const FURNITURE_TYPES = ['Sofa', 'Table', 'Chair', 'Bed', 'Dresser', 'TV', 'Other'];
const LOOSE_CONDITIONS = ['Total Loss', 'Needs Cleaning', 'Ready to Go', 'Storage Only'];
const LOOSE_STATUSES = ['PENDING', 'READY', 'DELIVERED'];
const ITEM_EMOJI: Record<string, string> = {
  Boxes: '📦', Sofa: '🛋️', Table: '🪑', Chair: '🪑', Bed: '🛏️', Dresser: '🗄️', TV: '📺', Other: '📋',
};

const emptyForm = (): VaultFormData => ({
  client_name:   '',
  row:           'A',
  column:        1,
  level:         1,
  job_type:      'Moving',
  contents_type: 'Boxes',
  room_location: [],
  vault_status:  [],
  packer:        '',
  pack_date:     new Date().toISOString().split('T')[0],
  status:        'PENDING',
  comments:      '',
  photos:        [],
});

const emptyLooseForm = (): LooseForm => ({
  client_name:    '',
  item_type:      'Boxes',
  furniture_type: '',
  color:          '',
  condition:      [],
  status:         'PENDING',
  photos:         [],
  comments:       '',
});


export default function WarehouseDetailPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { canManage, user } = useAuth();
  const { showToast } = useToast();
  const warehouseId = id as string;
  const autoOpenedVaultRef = useRef<string | null>(null);
  const selectVaultReqRef  = useRef<string | null>(null);
  const [warehouseName, setWarehouseName] = useState('');
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Box | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [apiError, setApiError] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [mapLevel, setMapLevel] = useState<1 | 2>(1);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<VaultFormData | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [photoLoadError, setPhotoLoadError] = useState(false);
  const [warehouseRows, setWarehouseRows] = useState(10);
  const [warehouseCols, setWarehouseCols] = useState(8);
  const [showGridEdit, setShowGridEdit] = useState(false);
  const [gridRowsInput, setGridRowsInput] = useState(10);
  const [gridColsInput, setGridColsInput] = useState(8);
  const [gridSaving, setGridSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [allWarehouses, setAllWarehouses] = useState<{ id: string; name: string; rows: number; cols: number }[]>([]);
  const [showMove, setShowMove] = useState(false);
  const [moveTarget, setMoveTarget] = useState<Box | null>(null);
  const [moveDest, setMoveDest] = useState({ warehouse_id: '', row: 'A', col: 1, level: 1 });
  const [moveSaving, setMoveSaving] = useState(false);
  const [moveError, setMoveError] = useState('');
  const [moveOccupant, setMoveOccupant] = useState<{ id: string; client_name: string; job_type: string; position: string } | null>(null);
  const [destBoxes, setDestBoxes] = useState<Box[]>([]);

  // Loose Items state
  const [activeTab, setActiveTab] = useState<'vaults' | 'loose'>('vaults');
  const [looseItems, setLooseItems] = useState<LooseItem[]>([]);
  const [looseRows, setLooseRows] = useState(5);
  const [looseCols, setLooseCols] = useState(5);
  const [looseLoading, setLooseLoading] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showLooseForm, setShowLooseForm] = useState(false);
  const [editingLooseId, setEditingLooseId] = useState<string | null>(null);
  const [looseForm, setLooseForm] = useState<LooseForm>(emptyLooseForm());
  const [looseSaving, setLooseSaving] = useState(false);
  const [looseError, setLooseError] = useState('');
  const [showLooseGridEdit, setShowLooseGridEdit] = useState(false);
  const [looseRowsInput, setLooseRowsInput] = useState(5);
  const [looseColsInput, setLooseColsInput] = useState(5);
  const [looseGridSaving, setLooseGridSaving] = useState(false);

  const fetchBoxes = () => {
    setApiError('');
    api.get(`/api/boxes?warehouse_id=${warehouseId}`)
      .then(data => {
        if (Array.isArray(data)) setBoxes(data);
        else if (data?.boxes) setBoxes(data.boxes);
        else if (data?.items) setBoxes(data.items);
        else { setBoxes([]); setApiError('Unexpected response format. Please refresh.'); }
      })
      .catch(err => setApiError(`API Error: ${err.message}`))
      .finally(() => setLoading(false));
  };

  const tabParam  = searchParams?.get('tab')  ?? null;
  const zoneParam = searchParams?.get('zone') ?? null;

  useEffect(() => {
    fetchBoxes();
    api.get('/api/warehouses').then((whs: any) => { if (Array.isArray(whs)) setAllWarehouses(whs); }).catch(() => {});
    import('@/lib/pb').then(({ pb }) =>
      pb.collection('warehouses').getFirstListItem(`id="${warehouseId.replace(/\\/g,'\\\\').replace(/"/g,'\\"')}" && company_id="${(user?.company_id||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"`).then(w => {
        setWarehouseName(w.name);
        const r = Number(w.rows) || 10;
        const c = Number(w.cols) || 8;
        setWarehouseRows(r); setGridRowsInput(r);
        setWarehouseCols(c); setGridColsInput(c);
        const lr = Number(w.loose_rows) || 5;
        const lc = Number(w.loose_cols) || 5;
        setLooseRows(lr); setLooseRowsInput(lr);
        setLooseCols(lc); setLooseColsInput(lc);
      }).catch(() => {})
    );
    if (tabParam === 'loose') {
      setActiveTab('loose');
      if (zoneParam) setSelectedZone(zoneParam);
    }
  }, [warehouseId, user?.company_id, tabParam, zoneParam]);

  // Load loose items when switching to loose tab
  useEffect(() => {
    if (activeTab !== 'loose') return;
    setLooseLoading(true);
    api.get(`/api/loose-items?warehouse_id=${warehouseId}`)
      .then((data: any) => setLooseItems(Array.isArray(data) ? data : []))
      .catch(() => { setLooseItems([]); setLooseError('Failed to load loose items. Try refreshing.'); })
      .finally(() => setLooseLoading(false));
  }, [activeTab, warehouseId]);

  // Auto-open vault when navigating from /scan?vault=<id> or QR scan
  // cacheKey includes ?t= timestamp so repeated QR scans of the same vault still open the modal
  useEffect(() => {
    const targetId = searchParams?.get('vault');
    if (!targetId || boxes.length === 0) return;
    const t = searchParams?.get('t') || '';
    const cacheKey = `${targetId}-${t}`;
    if (autoOpenedVaultRef.current === cacheKey) return;
    const found = boxes.find(b => b.box_id === targetId);
    if (!found) return;
    autoOpenedVaultRef.current = cacheKey;
    setSelected(found);
    setShowQR(false);
    setLoadingPhotos(true);
    api.get(`/api/boxes/${found.box_id}`)
      .then(full => { if (full) setSelected(prev => prev ? { ...prev, ...full } : prev); })
      .catch(() => {})
      .finally(() => setLoadingPhotos(false));
  }, [boxes, searchParams]);

  const filtered = boxes.filter(b =>
    b.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.position?.toLowerCase().includes(search.toLowerCase()) ||
    b.packer?.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (box: Box) => {
    setEditForm({
      client_name:   box.client_name || '',
      job_type:      box.job_type || 'Moving',
      contents_type: box.content_type || 'Boxes',
      room_location: box.room_location || [],
      vault_status:  box.vault_status || [],
      packer:        box.packer || '',
      pack_date:     box.pack_date || new Date().toISOString().split('T')[0],
      status:        box.estado || box.status || 'PENDING',
      comments:      box.comments || '',
      photos:        box.photos || [],
    });
    setEditError('');
    setShowEdit(true);
  };

  const handleEditPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const converted = await Promise.all(Array.from(files).slice(0, 6).map(f => compressImage(f)));
      setEditForm(f => f ? { ...f, photos: [...f.photos, ...converted].slice(0, 6) } : f);
    } catch (err: any) {
      setEditError(err?.message || 'Photo too large');
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !editForm?.client_name.trim()) { setEditError('Client name is required'); return; }
    setEditSaving(true);
    setEditError('');
    try {
      await api.put(`/api/boxes/${selected.box_id}`, {
        client_name:   editForm.client_name.trim(),
        job_type:      editForm.job_type,
        content_type:  editForm.contents_type,
        room_location: editForm.room_location,
        vault_status:  editForm.vault_status,
        packer:        editForm.packer,
        pack_date:     editForm.pack_date,
        estado:        editForm.status,
        comments:      editForm.comments,
        photos:        editForm.photos,
      });
      setShowEdit(false);
      setSelected(null);
      fetchBoxes();
      showToast('Vault updated');
    } catch (err: any) {
      setEditError(err?.message || 'Failed to save');
    } finally {
      setEditSaving(false);
    }
  };

  const deleteBox = (boxId: string) => {
    setConfirmModal({
      message: 'Delete this vault? You can recover it from the Deleted Vaults page.',
      onConfirm: async () => {
        try {
          await api.delete(`/api/boxes/${boxId}`);
          setSelected(null);
          fetchBoxes();
          showToast('Vault deleted');
        } catch (err: any) {
          showToast(err?.message || 'Failed to delete vault', 'error');
        }
      },
    });
  };

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const converted = await Promise.all(Array.from(files).slice(0, 6).map(f => compressImage(f)));
      setForm(f => ({ ...f, photos: [...f.photos, ...converted].slice(0, 6) }));
    } catch (err: any) {
      setSaveError(err?.message || 'Photo too large');
    }
  };

  const removePhoto = (idx: number) =>
    setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));

  const addVolt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_name.trim()) { setSaveError('Client name is required'); return; }
    setSaving(true);
    setSaveError('');
    try {
      await api.post('/api/boxes', {
        warehouse_id: warehouseId,
        row: form.row,
        column: form.column,
        level: form.level,
        position: `${form.row}${form.column}-L${form.level}`,
        client_name: form.client_name.trim(),
        job_type: form.job_type,
        content_type: form.contents_type,
        room_location: form.room_location,
        vault_status: form.vault_status,
        packer: form.packer,
        pack_date: form.pack_date,
        estado: form.status,
        comments: form.comments,
        photos: form.photos,
      });
      setShowAdd(false);
      setForm(emptyForm());
      fetchBoxes();
      showToast('Vault created');
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to add vault');
    } finally {
      setSaving(false);
    }
  };

  const openMove = (box: Box) => {
    setMoveTarget(box);
    setMoveDest({ warehouse_id: warehouseId, row: box.row, col: Number(box.column), level: Number(box.level) });
    setMoveError('');
    setMoveOccupant(null);
    setDestBoxes(boxes); // pre-populate with current warehouse boxes
    setShowMove(true);
  };

  // When destination warehouse changes inside the Move dialog, load its vaults for occupancy
  const handleMoveWarehouseChange = (newWhId: string) => {
    setMoveDest(d => ({ ...d, warehouse_id: newWhId, row: 'A', col: 1 }));
    setMoveError('');
    if (newWhId === warehouseId) {
      setDestBoxes(boxes);
    } else {
      api.get(`/api/boxes?warehouse_id=${newWhId}`)
        .then((data: any) => {
          if (Array.isArray(data)) setDestBoxes(data);
          else if (data?.boxes) setDestBoxes(data.boxes);
          else setDestBoxes([]);
        })
        .catch(() => setDestBoxes([]));
    }
  };

  const handleMove = async (confirmSwap = false) => {
    if (!moveTarget) return;
    setMoveSaving(true);
    setMoveError('');
    try {
      const result = await api.put(`/api/boxes/${moveTarget.box_id}/move`, {
        warehouse_id: moveDest.warehouse_id,
        row: moveDest.row,
        col: moveDest.col,
        level: moveDest.level,
        ...(confirmSwap ? { confirmSwap: true } : {}),
      });
      if (result?.unchanged) {
        setMoveError('The vault is already at this position');
      } else if (result?.occupied) {
        setMoveOccupant(result.occupant || null);
        setMoveError(`Position taken by ${result.occupant?.client_name || 'another vault'}. Swap positions?`);
      } else {
        setShowMove(false);
        setMoveTarget(null);
        setMoveOccupant(null);
        setSelected(null);
        fetchBoxes();
        showToast('Vault moved');
      }
    } catch (err: any) {
      setMoveError(err?.message || 'Failed to move vault');
      if ((err?.message as string)?.includes('could not rollback')) fetchBoxes();
    } finally {
      setMoveSaving(false);
    }
  };

  // Open a vault and lazy-load full data (photos + all fields like pack_date)
  // Uses selectVaultReqRef to discard stale responses from rapid consecutive clicks
  const selectVault = useCallback(async (box: Box) => {
    selectVaultReqRef.current = box.box_id;
    setSelected(box);
    setShowQR(false);
    setLoadingPhotos(true);
    setPhotoLoadError(false);
    try {
      const full = await api.get(`/api/boxes/${box.box_id}`);
      if (full && selectVaultReqRef.current === box.box_id) {
        setSelected(prev => prev ? { ...prev, ...full } : prev);
      }
    } catch {
      if (selectVaultReqRef.current === box.box_id) setPhotoLoadError(true);
    }
    if (selectVaultReqRef.current === box.box_id) setLoadingPhotos(false);
  }, []);

  const handleScanResult = useCallback((vaultId: string) => {
    setShowScanner(false);
    const found = boxes.find(b => b.box_id === vaultId);
    if (found) {
      selectVault(found);
    } else {
      setApiError(`Vault not found in this warehouse. It may belong to a different warehouse.`);
    }
  }, [boxes, selectVault]);

  const boxStatus = (box: Box) => box.estado || box.status || 'PENDING';

  const activeRows = ROWS.slice(0, warehouseRows);
  const activeCols = COLUMNS.slice(0, warehouseCols);

  const saveGridSize = async () => {
    setGridSaving(true);
    try {
      await api.put(`/api/warehouses/${warehouseId}/grid`, { rows: gridRowsInput, cols: gridColsInput });
      setWarehouseRows(gridRowsInput);
      setWarehouseCols(gridColsInput);
      setShowGridEdit(false);
    } catch {
      showToast('Failed to save grid size — please try again', 'error');
    }
    setGridSaving(false);
  };

  // Loose Items helpers
  const getItemsForZone = (x: string, y: string) =>
    looseItems.filter(item => item.grid_x === x && item.grid_y === y);
  const getItemEmoji = (item: LooseItem) =>
    item.item_type === 'Furniture' ? (ITEM_EMOJI[item.furniture_type] || '📋') : '📦';
  const looseZoneItems = selectedZone
    ? getItemsForZone(selectedZone.split('-')[0], selectedZone.split('-')[1])
    : [];

  const fetchLooseItems = () => {
    api.get(`/api/loose-items?warehouse_id=${warehouseId}`)
      .then((data: any) => setLooseItems(Array.isArray(data) ? data : []))
      .catch((err: any) => { showToast(err?.message || 'Failed to reload items', 'error'); });
  };

  const openAddLooseItem = () => {
    setEditingLooseId(null);
    setLooseForm(emptyLooseForm());
    setLooseError('');
    setShowLooseForm(true);
  };

  const openEditLooseItem = (item: LooseItem) => {
    setEditingLooseId(item.id);
    setLooseForm({
      client_name:    item.client_name,
      item_type:      item.item_type,
      furniture_type: item.furniture_type,
      color:          item.color,
      condition:      item.condition,
      status:         item.status,
      photos:         item.photos,
      comments:       item.comments,
    });
    setLooseError('');
    setShowLooseForm(true);
  };

  const saveLooseItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!looseForm.client_name.trim()) { setLooseError('Client name is required'); return; }
    if (!selectedZone) { setLooseError('No zone selected'); return; }
    const [gx, gy] = selectedZone.split('-');
    setLooseSaving(true);
    setLooseError('');
    try {
      if (editingLooseId) {
        await api.put(`/api/loose-items/${editingLooseId}`, { ...looseForm, client_name: looseForm.client_name.trim() });
        showToast('Item updated');
      } else {
        await api.post('/api/loose-items', {
          warehouse_id: warehouseId,
          grid_x: gx,
          grid_y: gy,
          ...looseForm,
          client_name: looseForm.client_name.trim(),
        });
        showToast('Item added');
      }
      setShowLooseForm(false);
      setEditingLooseId(null);
      fetchLooseItems();
    } catch (err: any) {
      setLooseError(err?.message || 'Failed to save');
    } finally {
      setLooseSaving(false);
    }
  };

  const deleteLooseItemFn = (itemId: string) => {
    setConfirmModal({
      message: 'Delete this item? This cannot be undone.',
      onConfirm: async () => {
        await api.delete(`/api/loose-items/${itemId}`);
        fetchLooseItems();
        showToast('Item deleted');
      },
    });
  };

  const handleLoosePhotoAdd = async (b64: string) => {
    setLooseForm(f => ({ ...f, photos: [...f.photos, b64].slice(0, 4) }));
  };

  const handleLoosePhotoFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files).slice(0, 4)) {
      try { handleLoosePhotoAdd(await compressImage(file)); } catch {}
    }
  };

  const saveLooseGrid = async () => {
    setLooseGridSaving(true);
    try {
      await api.put(`/api/warehouses/${warehouseId}/loose-grid`, { loose_rows: looseRowsInput, loose_cols: looseColsInput });
      setLooseRows(looseRowsInput);
      setLooseCols(looseColsInput);
      setShowLooseGridEdit(false);
      showToast('Grid size updated');
    } catch {
      showToast('Failed to save grid size', 'error');
    } finally {
      setLooseGridSaving(false);
    }
  };

  // Map helpers
  const getBox = (row: string, col: number, level: number) =>
    boxes.find(b => b.row === row && Number(b.column) === col && Number(b.level) === level);

  const openAddAtPosition = (row: string, col: number, level: number) => {
    setForm({ ...emptyForm(), row, column: col, level });
    setSaveError('');
    setShowAdd(true);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 px-4 pb-8 md:px-8 md:pb-8 topbar-offset">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{warehouseName || 'Warehouse'}</h1>
            <p className="text-gray-500 text-sm mt-1">
              {activeTab === 'vaults' ? `${boxes.length} vaults stored` : `${looseItems.length} loose items`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchBoxes()}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              aria-label="Refresh"
              title="Refresh"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
            {activeTab === 'vaults' ? (
              <>
                {canManage && (
                  <button
                    onClick={() => { setGridRowsInput(warehouseRows); setGridColsInput(warehouseCols); setShowGridEdit(v => !v); }}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-xl transition-colors ${showGridEdit ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700'}`}
                    title="Edit grid dimensions"
                  >
                    <Cog6ToothIcon className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs">{warehouseRows}×{warehouseCols}</span>
                  </button>
                )}
                <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setViewMode('map')}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'map' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <Squares2X2Icon className="w-4 h-4" /><span className="hidden sm:inline ml-1">Map</span>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <ListBulletIcon className="w-4 h-4" /><span className="hidden sm:inline ml-1">List</span>
                  </button>
                </div>
                <button
                  onClick={() => setShowScanner(true)}
                  className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:border-blue-400 hover:text-blue-600 transition-colors"
                  title="Scan QR code"
                >
                  <QrCodeIcon className="w-4 h-4" /><span className="hidden sm:inline">Scan QR</span>
                </button>
                {canManage && (
                  <button
                    onClick={() => { setForm(emptyForm()); setShowAdd(true); setSaveError(''); }}
                    className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 bg-gray-950 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" /><span className="hidden sm:inline">Add Vault</span><span className="sm:hidden">Add</span>
                  </button>
                )}
              </>
            ) : (
              <>
                {canManage && (
                  <button
                    onClick={() => { setLooseRowsInput(looseRows); setLooseColsInput(looseCols); setShowLooseGridEdit(v => !v); }}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-xl transition-colors ${showLooseGridEdit ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700'}`}
                    title="Edit loose grid dimensions"
                  >
                    <Cog6ToothIcon className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs">{looseRows}×{looseCols}</span>
                  </button>
                )}
                {canManage && selectedZone && (
                  <button
                    onClick={openAddLooseItem}
                    className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 bg-gray-950 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" /><span className="hidden sm:inline">Add Item</span><span className="sm:hidden">Add</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit">
          <button
            onClick={() => { setActiveTab('vaults'); setShowLooseGridEdit(false); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'vaults' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Vaults <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'vaults' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{boxes.length}</span>
          </button>
          <button
            onClick={() => { setActiveTab('loose'); setShowGridEdit(false); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'loose' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Loose Items{looseItems.length > 0 && <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'loose' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{looseItems.length}</span>}
          </button>
        </div>

        {/* ── VAULTS TAB ── */}
        {activeTab === 'vaults' && (
          <>
            {/* Grid dimension editor */}
            <AnimatePresence>
              {showGridEdit && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-4 bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap items-end gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Rows (A–{ROWS[gridRowsInput - 1]})</label>
                    <input type="number" min={1} max={10} value={gridRowsInput} onChange={e => setGridRowsInput(Math.min(10, Math.max(1, Number(e.target.value))))}
                      className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Columns (1–{gridColsInput})</label>
                    <input type="number" min={1} max={11} value={gridColsInput} onChange={e => setGridColsInput(Math.min(11, Math.max(1, Number(e.target.value))))}
                      className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <button onClick={saveGridSize} disabled={gridSaving}
                    className="px-4 py-2 text-sm bg-gray-950 text-white rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50">
                    {gridSaving ? 'Saving...' : 'Apply'}
                  </button>
                  <button onClick={() => setShowGridEdit(false)} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                </motion.div>
              )}
            </AnimatePresence>

            {apiError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-mono">{apiError}</div>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : viewMode === 'map' ? (
              /* ── MAP VIEW ── */
              <div>
                {/* Level selector + Legend */}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 font-medium">Level:</span>
                    <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setMapLevel(1)}
                        className={`px-3 py-2 text-sm font-medium transition-colors ${mapLevel === 1 ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Lower
                      </button>
                      <button
                        onClick={() => setMapLevel(2)}
                        className={`px-3 py-2 text-sm font-medium transition-colors ${mapLevel === 2 ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Upper
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {[['bg-gray-100', 'Empty'], ['bg-amber-400', 'Pending'], ['bg-green-500', 'Ready'], ['bg-blue-500', 'Delivered']].map(([color, label]) => (
                      <div key={label} className="flex items-center gap-1">
                        <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
                        <span className="text-xs text-gray-500">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grid */}
                <div className="bg-white rounded-2xl border border-gray-100 p-2 md:p-6">
                  <div>
                    {/* Column headers */}
                    <div className="flex gap-1 md:gap-1.5 mb-1 md:mb-1.5 ml-6 md:ml-8">
                      {activeCols.map(col => (
                        <div key={col} className="flex-1 min-w-0 text-center text-[9px] md:text-xs font-semibold text-gray-400">{col}</div>
                      ))}
                    </div>

                    {activeRows.map(row => (
                      <div key={row} className="flex items-center gap-1 md:gap-1.5 mb-1 md:mb-1.5">
                        <div className="w-6 md:w-8 text-center text-xs font-bold text-gray-500 flex-shrink-0">{row}</div>

                        {activeCols.map(col => {
                          const box = getBox(row, col, mapLevel);
                          const status = box ? boxStatus(box) : null;
                          return (
                            <motion.button
                              key={col}
                              whileHover={{ scale: 1.03 }}
                              onClick={() => { box ? selectVault(box) : openAddAtPosition(row, col, mapLevel); }}
                              className={`flex-1 min-w-0 overflow-hidden h-10 md:h-14 rounded-lg md:rounded-xl border-2 flex flex-col items-center justify-center transition-all
                                ${box
                                  ? `${STATUS_CELL[status!] || 'bg-gray-300'} border-transparent text-white cursor-pointer`
                                  : 'bg-gray-50 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                                }`}
                            >
                              {box ? (
                                <>
                                  <span className="block md:hidden text-[10px] font-bold leading-none text-center tracking-tight">
                                    {box.client_name
                                      ? box.client_name.split(' ').map((w: string) => w[0]).join('').slice(0, 3).toUpperCase()
                                      : '?'}
                                  </span>
                                  <span className="hidden md:block text-[10px] font-bold leading-tight w-full px-0.5 text-center truncate">{box.client_name}</span>
                                  <span className="hidden md:block text-[9px] opacity-75 mt-0.5 leading-none">{box.job_type}</span>
                                </>
                              ) : (
                                <PlusIcon className="w-3 h-3 md:w-4 md:h-4 text-gray-300" />
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ── LIST VIEW ── */
              <div>
                <div className="relative mb-6">
                  <MagnifyingGlassIcon className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by client, position, packer..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
                  <table className="w-full min-w-[320px]">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-4">Position</th>
                        <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-4">Client</th>
                        <th className="hidden md:table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-4">Job Type</th>
                        <th className="hidden md:table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-4">Packer</th>
                        <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-4">Job Status</th>
                        <th className="hidden md:table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-4">Photos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((box, i) => (
                        <motion.tr
                          key={box.box_id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          onClick={() => selectVault(box)}
                          className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-4 text-sm font-medium text-gray-900">{box.position}</td>
                          <td className="px-4 py-4 text-sm text-gray-700 max-w-[140px] truncate">{box.client_name}</td>
                          <td className="hidden md:table-cell px-4 py-4 text-sm text-gray-500">{box.job_type}</td>
                          <td className="hidden md:table-cell px-4 py-4 text-sm text-gray-500">{box.packer || '—'}</td>
                          <td className="px-4 py-4">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[boxStatus(box)] || 'bg-gray-100 text-gray-600'}`}>
                              {boxStatus(box)}
                            </span>
                          </td>
                          <td className="hidden md:table-cell px-4 py-4 text-sm text-gray-500">
                            {box.photos?.length > 0 ? (
                              <span className="flex items-center gap-1"><CameraIcon className="w-3.5 h-3.5" />{box.photos.length}</span>
                            ) : '—'}
                          </td>
                        </motion.tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-16 text-gray-400 text-sm">No vaults found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── LOOSE ITEMS TAB ── */}
        {activeTab === 'loose' && (
          <>
            {/* Loose grid editor */}
            <AnimatePresence>
              {showLooseGridEdit && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-4 bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap items-end gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Rows (1–20)</label>
                    <input type="number" min={1} max={20} value={looseRowsInput} onChange={e => setLooseRowsInput(Math.min(20, Math.max(1, Number(e.target.value))))}
                      className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Columns (1–20)</label>
                    <input type="number" min={1} max={20} value={looseColsInput} onChange={e => setLooseColsInput(Math.min(20, Math.max(1, Number(e.target.value))))}
                      className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <button onClick={saveLooseGrid} disabled={looseGridSaving}
                    className="px-4 py-2 text-sm bg-gray-950 text-white rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50">
                    {looseGridSaving ? 'Saving...' : 'Apply'}
                  </button>
                  <button onClick={() => setShowLooseGridEdit(false)} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                </motion.div>
              )}
            </AnimatePresence>

            {looseLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Mini-grid */}
                <div className="lg:w-1/2">
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-700">Zone Map</p>
                      <span className="text-xs text-gray-400">{looseItems.length} items total</span>
                    </div>
                    <div className="overflow-x-auto">
                      {/* Column headers */}
                      <div className="flex gap-1 mb-1 ml-7">
                        {Array.from({ length: looseCols }, (_, ci) => (
                          <div key={ci} className="flex-1 min-w-0 text-center text-[10px] font-semibold text-gray-400">{ci + 1}</div>
                        ))}
                      </div>
                      {Array.from({ length: looseRows }, (_, ri) => (
                        <div key={ri} className="flex items-stretch gap-1 mb-1">
                          <div className="w-7 text-center text-xs font-bold text-gray-400 flex-shrink-0 flex items-center justify-center">{ri + 1}</div>
                          {Array.from({ length: looseCols }, (_, ci) => {
                            const x = String(ci + 1);
                            const y = String(ri + 1);
                            const zone = `${x}-${y}`;
                            const zoneItemsList = getItemsForZone(x, y);
                            const isSelected = selectedZone === zone;
                            return (
                              <motion.button
                                key={ci}
                                whileHover={{ scale: 1.04 }}
                                onClick={() => { setSelectedZone(zone); setShowLooseForm(false); }}
                                className={`flex-1 min-w-0 min-h-[52px] rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-all p-1
                                  ${isSelected
                                    ? 'border-blue-500 bg-blue-50'
                                    : zoneItemsList.length > 0
                                    ? 'border-transparent bg-slate-100 hover:border-blue-300'
                                    : 'bg-gray-50 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                  }`}
                              >
                                {zoneItemsList.length > 0 ? (
                                  <>
                                    <span className="text-sm leading-none">
                                      {zoneItemsList.slice(0, 2).map(getItemEmoji).join('')}
                                    </span>
                                    <span className="text-[9px] font-semibold text-gray-600 bg-white/80 rounded-full px-1 leading-tight">{zoneItemsList.length}</span>
                                  </>
                                ) : (
                                  <PlusIcon className="w-3 h-3 text-gray-300" />
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Zone panel — desktop side panel */}
                <div className="hidden lg:block lg:w-1/2">
                  {selectedZone ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Zone {selectedZone.split('-')[0]}–{selectedZone.split('-')[1]}
                          </h3>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {looseZoneItems.length} {looseZoneItems.length === 1 ? 'item' : 'items'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {canManage && (
                            <button onClick={openAddLooseItem}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-950 text-white rounded-full hover:bg-gray-800 transition-colors">
                              <PlusIcon className="w-3 h-3" /> Add Item
                            </button>
                          )}
                          <button onClick={() => { setSelectedZone(null); setShowLooseForm(false); }}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {looseZoneItems.map(item => (
                          <div key={item.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                            <span className="text-2xl flex-shrink-0 leading-none pt-0.5">{getItemEmoji(item)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-gray-900 truncate">{item.client_name || '(No client)'}</p>
                                {canManage && (
                                  <div className="flex gap-1 flex-shrink-0">
                                    <button onClick={() => openEditLooseItem(item)} className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"><PencilIcon className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => deleteLooseItemFn(item.id)} className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"><TrashIcon className="w-3.5 h-3.5" /></button>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{item.item_type}{item.furniture_type ? ` · ${item.furniture_type}` : ''}{item.color ? ` · ${item.color}` : ''}</p>
                              {item.condition.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">{item.condition.map(c => <span key={c} className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">{c}</span>)}</div>
                              )}
                              <div className="flex items-center justify-between mt-1.5">
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>{item.status}</span>
                                {item.photos.length > 0 && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><CameraIcon className="w-3 h-3" />{item.photos.length}</span>}
                              </div>
                              {item.photos.length > 0 && (
                                <div className="flex gap-1 mt-2">
                                  {item.photos.slice(0, 3).map((photo, i) => <img key={i} src={photo} alt="" onClick={() => setLightbox({ photos: item.photos, index: i })} className="w-12 h-12 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity" />)}
                                  {item.photos.length > 3 && <button className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500 font-medium" onClick={() => setLightbox({ photos: item.photos, index: 3 })}>+{item.photos.length - 3}</button>}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {looseZoneItems.length === 0 && (
                          <div className="text-center py-10 text-gray-400">
                            <p className="text-sm">No items in this zone</p>
                            {canManage && <p className="text-xs mt-1">Click &quot;Add Item&quot; to add one</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 h-full flex items-center justify-center min-h-[200px]">
                      <div className="text-center py-8 text-gray-400 px-6">
                        <ArchiveBoxIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Click a zone on the map to view or add items</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Zone panel — mobile modal */}
                <AnimatePresence>
                  {selectedZone && (
                    <div className="lg:hidden fixed inset-0 bg-black/40 flex items-center justify-center z-[55] p-4"
                      onClick={() => { setSelectedZone(null); setShowLooseForm(false); }}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="bg-white rounded-2xl p-4 w-full max-w-sm shadow-xl max-h-[80vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                          <div>
                            <h3 className="font-semibold text-gray-900">Zone {selectedZone.split('-')[0]}–{selectedZone.split('-')[1]}</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{looseZoneItems.length} {looseZoneItems.length === 1 ? 'item' : 'items'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {canManage && (
                              <button onClick={openAddLooseItem}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-950 text-white rounded-full hover:bg-gray-800 transition-colors">
                                <PlusIcon className="w-3 h-3" /> Add Item
                              </button>
                            )}
                            <button onClick={() => { setSelectedZone(null); setShowLooseForm(false); }}
                              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-3 overflow-y-auto flex-1">
                          {looseZoneItems.map(item => (
                            <div key={item.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                              <span className="text-2xl flex-shrink-0 leading-none pt-0.5">{getItemEmoji(item)}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium text-gray-900 truncate">{item.client_name || '(No client)'}</p>
                                  {canManage && (
                                    <div className="flex gap-1 flex-shrink-0">
                                      <button onClick={() => openEditLooseItem(item)} className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"><PencilIcon className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => deleteLooseItemFn(item.id)} className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"><TrashIcon className="w-3.5 h-3.5" /></button>
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">{item.item_type}{item.furniture_type ? ` · ${item.furniture_type}` : ''}{item.color ? ` · ${item.color}` : ''}</p>
                                {item.condition.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">{item.condition.map(c => <span key={c} className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">{c}</span>)}</div>
                                )}
                                <div className="flex items-center justify-between mt-1.5">
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>{item.status}</span>
                                  {item.photos.length > 0 && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><CameraIcon className="w-3 h-3" />{item.photos.length}</span>}
                                </div>
                                {item.photos.length > 0 && (
                                  <div className="flex gap-1 mt-2">
                                    {item.photos.slice(0, 3).map((photo, i) => <img key={i} src={photo} alt="" onClick={() => setLightbox({ photos: item.photos, index: i })} className="w-12 h-12 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity" />)}
                                    {item.photos.length > 3 && <button className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500 font-medium" onClick={() => setLightbox({ photos: item.photos, index: 3 })}>+{item.photos.length - 3}</button>}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {looseZoneItems.length === 0 && (
                            <div className="text-center py-10 text-gray-400">
                              <p className="text-sm">No items in this zone</p>
                              {canManage && <p className="text-xs mt-1">Tap &quot;Add Item&quot; to add one</p>}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* Detail Modal */}
        <AnimatePresence>
          {selected && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[55] p-4" onClick={() => setSelected(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-gray-900">Vault Detail</h2>
                  <button onClick={() => setSelected(null)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  {[
                    ['Position', selected.position],
                    ['Client', selected.client_name],
                    ['Job Type', selected.job_type],
                    ['Content Type', selected.content_type || '—'],
                    ['Packer', selected.packer || '—'],
                    ['Pack Date', selected.pack_date || '—'],
                    ['Pack Time', selected.created ? new Date(selected.created).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'],
                    ['Job Status', boxStatus(selected)],
                    ['Comments', selected.comments || '—'],
                    ['Condition', selected.vault_status?.join(', ') || '—'],
                    ['Room Location', selected.room_location?.join(', ') || '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex gap-3">
                      <span className="text-sm text-gray-400 w-32 flex-shrink-0">{label}</span>
                      <span className="text-sm text-gray-900 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
                {loadingPhotos && (
                  <div className="mt-4 flex items-center gap-2 text-gray-400 text-sm">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Loading photos...
                  </div>
                )}
                {photoLoadError && (
                  <p className="mt-4 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                    Some details could not be loaded. Photos may be unavailable.
                  </p>
                )}
                {!loadingPhotos && selected.photos?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-400 mb-2">Photos</p>
                    <div className="grid grid-cols-2 gap-2">
                      {selected.photos.map((photo, i) => (
                        <img
                          key={i}
                          src={photo}
                          alt={`Photo ${i + 1}`}
                          onClick={() => setLightbox({ photos: selected.photos, index: i })}
                          className="w-full h-32 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      ))}
                    </div>
                  </div>
                )}
                {/* QR Code */}
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setShowQR(v => !v)}
                      className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      <QrCodeIcon className="w-4 h-4" />
                      {showQR ? 'Hide QR Code' : 'Show QR Code'}
                    </button>
                    <button
                      onClick={() => router.push(`/vault/${selected.box_id}/print`)}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      <QrCodeIcon className="w-3.5 h-3.5" />
                      Print QR Label
                    </button>
                  </div>
                  {showQR && (
                    <div className="mt-3 flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl">
                      <QRCodeSVG
                        value={`${process.env.NEXT_PUBLIC_APP_URL || 'https://managerwarehouse.cc'}/vault/${selected.box_id}`}
                        size={160}
                        level="H"
                      />
                      <p className="text-xs text-gray-400 text-center">Scan to open this vault</p>
                    </div>
                  )}
                </div>

                {canManage && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={() => openEdit(selected)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-xl transition-colors font-medium"
                    >
                      <PencilIcon className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={() => openMove(selected)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <ArrowsRightLeftIcon className="w-4 h-4" /> Move
                    </button>
                    <button
                      onClick={() => deleteBox(selected.box_id)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" /> Delete
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Vault Modal */}
        <AnimatePresence>
          {showEdit && editForm && selected && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[55] p-4" onClick={() => setShowEdit(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-gray-900">Edit Vault</h2>
                  <button onClick={() => setShowEdit(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                <VaultForm
                  mode="edit"
                  value={editForm}
                  onChange={setEditForm}
                  positionLabel={`${warehouseName || 'Warehouse'} · Row ${selected.row} · Col ${selected.column} · ${selected.level === 1 ? 'Lower (L1)' : 'Upper (L2)'}`}
                  error={editError}
                  saving={editSaving}
                  submitLabel="Save Changes"
                  onSubmit={saveEdit}
                  onPhotos={handleEditPhotos}
                  onPhotoNative={b64 => setEditForm(f => f ? { ...f, photos: [...f.photos, b64].slice(0, 6) } : f)}
                  onRemovePhoto={idx => setEditForm(f => f ? { ...f, photos: f.photos.filter((_, i) => i !== idx) } : f)}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Vault Modal */}
        <AnimatePresence>
          {showAdd && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[55] p-4" onClick={() => setShowAdd(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-gray-900">New Vault</h2>
                  <button onClick={() => setShowAdd(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                <VaultForm
                  mode="add"
                  value={form}
                  onChange={setForm}
                  positionLabel={`${warehouseName || 'Warehouse'} · Row ${form.row} · Col ${form.column} · ${form.level === 1 ? 'Lower (L1)' : 'Upper (L2)'}`}
                  error={saveError}
                  saving={saving}
                  submitLabel="Create Vault"
                  onSubmit={addVolt}
                  onPhotos={handlePhotoFiles}
                  onPhotoNative={b64 => setForm(f => ({ ...f, photos: [...f.photos, b64].slice(0, 6) }))}
                  onRemovePhoto={removePhoto}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Photo Lightbox */}
        <AnimatePresence>
          {lightbox && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
              onClick={() => setLightbox(null)}
              onTouchStart={e => { (e.currentTarget as any)._touchX = e.touches[0].clientX; }}
              onTouchEnd={e => {
                const startX = (e.currentTarget as any)._touchX;
                if (startX == null) return;
                const delta = e.changedTouches[0].clientX - startX;
                if (Math.abs(delta) < 50) return;
                if (delta < 0) setLightbox(l => l ? { ...l, index: (l.index + 1) % l.photos.length } : null);
                else setLightbox(l => l ? { ...l, index: (l.index - 1 + l.photos.length) % l.photos.length } : null);
              }}
            >
              <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors z-10">
                <XMarkIcon className="w-7 h-7" />
              </button>
              <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
                {lightbox.index + 1} / {lightbox.photos.length}
              </span>
              {lightbox.photos.length > 1 && (
                <button
                  onClick={e => { e.stopPropagation(); setLightbox(l => l ? { ...l, index: (l.index - 1 + l.photos.length) % l.photos.length } : null); }}
                  className="absolute left-4 text-white/60 hover:text-white transition-colors z-10"
                >
                  <ChevronLeftIcon className="w-9 h-9" />
                </button>
              )}
              <motion.img
                key={lightbox.index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                src={lightbox.photos[lightbox.index]}
                alt=""
                onClick={e => e.stopPropagation()}
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
              />
              {lightbox.photos.length > 1 && (
                <button
                  onClick={e => { e.stopPropagation(); setLightbox(l => l ? { ...l, index: (l.index + 1) % l.photos.length } : null); }}
                  className="absolute right-4 text-white/60 hover:text-white transition-colors z-10"
                >
                  <ChevronRightIcon className="w-9 h-9" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Loose Item Form Modal */}
      <AnimatePresence>
        {showLooseForm && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-[55] p-4"
            onClick={() => { setShowLooseForm(false); setEditingLooseId(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="bg-white rounded-2xl p-5 w-full max-w-md shadow-xl max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <form onSubmit={saveLooseItem} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-800">{editingLooseId ? 'Edit Item' : 'New Item'}</h4>
                  <button type="button" onClick={() => { setShowLooseForm(false); setEditingLooseId(null); }}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Client name */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Client Name *</label>
                  <input type="text" value={looseForm.client_name} onChange={e => setLooseForm(f => ({ ...f, client_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Client name" />
                </div>

                {/* Item type */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Item Type</label>
                  <div className="flex gap-2">
                    {(['Boxes', 'Furniture'] as const).map(t => (
                      <button key={t} type="button"
                        onClick={() => setLooseForm(f => ({ ...f, item_type: t, furniture_type: '' }))}
                        className={`flex-1 py-2 text-sm rounded-xl border-2 transition-colors font-medium
                          ${looseForm.item_type === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {t === 'Boxes' ? '📦 Boxes' : '🛋️ Furniture'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Furniture subtype + color */}
                {looseForm.item_type === 'Furniture' && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Furniture Type</label>
                      <div className="flex flex-wrap gap-1.5">
                        {FURNITURE_TYPES.map(ft => (
                          <button key={ft} type="button"
                            onClick={() => setLooseForm(f => ({ ...f, furniture_type: f.furniture_type === ft ? '' : ft }))}
                            className={`px-2.5 py-1 text-xs rounded-lg border transition-colors
                              ${looseForm.furniture_type === ft ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                            {ITEM_EMOJI[ft]} {ft}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Color</label>
                      <input type="text" value={looseForm.color} onChange={e => setLooseForm(f => ({ ...f, color: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Brown, Black, White..." />
                    </div>
                  </>
                )}

                {/* Condition */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Condition</label>
                  <div className="flex flex-wrap gap-1.5">
                    {LOOSE_CONDITIONS.map(c => (
                      <button key={c} type="button"
                        onClick={() => setLooseForm(f => ({
                          ...f,
                          condition: f.condition.includes(c) ? f.condition.filter(x => x !== c) : [...f.condition, c],
                        }))}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-colors
                          ${looseForm.condition.includes(c) ? 'border-amber-400 bg-amber-50 text-amber-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Job Status</label>
                  <div className="flex gap-1.5">
                    {LOOSE_STATUSES.map(s => (
                      <button key={s} type="button"
                        onClick={() => setLooseForm(f => ({ ...f, status: s }))}
                        className={`flex-1 py-1.5 text-xs rounded-xl border-2 transition-colors font-medium
                          ${looseForm.status === s
                            ? s === 'PENDING' ? 'border-amber-400 bg-amber-50 text-amber-700'
                            : s === 'READY' ? 'border-green-400 bg-green-50 text-green-700'
                            : 'border-blue-400 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Photos */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Photos (max 4)</label>
                  {looseForm.photos.length < 4 && (
                    <div className="mb-2">
                      <PhotoAddButton onFiles={handleLoosePhotoFiles} onPhotoNative={handleLoosePhotoAdd} />
                    </div>
                  )}
                  {looseForm.photos.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {looseForm.photos.map((photo, i) => (
                        <div key={i} className="relative">
                          <img src={photo} alt="" className="w-16 h-16 object-cover rounded-lg" />
                          <button type="button"
                            onClick={() => setLooseForm(f => ({ ...f, photos: f.photos.filter((_, j) => j !== i) }))}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center leading-none">
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comments */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Comments</label>
                  <textarea value={looseForm.comments} onChange={e => setLooseForm(f => ({ ...f, comments: e.target.value }))}
                    rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Optional notes..." />
                </div>

                {looseError && <p className="text-sm text-red-600">{looseError}</p>}

                <div className="flex gap-2">
                  <button type="submit" disabled={looseSaving}
                    className="flex-1 py-2.5 bg-gray-950 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {looseSaving
                      ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{editingLooseId ? 'Saving...' : 'Adding...'}</>
                      : editingLooseId ? 'Save Changes' : 'Add Item'}
                  </button>
                  <button type="button" onClick={() => { setShowLooseForm(false); setEditingLooseId(null); }}
                    className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Move Vault Dialog */}
      <AnimatePresence>
        {showMove && moveTarget && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
            onClick={() => { setShowMove(false); setMoveOccupant(null); setMoveTarget(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Move Vault</h2>
                <button onClick={() => { setShowMove(false); setMoveTarget(null); }} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-5">{moveTarget.client_name} · {moveTarget.position}</p>
              <div className="space-y-4">
                {/* Warehouse */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Warehouse</label>
                  <select
                    value={moveDest.warehouse_id}
                    onChange={e => handleMoveWarehouseChange(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {allWarehouses.length > 0
                      ? allWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)
                      : <option value={warehouseId}>{warehouseName || 'Current warehouse'}</option>
                    }
                  </select>
                </div>

                {/* Position grid */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">
                    Position — Row <span className="font-semibold text-gray-700">{moveDest.row}</span>, Col <span className="font-semibold text-gray-700">{moveDest.col}</span>
                  </label>
                  {(() => {
                    const destWh = allWarehouses.find(w => w.id === moveDest.warehouse_id);
                    const maxRows = destWh ? destWh.rows : warehouseRows;
                    const maxCols = destWh ? destWh.cols : warehouseCols;
                    const isCurrent = moveDest.warehouse_id === warehouseId;
                    const sourceBoxes = isCurrent ? boxes : destBoxes;
                    const occupiedSet = new Set(
                      sourceBoxes
                        .filter(b => b.box_id !== moveTarget?.box_id && Number(b.level) === moveDest.level)
                        .map(b => `${b.row}${b.column}`)
                    );
                    return (
                      <div className="border border-gray-200 rounded-xl overflow-y-auto max-h-52 p-1.5">
                        {ROWS.slice(0, maxRows).map(r => (
                          <div key={r} className="flex gap-1 mb-1">
                            <span className="w-5 text-[10px] font-medium text-gray-400 flex items-center justify-center flex-shrink-0">{r}</span>
                            {COLUMNS.slice(0, maxCols).map(c => {
                              const posKey = `${r}${c}`;
                              const isOccupied = occupiedSet.has(posKey);
                              const isSelected = moveDest.row === r && moveDest.col === c;
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  disabled={isOccupied}
                                  onClick={() => { setMoveDest(d => ({ ...d, row: r, col: c })); setMoveError(''); }}
                                  className={`flex-1 h-7 text-[10px] font-medium rounded-md transition-colors ${
                                    isSelected
                                      ? 'bg-blue-600 text-white'
                                      : isOccupied
                                      ? 'bg-red-100 text-red-400 cursor-not-allowed'
                                      : 'bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-600'
                                  }`}
                                >
                                  {c}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Level */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Level</label>
                  <div className="flex gap-2">
                    {([{ v: 1, l: 'Lower' }, { v: 2, l: 'Upper' }] as const).map(({ v, l }) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => { setMoveDest(d => ({ ...d, level: v })); setMoveError(''); }}
                        className={`flex-1 py-2 text-sm font-medium rounded-xl border transition-colors ${
                          moveDest.level === v
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {moveError && <p className="text-sm text-red-600">{moveError}</p>}
                {moveOccupant && (
                  <button
                    onClick={() => handleMove(true)}
                    disabled={moveSaving}
                    className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    Swap with {moveOccupant.client_name}
                  </button>
                )}
                <button
                  onClick={() => handleMove()}
                  disabled={moveSaving}
                  className="w-full py-2.5 bg-gray-950 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {moveSaving
                    ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Moving...</>
                    : 'Move Vault'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {showScanner && (
        <QRScanner
          onClose={() => setShowScanner(false)}
          onResult={handleScanResult}
        />
      )}
    </div>
  );
}
