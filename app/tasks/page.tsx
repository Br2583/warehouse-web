'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon, XMarkIcon, TrashIcon, CalendarIcon, UserCircleIcon,
  ExclamationCircleIcon, ListBulletIcon, ViewColumnsIcon, PencilIcon,
  ClipboardDocumentListIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { SkeletonTaskRow } from '@/components/Skeleton';
import { UserAvatar } from '@/components/UserAvatar';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { pb } from '@/lib/pb';

type TaskStatus   = 'PENDING' | 'IN_PROGRESS' | 'DONE';
type TaskPriority = 'normal' | 'urgent';
type TaskType     = 'Cleaning' | 'Restoration' | 'Delivery' | 'Free';

interface Task {
  id:          string;
  title:       string;
  type:        TaskType;
  assigned_to: string;
  priority:    TaskPriority;
  status:      TaskStatus;
  vault_id?:   string;
  storage_id?: string;
  due_date?:   string;
  notes?:      string;
  company_id:  string;
  created_by:  string;
  created:     string;
}

interface Member {
  user_id:  string;
  name:     string;
  email:    string;
  picture?: string;
  role:     string;
}

interface StorageUnit {
  id:        string;
  unit_name: string;
  city:      string;
}

interface VaultResult {
  id:          string;
  client_name: string;
  position:    string;
}

const TASK_TYPES: TaskType[] = ['Cleaning', 'Restoration', 'Delivery', 'Free'];

const TYPE_STYLE: Record<string, string> = {
  Cleaning:    'bg-blue-50   text-blue-600  border-blue-100',
  Restoration: 'bg-amber-50  text-amber-700 border-amber-100',
  Delivery:    'bg-green-50  text-green-700 border-green-100',
  Free:        'bg-purple-50 text-purple-700 border-purple-100',
};

const COLUMNS: { status: TaskStatus; label: string; dot: string }[] = [
  { status: 'PENDING',     label: 'Pending',     dot: 'bg-gray-300' },
  { status: 'IN_PROGRESS', label: 'In Progress', dot: 'bg-amber-400' },
  { status: 'DONE',        label: 'Done',        dot: 'bg-green-500' },
];

const STATUS_STYLE: Record<TaskStatus, string> = {
  PENDING:     'bg-gray-100  text-gray-500',
  IN_PROGRESS: 'bg-amber-50  text-amber-700',
  DONE:        'bg-green-50  text-green-700',
};
const STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING:     'Pending',
  IN_PROGRESS: 'In Progress',
  DONE:        'Done',
};

const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  PENDING:     'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
};

function formatDate(d?: string) {
  if (!d) return '';
  try {
    return new Date(d.split(/[ T]/)[0] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return d; }
}

const emptyForm = {
  title:       '',
  type:        'Free' as TaskType,
  assigned_to: '',
  priority:    'normal' as TaskPriority,
  due_date:    '',
  notes:       '',
  vault_id:    '',
  storage_id:  '',
};

// ── Kanban card ───────────────────────────────────────────────────────────────
function TaskCard({ task, members, isOwner, onStatus, onDelete, onEdit }: {
  task:     Task;
  members:  Member[];
  isOwner:  boolean;
  onStatus: (id: string, s: TaskStatus) => void;
  onDelete: (id: string) => void;
  onEdit:   (t: Task) => void;
}) {
  const assignee    = members.find(m => m.user_id === task.assigned_to);
  const [statusMenu, setStatusMenu] = useState(false);
  const nextSt      = NEXT_STATUS[task.status];
  const nextLabel   = task.status === 'PENDING' ? 'Start' : 'Mark Done';

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            {task.priority === 'urgent' && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-full tracking-wide">
                URGENT
              </span>
            )}
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${TYPE_STYLE[task.type] || ''}`}>
              {task.type}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{task.title}</p>
        </div>
        {isOwner && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => onEdit(task)} title="Edit"
              className="p-1 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(task.id)} title="Delete"
              className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {assignee && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <UserAvatar picture={assignee.picture} name={assignee.name} size={18} />
          <span className="truncate">{assignee.name}</span>
        </div>
      )}

      {task.due_date && (() => {
        const overdue = task.status !== 'DONE' && new Date(task.due_date) < new Date();
        return (
          <div className={`flex items-center gap-1 text-xs mb-2 ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            <CalendarIcon className="w-3 h-3 flex-shrink-0" />
            {formatDate(task.due_date)}
            {overdue && <span className="ml-0.5">· Overdue</span>}
          </div>
        );
      })()}

      {/* Free task description */}
      {task.type === 'Free' && task.notes && (
        <p className="text-xs text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-2 mb-2 leading-relaxed line-clamp-3">
          {task.notes}
        </p>
      )}

      {/* Navigation links */}
      {(task.vault_id || task.storage_id) && (
        <div className="flex flex-wrap gap-2 mb-2">
          {task.vault_id && (
            <Link href={`/vault/${task.vault_id}`} title={`Vault: ${task.vault_id}`}
              className="text-[10px] text-blue-500 hover:text-blue-700 hover:underline">
              → View Vault
            </Link>
          )}
          {task.storage_id && (
            <Link href={`/storage/${task.storage_id}`}
              className="text-[10px] text-blue-500 hover:text-blue-700 hover:underline">
              → View Storage
            </Link>
          )}
        </div>
      )}

      {/* Status control */}
      {isOwner ? (
        <div className="relative mt-1">
          <button
            onClick={() => setStatusMenu(m => !m)}
            className={`w-full py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${STATUS_STYLE[task.status]}`}
          >
            {STATUS_LABEL[task.status]}
            <span className="opacity-40">▾</span>
          </button>
          {statusMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setStatusMenu(false)} />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                {(['PENDING', 'IN_PROGRESS', 'DONE'] as TaskStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => { onStatus(task.id, s); setStatusMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                      task.status === s
                        ? 'bg-gray-50 text-gray-400 cursor-default'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : nextSt && (
        <button onClick={() => onStatus(task.id, nextSt)}
          className={`w-full mt-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            nextSt === 'IN_PROGRESS'
              ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
              : 'border-green-200 text-green-600 hover:bg-green-50'
          }`}
        >
          {nextLabel}
        </button>
      )}
    </div>
  );
}

// ── List row ──────────────────────────────────────────────────────────────────
function TaskRow({ task, members, isOwner, onStatus, onDelete, onEdit }: {
  task:     Task;
  members:  Member[];
  isOwner:  boolean;
  onStatus: (id: string, s: TaskStatus) => void;
  onDelete: (id: string) => void;
  onEdit:   (t: Task) => void;
}) {
  const assignee   = members.find(m => m.user_id === task.assigned_to);
  const [statusMenu, setStatusMenu] = useState(false);
  const nextSt     = NEXT_STATUS[task.status];

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 hover:shadow-sm transition-shadow group">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'urgent' ? 'bg-red-500' : 'bg-gray-200'}`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 truncate">{task.title}</p>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${TYPE_STYLE[task.type] || ''}`}>
            {task.type}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {assignee && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <UserCircleIcon className="w-3 h-3 flex-shrink-0" />
              <span className="truncate max-w-[100px]">{assignee.name}</span>
            </span>
          )}
          {task.due_date && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <CalendarIcon className="w-3 h-3 flex-shrink-0" />
              {formatDate(task.due_date)}
            </span>
          )}
          {task.vault_id && (
            <Link href={`/vault/${task.vault_id}`} title={`Vault: ${task.vault_id}`}
              className="text-xs text-blue-500 hover:underline">
              → Vault
            </Link>
          )}
          {task.storage_id && (
            <Link href={`/storage/${task.storage_id}`}
              className="text-xs text-blue-500 hover:underline">
              → Storage
            </Link>
          )}
          {task.type === 'Free' && task.notes && (
            <span className="text-xs text-purple-600 italic truncate max-w-[200px]" title={task.notes}>
              {task.notes}
            </span>
          )}
        </div>
      </div>

      {/* Status: dropdown for owner, badge for worker */}
      {isOwner ? (
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setStatusMenu(m => !m)}
            className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${STATUS_STYLE[task.status]}`}
          >
            {STATUS_LABEL[task.status]}
            <span className="opacity-40 text-[9px]">▾</span>
          </button>
          {statusMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setStatusMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-[120px]">
                {(['PENDING', 'IN_PROGRESS', 'DONE'] as TaskStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => { onStatus(task.id, s); setStatusMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                      task.status === s
                        ? 'bg-gray-50 text-gray-400 cursor-default'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_STYLE[task.status]}`}>
          {STATUS_LABEL[task.status]}
        </span>
      )}

      {!isOwner && nextSt && (
        <button onClick={() => onStatus(task.id, nextSt)}
          className="flex-shrink-0 text-xs font-medium px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
          {task.status === 'PENDING' ? 'Start' : 'Done'}
        </button>
      )}

      {isOwner && (
        <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(task)}
            className="p-1 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
            <PencilIcon className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(task.id)}
            className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Form modal ────────────────────────────────────────────────────────────────
function TaskFormModal({ open, onClose, members, editTask, onSave }: {
  open:     boolean;
  onClose:  () => void;
  members:  Member[];
  editTask: Task | null;
  onSave:   (data: typeof emptyForm, editId?: string) => Promise<void>;
}) {
  const { user }                        = useAuth();
  const [form, setForm]                 = useState(emptyForm);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const [vaultQ, setVaultQ]             = useState('');
  const [vaultResults, setVaultResults] = useState<VaultResult[]>([]);
  const [vaultInfo, setVaultInfo]       = useState<{ id: string; display: string } | null>(null);
  const [storageUnits, setStorageUnits] = useState<StorageUnit[]>([]);

  useEffect(() => {
    if (!open) return;
    if (editTask) {
      setForm({
        title:       editTask.title,
        type:        editTask.type,
        assigned_to: editTask.assigned_to,
        priority:    editTask.priority,
        due_date:    editTask.due_date?.split(/[ T]/)[0] || '',
        notes:       editTask.notes || '',
        vault_id:    editTask.vault_id || '',
        storage_id:  editTask.storage_id || '',
      });
      if (editTask.vault_id) {
        pb.collection('vaults').getOne(editTask.vault_id, { fields: 'id,client_name,position' } as any)
          .then((v: any) => setVaultInfo({ id: v.id, display: `${v.client_name} · ${v.position}` }))
          .catch(() => setVaultInfo({ id: editTask.vault_id!, display: editTask.vault_id! }));
      } else {
        setVaultInfo(null);
      }
    } else {
      setForm(emptyForm);
      setVaultInfo(null);
    }
    setVaultQ('');
    setVaultResults([]);
    setError('');
    api.get('/api/storage')
      .then((units: any) => setStorageUnits(Array.isArray(units) ? units : []))
      .catch(() => {});
  }, [open, editTask]);

  // Vault search — loads all company vaults (same as warehouse page) and filters client-side
  const [allVaults, setAllVaults] = useState<VaultResult[]>([]);
  useEffect(() => {
    if (!open) return;
    api.get('/api/boxes').then((boxes: any[]) => {
      setAllVaults((Array.isArray(boxes) ? boxes : []).map((b: any) => ({
        id:          b.box_id || b.id,
        client_name: b.client_name || '',
        position:    b.position || '',
      })));
    }).catch(() => {});
  }, [open]);

  useEffect(() => {
    const q = vaultQ.trim().toLowerCase();
    if (q.length < 2) { setVaultResults([]); return; }
    const filtered = allVaults.filter(v =>
      v.client_name.toLowerCase().includes(q) || v.position.toLowerCase().includes(q)
    );
    setVaultResults(filtered);
  }, [vaultQ, allVaults]);

  const selectVault = (v: VaultResult) => {
    setForm(f => ({ ...f, vault_id: v.id }));
    setVaultInfo({ id: v.id, display: `${v.client_name} · ${v.position}` });
    setVaultQ('');
    setVaultResults([]);
  };

  const clearVault = () => {
    setForm(f => ({ ...f, vault_id: '' }));
    setVaultInfo(null);
  };

  const submit = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (form.type === 'Free' && !form.notes.trim()) { setError('Please describe what needs to be done'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form, editTask?.id);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/30"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ duration: 0.2 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-t-2xl md:rounded-2xl p-6 w-full md:max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                {editTask ? 'Edit Task' : 'New Task'}
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                  placeholder="Task description"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs text-gray-500 mb-2">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {TASK_TYPES.map(t => (
                    <button key={t} type="button"
                      onClick={() => setForm(f => ({ ...f, type: t }))}
                      className={`py-2 text-sm rounded-xl border transition-colors ${
                        form.type === t
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-200 text-gray-600 hover:border-blue-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assign to */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Assign to</label>
                <select
                  value={form.assigned_to}
                  onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Unassigned —</option>
                  {members.map(m => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.name}{m.role === 'owner' ? ' (Owner)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs text-gray-500 mb-2">Priority</label>
                <div className="flex gap-2">
                  {(['normal', 'urgent'] as TaskPriority[]).map(p => (
                    <button key={p} type="button"
                      onClick={() => setForm(f => ({ ...f, priority: p }))}
                      className={`flex-1 py-2 text-sm rounded-xl border transition-colors capitalize ${
                        form.priority === p
                          ? p === 'urgent'
                            ? 'bg-red-500 text-white border-red-500'
                            : 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due date */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Due date <span className="text-gray-300">(optional)</span>
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Vault search */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Linked Vault <span className="text-gray-300">(optional)</span>
                </label>
                {vaultInfo ? (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                    <span className="text-sm text-blue-700 truncate">{vaultInfo.display}</span>
                    <button onClick={clearVault} className="text-blue-400 hover:text-blue-600 ml-2 flex-shrink-0">
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                    <input
                      type="text"
                      value={vaultQ}
                      onChange={e => setVaultQ(e.target.value)}
                      placeholder="Search by client or position…"
                      className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {vaultQ.trim().length >= 2 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                        {vaultResults.length === 0 ? (
                          <div className="px-3 py-2.5 text-xs text-gray-400">No vaults found</div>
                        ) : (
                          vaultResults.map(v => (
                            <button key={v.id} onClick={() => selectVault(v)}
                              className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                              <span className="font-medium text-gray-800">{v.client_name}</span>
                              <span className="text-gray-400 ml-2 text-xs">{v.position}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Storage */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Linked Storage Unit <span className="text-gray-300">(optional)</span>
                </label>
                <select
                  value={form.storage_id}
                  onChange={e => setForm(f => ({ ...f, storage_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— None —</option>
                  {storageUnits.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.unit_name}{s.city ? ` · ${s.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes / Free description */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {form.type === 'Free' ? (
                    <>What needs to be done? <span className="text-red-400">*</span></>
                  ) : (
                    <>Notes <span className="text-gray-300">(optional)</span></>
                  )}
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder={form.type === 'Free' ? 'Describe the task in detail…' : 'Additional details...'}
                  rows={form.type === 'Free' ? 4 : 2}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 resize-none transition-colors ${
                    form.type === 'Free'
                      ? 'border-purple-200 focus:ring-purple-400 bg-purple-50/30'
                      : 'border-gray-200 focus:ring-blue-500'
                  }`}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-2.5 rounded-xl">
                  <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={submit}
                disabled={saving}
                className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : editTask ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TasksPage() {
  return <Suspense><TasksPageInner /></Suspense>;
}

function TasksPageInner() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  const [tasks,    setTasks]    = useState<Task[]>([]);
  const [members,  setMembers]  = useState<Member[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [view,     setView]     = useState<'kanban' | 'list'>('kanban');
  const [formOpen, setFormOpen] = useState(searchParams.get('new') === '1');
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTasks = async () => {
    try {
      const data = await api.get('/api/tasks');
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    api.get('/api/company/members')
      .then((m: any) => setMembers(Array.isArray(m) ? m : []))
      .catch(() => {});
  }, []);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      await api.put(`/api/tasks/${taskId}`, { status: newStatus });
    } catch {
      loadTasks();
    }
  };

  const handleSave = async (form: typeof emptyForm, editId?: string) => {
    if (editId) {
      await api.put(`/api/tasks/${editId}`, form);
      showToast('Task updated');
    } else {
      await api.post('/api/tasks', form);
      showToast('Task created');
    }
    await loadTasks();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/api/tasks/${deleteId}`);
      setTasks(prev => prev.filter(t => t.id !== deleteId));
      showToast('Task deleted');
    } catch {
      setError('Failed to delete task');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const openEdit = (task: Task) => { setEditTask(task); setFormOpen(true); };
  const openNew  = ()           => { setEditTask(null); setFormOpen(true); };

  const sorted = [...tasks].sort((a, b) => {
    if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
    if (b.priority === 'urgent' && a.priority !== 'urgent') return  1;
    return b.created > a.created ? -1 : 1;
  });

  const pendingCount = tasks.filter(t => t.status === 'PENDING').length;
  const doneCount    = tasks.filter(t => t.status === 'DONE').length;

  const listView = (
    <div className="space-y-2">
      {sorted.map((task, i) => (
        <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
          <TaskRow
            task={task} members={members} isOwner={isOwner}
            onStatus={handleStatusChange}
            onDelete={id => setDeleteId(id)}
            onEdit={openEdit}
          />
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 px-4 pb-28 md:px-8 md:pb-8 topbar-offset">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {tasks.length === 0
                ? 'No tasks yet'
                : `${pendingCount} pending · ${doneCount} done`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <div className="hidden md:flex items-center border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setView('kanban')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${view === 'kanban' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <ViewColumnsIcon className="w-4 h-4" />
                  <span>Kanban</span>
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${view === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <ListBulletIcon className="w-4 h-4" />
                  <span>List</span>
                </button>
              </div>
            )}
            {isOwner && (
              <button
                onClick={openNew}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                <PlusIcon className="w-4 h-4" />
                <span className="hidden sm:inline">New Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-2.5 rounded-xl mb-4"
            >
              <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')}><XMarkIcon className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonTaskRow key={i} />)}
          </div>

        /* Empty state */
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ClipboardDocumentListIcon className="w-12 h-12 text-gray-200 mb-4" />
            <p className="text-gray-400 font-medium">No tasks yet</p>
            {isOwner && (
              <p className="text-gray-300 text-sm mt-1">
                Click &ldquo;New Task&rdquo; to assign the first one
              </p>
            )}
          </div>

        ) : (
          <>
            {/* Kanban — desktop, owner, kanban mode */}
            {isOwner && view === 'kanban' && (
              <div className="hidden md:grid md:grid-cols-3 gap-5">
                {COLUMNS.map(col => {
                  const colTasks = sorted.filter(t => t.status === col.status);
                  return (
                    <div key={col.status}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                        <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                        <span className="ml-auto text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                          {colTasks.length}
                        </span>
                      </div>
                      <div className="space-y-3 min-h-[120px]">
                        <AnimatePresence>
                          {colTasks.map(task => (
                            <TaskCard
                              key={task.id}
                              task={task} members={members} isOwner={isOwner}
                              onStatus={handleStatusChange}
                              onDelete={id => setDeleteId(id)}
                              onEdit={openEdit}
                            />
                          ))}
                        </AnimatePresence>
                        {colTasks.length === 0 && (
                          <div className="border-2 border-dashed border-gray-100 rounded-xl h-20 flex items-center justify-center">
                            <p className="text-xs text-gray-300">No tasks</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List — mobile fallback for kanban, or explicit list mode, or worker */}
            <div className={isOwner && view === 'kanban' ? 'md:hidden' : ''}>
              {listView}
            </div>
          </>
        )}
      </main>

      {/* Task form modal */}
      <TaskFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        members={members}
        editTask={editTask}
        onSave={handleSave}
      />

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            >
              <h3 className="font-bold text-gray-900 mb-2">Delete task?</h3>
              <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50">
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
