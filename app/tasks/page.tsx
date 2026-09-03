'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon, XMarkIcon, TrashIcon, CalendarIcon, UserCircleIcon,
  ExclamationCircleIcon, ListBulletIcon, ViewColumnsIcon, PencilIcon,
  ClipboardDocumentListIcon, MagnifyingGlassIcon, ArchiveBoxIcon, ArrowPathIcon,
  CheckCircleIcon, ClockIcon,
} from '@/components/icons';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { SkeletonTaskRow } from '@/components/Skeleton';
import { UserAvatar } from '@/components/UserAvatar';
import PhotoAddButton from '@/components/PhotoAddButton';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { pb } from '@/lib/pb';
import { compressImage } from '@/lib/compress-image';
import { photoSrc, photoUrl, usePhotoToken } from '@/lib/photo-url';
import { useOverlayBack } from '@/lib/overlay-back';

type TaskStatus   = 'PENDING' | 'IN_PROGRESS' | 'DONE';
type TaskPriority = 'normal' | 'urgent';
type TaskType     = 'Cleaning' | 'Restoration' | 'Delivery' | 'Free';
type TaskFilter   = 'all' | 'mine' | 'overdue' | 'today';

interface Task {
  id:              string;
  title:           string;
  type:            TaskType;
  assigned_to:     string;
  priority:        TaskPriority;
  status:          TaskStatus;
  vault_id?:       string;
  storage_id?:     string;
  due_date?:       string;
  notes?:          string;
  company_id:      string;
  created_by:      string;
  created:         string;
  started_at?:     string;
  completed_at?:   string;
  completion_note?: string;
  before_photos?:  string[];
  after_photos?:   string[];
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
  id:           string;
  client_name:  string;
  position:     string;
  warehouse_id: string;
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

// Server timestamps come as UTC; render them in the viewer's local time.
function formatDateTime(d?: string) {
  if (!d) return '';
  try {
    const iso = d.includes('T') ? d : d.replace(' ', 'T');
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return d; }
}

function formatDuration(startedAt?: string, completedAt?: string) {
  if (!startedAt || !completedAt) return '';
  const ms = Date.parse(completedAt.replace(' ', 'T')) - Date.parse(startedAt.replace(' ', 'T'));
  if (isNaN(ms) || ms < 0) return '';
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'under a minute';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
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

// ── 3-step status picker ──────────────────────────────────────────────────────
function TaskStatusPicker({ status, isOwner, loading, onChange }: {
  status:  TaskStatus;
  isOwner: boolean;
  loading: boolean;
  onChange: (s: TaskStatus) => void;
}) {
  const steps: { value: TaskStatus; label: string }[] = [
    { value: 'PENDING',     label: 'Pending'  },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'DONE',        label: 'Done'     },
  ];
  const currentIdx = steps.findIndex(s => s.value === status);

  return (
    <div className="flex items-stretch rounded-lg overflow-hidden border border-gray-200 mt-2">
      {steps.map(({ value, label }, idx) => {
        const isActive  = value === status;
        const isNext    = idx === currentIdx + 1;
        const canClick  = isOwner ? !isActive : isNext;
        const bgActive  = value === 'PENDING' ? 'bg-gray-200 text-gray-700'
          : value === 'IN_PROGRESS' ? 'bg-amber-400 text-white'
          : 'bg-green-500 text-white';
        const bgPassive = 'bg-white text-gray-400 hover:bg-gray-50';
        return (
          <button
            key={value}
            type="button"
            disabled={!canClick || loading}
            onClick={canClick && !loading ? () => onChange(value) : undefined}
            className={`flex-1 py-1.5 text-[10px] font-semibold text-center transition-colors border-r border-gray-200 last:border-r-0
              ${isActive ? bgActive : bgPassive}
              ${canClick && !loading ? 'cursor-pointer' : 'cursor-default'}
              disabled:opacity-60`}
          >
            {loading && isActive ? '…' : label}
          </button>
        );
      })}
    </div>
  );
}

// ── Kanban card ───────────────────────────────────────────────────────────────
function TaskCard({ task, members, isOwner, onStatus, onDelete, onEdit, statusLoading, vault, canEditPhotos, onManagePhotos }: {
  task:            Task;
  members:         Member[];
  isOwner:         boolean;
  onStatus:        (id: string, s: TaskStatus) => void;
  onDelete:        (id: string) => void;
  onEdit:          (t: Task) => void;
  statusLoading:   boolean;
  vault?:          VaultResult;
  canEditPhotos?:  boolean;
  onManagePhotos?: (target: 'before' | 'after') => void;
}) {
  const assignee    = members.find(m => m.user_id === task.assigned_to);
  const [sheetOpen, setSheetOpen] = useState(false);
  useOverlayBack(sheetOpen, () => setSheetOpen(false));

  return (
    <>
    <div onClick={() => setSheetOpen(true)} className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
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
          <div onClick={e => e.stopPropagation()} className="flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
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
        const todayStr = new Date().toLocaleDateString('en-CA');
        const overdue = task.status !== 'DONE' && task.due_date.split(/[ T]/)[0] < todayStr;
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

      {/* Navigation chips */}
      {(task.vault_id || task.storage_id) && (
        <div onClick={e => e.stopPropagation()} className="flex flex-wrap gap-1.5 mb-2">
          {task.vault_id && vault ? (
            <Link
              href={`/warehouses/${vault.warehouse_id}?vault=${task.vault_id}`}
              title={`${vault.client_name} · ${vault.position}`}
              className="flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full hover:bg-blue-100 transition-colors max-w-full"
            >
              <ArchiveBoxIcon className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{vault.client_name || vault.position}</span>
            </Link>
          ) : task.vault_id ? (
            <Link href={`/vault/${task.vault_id}`} className="text-[10px] text-blue-500 hover:underline">
              → Vault
            </Link>
          ) : null}
          {task.storage_id && (
            <Link href={`/storage/${task.storage_id}`}
              className="flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full hover:bg-gray-100 transition-colors">
              → Storage
            </Link>
          )}
        </div>
      )}

      {/* Status control */}
      <div onClick={e => e.stopPropagation()}>
        <TaskStatusPicker
          status={task.status}
          isOwner={isOwner}
          loading={statusLoading}
          onChange={s => onStatus(task.id, s)}
        />
      </div>
    </div>

    <AnimatePresence>
      {sheetOpen && (
        <TaskDetailSheet
          task={task}
          members={members}
          isOwner={isOwner}
          onStatus={onStatus}
          onDelete={onDelete}
          onEdit={onEdit}
          onClose={() => setSheetOpen(false)}
          statusLoading={statusLoading}
          vault={vault}
          canEditPhotos={canEditPhotos}
          onManagePhotos={onManagePhotos}
        />
      )}
    </AnimatePresence>
    </>
  );
}

// ── Task Detail Sheet ─────────────────────────────────────────────────────────
function TaskDetailSheet({ task, members, isOwner, onStatus, onDelete, onEdit, onClose, statusLoading, vault, canEditPhotos, onManagePhotos }: {
  task:            Task;
  members:         Member[];
  isOwner:         boolean;
  onStatus:        (id: string, s: TaskStatus) => void;
  onDelete:        (id: string) => void;
  onEdit:          (t: Task) => void;
  onClose:         () => void;
  statusLoading:   boolean;
  vault?:          VaultResult;
  canEditPhotos?:  boolean;
  onManagePhotos?: (target: 'before' | 'after') => void;
}) {
  const assignee  = members.find(m => m.user_id === task.assigned_to);
  const createdBy = members.find(m => m.user_id === task.created_by);
  const todayStr  = new Date().toLocaleDateString('en-CA');
  const isOverdue = !!task.due_date && task.status !== 'DONE' && task.due_date.split(/[ T]/)[0] < todayStr;
  const photoToken = usePhotoToken();
  const [lightbox, setLightbox] = useState<string | null>(null);
  useOverlayBack(lightbox !== null, () => setLightbox(null));
  const photoRecord = { id: task.id, collectionName: 'tasks' };
  const duration = formatDuration(task.started_at, task.completed_at);
  const showPhotoBlock = !!(canEditPhotos || task.completed_at || task.completion_note || task.before_photos?.length || task.after_photos?.length);

  const renderPhotoSection = (target: 'before' | 'after', label: string) => {
    const files = (target === 'before' ? task.before_photos : task.after_photos) || [];
    if (files.length === 0 && !canEditPhotos) return null;
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-medium text-gray-400">{label}</p>
          {canEditPhotos && onManagePhotos && (
            <button onClick={() => onManagePhotos(target)} className="text-[11px] font-medium text-blue-600 hover:text-blue-800">
              {files.length ? 'Manage' : 'Add'}
            </button>
          )}
        </div>
        {files.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {files.map((name, i) => (
              <img key={i} src={photoUrl(photoRecord, name, 'grid', photoToken)} alt=""
                className="w-full h-20 object-cover rounded-lg cursor-pointer"
                onClick={() => setLightbox(photoUrl(photoRecord, name, 'full', photoToken))} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-300">No photos yet</p>
        )}
      </div>
    );
  };

  return (
    <>
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4 bg-black/40" onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-5 pb-8 pt-2">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {task.priority === 'urgent' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-full tracking-wide">URGENT</span>
                )}
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${TYPE_STYLE[task.type] || ''}`}>
                  {task.type}
                </span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${STATUS_STYLE[task.status]}`}>
                  {STATUS_LABEL[task.status]}
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 leading-snug">{task.title}</h2>
            </div>
            <button onClick={onClose} className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors mt-0.5">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Details grid */}
          <div className="space-y-3 mb-4">
            {assignee && (
              <div className="flex items-center gap-2.5">
                <UserAvatar picture={assignee.picture} name={assignee.name} size={28} />
                <div>
                  <p className="text-[10px] text-gray-400 leading-none mb-0.5">Assigned to</p>
                  <p className="text-sm font-medium text-gray-800">{assignee.name}</p>
                </div>
              </div>
            )}

            {createdBy && createdBy.user_id !== task.assigned_to && (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <UserCircleIcon className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 leading-none mb-0.5">Created by</p>
                  <p className="text-sm font-medium text-gray-800">{createdBy.name}</p>
                </div>
              </div>
            )}

            {task.due_date && (
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <CalendarIcon className={`w-4 h-4 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 leading-none mb-0.5">Due date</p>
                  <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-800'}`}>
                    {formatDate(task.due_date)}{isOverdue && ' · Overdue'}
                  </p>
                </div>
              </div>
            )}

            {task.notes && (
              <div className={`rounded-xl px-3.5 py-3 ${task.type === 'Free' ? 'bg-purple-50 border border-purple-100' : 'bg-gray-50 border border-gray-100'}`}>
                <p className={`text-[10px] font-medium mb-1 ${task.type === 'Free' ? 'text-purple-500' : 'text-gray-400'}`}>
                  {task.type === 'Free' ? 'Description' : 'Notes'}
                </p>
                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${task.type === 'Free' ? 'text-purple-800' : 'text-gray-700'}`}>
                  {task.notes}
                </p>
              </div>
            )}

            {/* Photos — before (start) / after (done) + duration + note */}
            {showPhotoBlock && (
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-3 space-y-3">
                {task.completed_at && (
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-xs font-semibold text-green-700">Completed</span>
                    <span className="ml-auto text-[11px] text-gray-500">{formatDateTime(task.completed_at)}</span>
                  </div>
                )}
                {duration && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <ClockIcon className="w-3.5 h-3.5 flex-shrink-0" /> Took {duration}
                  </div>
                )}
                {renderPhotoSection('before', 'Before')}
                {renderPhotoSection('after', 'After')}
                {task.completion_note && (
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{task.completion_note}</p>
                )}
              </div>
            )}

            {(task.vault_id || task.storage_id) && (
              <div className="flex flex-wrap gap-2">
                {task.vault_id && vault ? (
                  <Link
                    href={`/warehouses/${vault.warehouse_id}?vault=${task.vault_id}`}
                    onClick={onClose}
                    className="flex items-center gap-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-100 px-3 py-2 rounded-xl hover:bg-blue-100 transition-colors"
                  >
                    <ArchiveBoxIcon className="w-4 h-4 flex-shrink-0" />
                    <span>{vault.client_name || vault.position} · {vault.position}</span>
                  </Link>
                ) : task.vault_id ? (
                  <Link href={`/vault/${task.vault_id}`} onClick={onClose}
                    className="flex items-center gap-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-100 px-3 py-2 rounded-xl hover:bg-blue-100 transition-colors">
                    <ArchiveBoxIcon className="w-4 h-4" />
                    Open Vault
                  </Link>
                ) : null}
                {task.storage_id && (
                  <Link href={`/storage/${task.storage_id}`} onClick={onClose}
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-100 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors">
                    Open Storage
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Status picker */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1.5">Status</p>
            <TaskStatusPicker
              status={task.status}
              isOwner={isOwner}
              loading={statusLoading}
              onChange={s => onStatus(task.id, s)}
            />
          </div>

          {/* Owner actions */}
          {isOwner && (
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => { onEdit(task); onClose(); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => { onDelete(task.id); onClose(); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-red-100 text-red-600 bg-red-50 text-sm font-medium rounded-xl hover:bg-red-100 transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>

    {lightbox && (
      <div className="fixed inset-0 z-[85] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
        <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
      </div>
    )}
    </>
  );
}

// ── List row ──────────────────────────────────────────────────────────────────
function TaskRow({ task, members, isOwner, onStatus, onDelete, onEdit, statusLoading, vault, canEditPhotos, onManagePhotos }: {
  task:            Task;
  members:         Member[];
  isOwner:         boolean;
  onStatus:        (id: string, s: TaskStatus) => void;
  onDelete:        (id: string) => void;
  onEdit:          (t: Task) => void;
  statusLoading:   boolean;
  vault?:          VaultResult;
  canEditPhotos?:  boolean;
  onManagePhotos?: (target: 'before' | 'after') => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  useOverlayBack(sheetOpen, () => setSheetOpen(false));
  const assignee  = members.find(m => m.user_id === task.assigned_to);
  const todayStr = new Date().toLocaleDateString('en-CA');
  const isOverdue = !!task.due_date && task.status !== 'DONE' && task.due_date.split(/[ T]/)[0] < todayStr;

  return (
    <>
      <div
        onClick={() => setSheetOpen(true)}
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 hover:shadow-sm transition-shadow cursor-pointer group ${
          isOverdue ? 'bg-red-50/50 border-red-200' : 'bg-white border-gray-100'
        }`}
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
          task.priority === 'urgent' ? 'bg-red-500' : isOverdue ? 'bg-red-400' : 'bg-gray-200'
        }`} />

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
              <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                <CalendarIcon className="w-3 h-3 flex-shrink-0" />
                {formatDate(task.due_date)}
                {isOverdue && <span>· Overdue</span>}
              </span>
            )}
            {/* Notes preview for all types */}
            {task.notes && (
              <span className={`text-xs italic truncate max-w-[160px] ${task.type === 'Free' ? 'text-purple-500' : 'text-gray-400'}`}>
                {task.notes}
              </span>
            )}
          </div>
        </div>

        {/* Status badge (compact) — desktop shows picker, mobile shows badge */}
        <div className="flex-shrink-0">
          <div className="hidden md:block w-[160px]" onClick={e => e.stopPropagation()}>
            <TaskStatusPicker
              status={task.status}
              isOwner={isOwner}
              loading={statusLoading}
              onChange={s => onStatus(task.id, s)}
            />
          </div>
          <span className={`md:hidden text-[10px] font-semibold px-2 py-1 rounded-full ${STATUS_STYLE[task.status]}`}>
            {STATUS_LABEL[task.status]}
          </span>
        </div>

        {isOwner && (
          <div className="hidden md:flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
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

      <AnimatePresence>
        {sheetOpen && (
          <TaskDetailSheet
            task={task}
            members={members}
            isOwner={isOwner}
            onStatus={onStatus}
            onDelete={onDelete}
            onEdit={onEdit}
            onClose={() => setSheetOpen(false)}
            statusLoading={statusLoading}
            vault={vault}
            canEditPhotos={canEditPhotos}
            onManagePhotos={onManagePhotos}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Form modal ────────────────────────────────────────────────────────────────
function TaskFormModal({ open, onClose, members, editTask, onSave, allVaults }: {
  open:      boolean;
  onClose:   () => void;
  members:   Member[];
  editTask:  Task | null;
  onSave:    (data: typeof emptyForm, editId?: string) => Promise<void>;
  allVaults: VaultResult[];
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

  // allVaults is passed from parent (loaded once on page mount, not on each form open)

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
          className="native-sheet-overlay fixed inset-0 z-[55] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/30"
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
                className="w-full py-3 bg-gray-950 text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50"
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

// ── Task Photo Sheet — capture/manage BEFORE (at start) or AFTER (at done) ─────
function TaskPhotoSheet({ task, target, setStatus, withNote, onClose, onDone }: {
  task:       Task;
  target:     'before' | 'after';
  setStatus?: TaskStatus;
  withNote?:  boolean;
  onClose:    () => void;
  onDone:     (msg: string) => void;
}) {
  const photoToken = usePhotoToken();
  const rec = { id: task.id, collectionName: 'tasks' };
  const initial = (target === 'before' ? task.before_photos : task.after_photos) || [];
  const [photos, setPhotos]     = useState<(string | File)[]>(initial);
  const [note, setNote]         = useState(task.completion_note || '');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);
  useOverlayBack(lightbox !== null, () => setLightbox(null));

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const out: File[] = [];
    for (const f of Array.from(files).slice(0, Math.max(0, 4 - photos.length))) {
      try { out.push(await compressImage(f)); } catch { /* skip undecodable */ }
    }
    if (out.length) setPhotos(p => [...p, ...out].slice(0, 4));
  };
  const addNative = (file: File) => { compressImage(file).then(c => setPhotos(p => [...p, c].slice(0, 4))).catch(() => {}); };
  const removeAt  = (i: number) => setPhotos(p => p.filter((_, j) => j !== i));

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      if (setStatus) fd.append('status', setStatus);
      if (withNote)  fd.append('completion_note', note.trim());
      const key = target === 'before' ? 'before_photos' : 'after_photos';
      // Kept filenames (strings) + new Files define the resulting set; '' clears it.
      if (photos.length === 0) fd.append(key, '');
      else photos.forEach(p => fd.append(key, p));
      const token = pb.authStore.token;
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd,
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as any)?.error || 'Failed to save'); }
      onDone(setStatus === 'DONE' ? 'Task completed' : setStatus === 'IN_PROGRESS' ? 'Task started' : 'Photos saved');
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const heading = setStatus === 'IN_PROGRESS' ? 'Start task' : setStatus === 'DONE' ? 'Complete task' : (target === 'before' ? 'Before photos' : 'After photos');
  const cta     = setStatus === 'IN_PROGRESS' ? 'Start task' : setStatus === 'DONE' ? 'Mark as Done' : 'Save photos';
  const ctaColor = setStatus === 'DONE' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-950 hover:bg-gray-800';

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-start md:items-center justify-center p-4 bg-black/40 overflow-y-auto" onClick={onClose}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }} onClick={e => e.stopPropagation()}
          className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl my-auto max-h-[92vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-gray-900">{heading}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-5 h-5" /></button>
          </div>
          <p className="text-sm text-gray-500 mb-5 line-clamp-2">{task.title}</p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                {target === 'before' ? 'Before photos' : 'After photos'} <span className="text-gray-300">(optional, max 4)</span>
              </label>
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {photos.map((p, i) => (
                    <div key={i} className="relative">
                      <img src={photoSrc(p, rec, 'grid', photoToken)} alt=""
                        className="w-full h-20 object-cover rounded-xl cursor-pointer"
                        onClick={() => setLightbox(photoSrc(p, rec, 'full', photoToken))} />
                      <button type="button" onClick={() => removeAt(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {photos.length < 4 && <PhotoAddButton onFiles={addFiles} onPhotoNative={addNative} />}
            </div>

            {withNote && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Completion note (optional)</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={2000} placeholder="What was done…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-2.5 rounded-xl">
                <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}
            <button onClick={submit} disabled={saving}
              className={`w-full flex items-center justify-center gap-2 py-3 text-white text-sm font-semibold rounded-full transition-colors disabled:opacity-50 ${ctaColor}`}>
              <CheckCircleIcon className="w-5 h-5" />
              {saving ? 'Saving…' : cta}
            </button>
          </div>
        </motion.div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[85] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TasksPage() {
  return <Suspense><TasksPageInner /></Suspense>;
}

function TasksPageInner() {
  const { user, canManage } = useAuth();
  const isOwner = canManage;
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  const [tasks,     setTasks]     = useState<Task[]>([]);
  const [members,   setMembers]   = useState<Member[]>([]);
  const [allVaults, setAllVaults] = useState<VaultResult[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,    setError]    = useState('');
  const [view,     setView]     = useState<'kanban' | 'list'>('kanban');
  const [formOpen, setFormOpen] = useState(searchParams.get('new') === '1');
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [deleting, setDeleting]     = useState(false);
  const [clearAll, setClearAll]     = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [taskFilter, setTaskFilter]     = useState<TaskFilter>('all');
  const [statusLoading, setStatusLoading] = useState<Record<string, boolean>>({});
  const [photoSheet, setPhotoSheet] = useState<{ task: Task; target: 'before' | 'after'; setStatus?: TaskStatus; withNote?: boolean } | null>(null);

  // Hardware back (Android) closes the top open overlay before leaving the screen
  useOverlayBack(!!photoSheet, () => setPhotoSheet(null));
  useOverlayBack(clearAll, () => setClearAll(false));
  useOverlayBack(deleteId !== null, () => setDeleteId(null));
  useOverlayBack(!!editTask, () => setEditTask(null));
  useOverlayBack(formOpen, () => setFormOpen(false));

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

  const loadVaults = () =>
    api.get('/api/boxes')
      .then((boxes: any[]) => setAllVaults((Array.isArray(boxes) ? boxes : []).map((b: any) => ({
        id:           b.box_id || b.id,
        client_name:  b.client_name || '',
        position:     b.position || '',
        warehouse_id: b.warehouse_id || '',
      }))))
      .catch(() => {});

  useEffect(() => {
    loadTasks();
    api.get('/api/company/members')
      .then((m: any) => setMembers(Array.isArray(m) ? m : []))
      .catch(() => {});
    loadVaults();
  }, []);

  // Refresh vault list whenever the task form opens so newly-created vaults appear
  useEffect(() => { if (formOpen) loadVaults(); }, [formOpen]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const t = tasks.find(x => x.id === taskId);
    if (!t) return;
    // Starting a task prompts the BEFORE photo; completing prompts the AFTER photo
    // + note. Both are optional but the moment is captured at the right step.
    if (newStatus === 'IN_PROGRESS' && t.status === 'PENDING') {
      setPhotoSheet({ task: t, target: 'before', setStatus: 'IN_PROGRESS' });
      return;
    }
    if (newStatus === 'DONE' && t.status !== 'DONE') {
      setPhotoSheet({ task: t, target: 'after', setStatus: 'DONE', withNote: true });
      return;
    }
    setStatusLoading(prev => ({ ...prev, [taskId]: true }));
    setTasks(prev => prev.map(x => x.id === taskId ? { ...x, status: newStatus } : x));
    try {
      await api.put(`/api/tasks/${taskId}`, { status: newStatus });
    } catch {
      loadTasks();
    } finally {
      setStatusLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const openManagePhotos = (task: Task, target: 'before' | 'after') =>
    setPhotoSheet({ task, target });

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

  const handleDeleteAll = async () => {
    setClearingAll(true);
    try {
      const token = pb.authStore.token;
      const res = await fetch('/api/tasks/all', {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || 'Failed to delete all tasks');
      }
      setTasks([]);
      showToast('All tasks deleted');
    } catch {
      setError('Failed to delete all tasks');
    } finally {
      setClearingAll(false);
      setClearAll(false);
    }
  };

  const openEdit = (task: Task) => { setEditTask(task); setFormOpen(true); };
  const openNew  = ()           => { setEditTask(null); setFormOpen(true); };

  const sorted = useMemo(() => [...tasks].sort((a, b) => {
    if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
    if (b.priority === 'urgent' && a.priority !== 'urgent') return  1;
    if (b.created > a.created) return 1;
    if (b.created < a.created) return -1;
    return 0;
  }), [tasks]);

  const pendingCount = tasks.filter(t => t.status === 'PENDING').length;
  const doneCount    = tasks.filter(t => t.status === 'DONE').length;

  const overdueCount = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return tasks.filter(t => !!t.due_date && t.status !== 'DONE' && t.due_date.split(/[ T]/)[0] < todayStr).length;
  }, [tasks]);

  const filteredSorted = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return sorted.filter(t => {
      if (taskFilter === 'mine')    return t.assigned_to === user?.id;
      if (taskFilter === 'overdue') return !!t.due_date && t.status !== 'DONE' && t.due_date.split(/[ T]/)[0] < todayStr;
      if (taskFilter === 'today')   return !!t.due_date && t.due_date.split(/[ T]/)[0] === todayStr;
      return true;
    });
  }, [sorted, taskFilter, user?.id]);

  const listView = (
    <div className="space-y-2">
      {filteredSorted.length === 0 && taskFilter !== 'all' ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-gray-400 text-sm">No tasks match this filter</p>
          <button onClick={() => setTaskFilter('all')} className="mt-2 text-sm text-blue-500 hover:underline">
            Show all
          </button>
        </div>
      ) : filteredSorted.map((task, i) => (
        <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
          <TaskRow
            task={task} members={members} isOwner={isOwner}
            onStatus={handleStatusChange}
            onDelete={id => setDeleteId(id)}
            onEdit={openEdit}
            statusLoading={!!statusLoading[task.id]}
            vault={task.vault_id ? allVaults.find(v => v.id === task.vault_id) : undefined}
            canEditPhotos={isOwner || task.assigned_to === user?.id}
            onManagePhotos={(target) => openManagePhotos(task, target)}
          />
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 flex-1 min-w-0 px-4 pb-8 md:px-8 md:pb-8 topbar-offset">

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
            <button
              onClick={loadTasks}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              aria-label="Refresh"
              title="Refresh"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
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
            {isOwner && tasks.length > 0 && (
              <button
                onClick={() => setClearAll(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 text-sm font-semibold rounded-full hover:bg-red-100 transition-colors border border-red-100"
              >
                <TrashIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}
            {isOwner && (
              <button
                onClick={openNew}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-950 text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors shadow-sm"
              >
                <PlusIcon className="w-4 h-4" />
                <span className="hidden sm:inline">New Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter chips */}
        {tasks.length > 0 && (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {([
              { key: 'all',     label: 'All' },
              { key: 'mine',    label: 'Mine' },
              { key: 'overdue', label: 'Overdue', count: overdueCount },
              { key: 'today',   label: 'Due today' },
            ] as { key: TaskFilter; label: string; count?: number }[]).map(chip => (
              <button
                key={chip.key}
                onClick={() => setTaskFilter(chip.key)}
                className={`flex items-center gap-1.5 flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  taskFilter === chip.key
                    ? chip.key === 'overdue'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-gray-900 text-white border-gray-900'
                    : chip.key === 'overdue' && overdueCount > 0
                      ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {chip.label}
                {chip.count !== undefined && chip.count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    taskFilter === chip.key ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
                  }`}>
                    {chip.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

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
                  const colTasks = filteredSorted.filter(t => t.status === col.status);
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
                              statusLoading={!!statusLoading[task.id]}
                              vault={task.vault_id ? allVaults.find(v => v.id === task.vault_id) : undefined}
                              canEditPhotos={isOwner || task.assigned_to === user?.id}
                              onManagePhotos={(target) => openManagePhotos(task, target)}
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
        allVaults={allVaults}
      />

      {/* Task photo sheet — before (start) / after (done) / manage anytime */}
      <AnimatePresence>
        {photoSheet && (
          <TaskPhotoSheet
            task={photoSheet.task}
            target={photoSheet.target}
            setStatus={photoSheet.setStatus}
            withNote={photoSheet.withNote}
            onClose={() => setPhotoSheet(null)}
            onDone={(msg) => { showToast(msg); loadTasks(); }}
          />
        )}
      </AnimatePresence>

      {/* Clear all confirm */}
      <AnimatePresence>
        {clearAll && (
          <div className="fixed inset-0 z-[55] flex items-start md:items-center justify-center p-4 bg-black/30">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            >
              <h3 className="font-bold text-gray-900 mb-2">Delete all tasks?</h3>
              <p className="text-sm text-gray-500 mb-5">This will permanently delete all {tasks.length} tasks. This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setClearAll(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleDeleteAll} disabled={clearingAll}
                  className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50">
                  {clearingAll ? 'Deleting…' : 'Delete All'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-[55] flex items-start md:items-center justify-center p-4 bg-black/30">
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
