'use client';

import { useEffect, useState, useRef } from 'react';
import { XMarkIcon } from '@/components/icons';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import PhotoAddButton from '@/components/PhotoAddButton';
import { photoSrc, usePhotoToken } from '@/lib/photo-url';
import { ItemCountsInput } from '@/components/ItemCounts';
import type { ItemCounts } from '@/lib/item-counts';

const JOB_TYPES       = ['Fire', 'Water', 'Mold', 'Moving', 'Storage'];
const CONTENTS_TYPES  = ['Boxes', 'Furniture', 'Both'];
const ROOM_LOCATIONS  = ['Kitchen', 'Patio', 'Living Room', 'Family Room', 'Dining Room', 'Bathroom', 'Bedroom 1', 'Bedroom 2', 'Bedroom 3'];
const VAULT_STATUSES  = ['Total Loss', 'Needs Cleaning', 'Storage Only'];
const ROWS            = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const COLUMNS         = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export interface VaultFormData {
  client_name: string;
  job_type: string;
  contents_type: string;
  room_location: string[];
  vault_status: string[];
  item_counts: ItemCounts;
  packer: string;
  pack_date: string;
  status: string;
  comments: string;
  photos: (string | File)[];
  /** Record the saved photos belong to, for building their URLs. */
  photoRef?: { id: string; collectionName?: string };
  // add-only
  row?: string;
  column?: number;
  level?: number;
}

interface Props {
  value: VaultFormData;
  onChange: (v: VaultFormData) => void;
  mode: 'add' | 'edit';
  positionLabel?: string;
  error?: string;
  saving?: boolean;
  submitLabel?: string;
  onSubmit: (e: React.FormEvent) => void;
  onPhotos: (files: FileList | null) => void;
  onPhotoNative: (photo: File) => void;
  onRemovePhoto: (idx: number) => void;
}

function chip(active: boolean) {
  return `px-3 py-1.5 text-sm rounded-lg border transition-colors ${
    active ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'
  }`;
}

function toggle(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
}

function parsePackers(packer: string): string[] {
  return packer.split(',').map(s => s.trim()).filter(Boolean);
}

function togglePacker(current: string, name: string): string {
  const parts = parsePackers(current);
  const exists = parts.includes(name);
  const next = exists ? parts.filter(p => p !== name) : [...parts, name];
  return next.join(', ');
}

export default function VaultForm({
  value, onChange, mode, positionLabel, error, saving, submitLabel, onSubmit, onPhotos, onPhotoNative, onRemovePhoto,
}: Props) {
  const set = (patch: Partial<VaultFormData>) => onChange({ ...value, ...patch });
  const { user } = useAuth();
  const photoToken = usePhotoToken();
  const [members, setMembers] = useState<{ user_id: string; name: string }[]>([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    // Capture mount-time values so the async call doesn't overwrite user input
    const initialMode  = mode;
    const initialValue = value;
    const initialUser  = user;
    api.get('/api/company/members')
      .then((data: any) => {
        if (!Array.isArray(data)) return;
        setMembers(data);
        if (initialMode === 'add' && !initialValue.packer && initialUser?.name) {
          onChangeRef.current({ ...initialValue, packer: initialUser.name });
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedPackers = parsePackers(value.packer);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Position indicator */}
      {positionLabel && (
        <div className={`rounded-xl p-3 text-sm font-medium ${mode === 'add' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-500'}`}>
          {positionLabel}
        </div>
      )}

      {/* Row / Column / Level — add mode only */}
      {mode === 'add' && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Row',    id: 'row',    opts: ROWS,    val: value.row ?? 'A',   cast: (v: string) => v },
            { label: 'Column', id: 'column', opts: COLUMNS, val: value.column ?? 1,  cast: (v: string) => Number(v) },
            { label: 'Level',  id: 'level',  opts: null,    val: value.level ?? 1,   cast: (v: string) => Number(v) },
          ].map(({ label, id, opts, val, cast }) => (
            <div key={id}>
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <select
                value={val}
                onChange={e => set({ [id]: cast(e.target.value) } as any)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {opts
                  ? opts.map(o => <option key={o}>{o}</option>)
                  : [<option key={1} value={1}>Lower (L1)</option>, <option key={2} value={2}>Upper (L2)</option>]
                }
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Client Name */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Client Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          placeholder="Client name"
          value={value.client_name}
          onChange={e => set({ client_name: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Job Type */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Job Type</label>
        <div className="flex flex-wrap gap-2">
          {JOB_TYPES.map(t => (
            <button type="button" key={t} onClick={() => set({ job_type: t })} className={chip(value.job_type === t)}>{t}</button>
          ))}
        </div>
      </div>

      {/* Contents Type */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Contents Type</label>
        <div className="flex flex-wrap gap-2">
          {CONTENTS_TYPES.map(t => (
            <button type="button" key={t} onClick={() => set({ contents_type: t })} className={chip(value.contents_type === t)}>{t}</button>
          ))}
        </div>
      </div>

      {/* Room Location */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Room Location {mode === 'add' ? '(multi)' : ''}</label>
        <div className="flex flex-wrap gap-2">
          {ROOM_LOCATIONS.map(r => (
            <button type="button" key={r} onClick={() => set({ room_location: toggle(value.room_location, r) })} className={chip(value.room_location.includes(r))}>{r}</button>
          ))}
        </div>
      </div>

      {/* Vault Status / Condition */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Condition {mode === 'add' ? '(multi)' : ''}</label>
        <div className="flex flex-wrap gap-2">
          {VAULT_STATUSES.map(s => (
            <button type="button" key={s} onClick={() => set({ vault_status: toggle(value.vault_status, s) })} className={chip(value.vault_status.includes(s))}>{s}</button>
          ))}
        </div>
      </div>

      {/* Item counts */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Inventory count</label>
        <ItemCountsInput value={value.item_counts} onChange={ic => set({ item_counts: ic })} />
      </div>

      {/* Pack Date */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Pack Date <span className="text-red-500">*</span></label>
        <input
          type="date"
          required
          value={value.pack_date}
          onChange={e => set({ pack_date: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Packer */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Packer</label>
        <input
          type="text"
          placeholder="Who packed this?"
          value={value.packer}
          onChange={e => set({ packer: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {members.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {members.map(m => {
              const active = selectedPackers.includes(m.name);
              return (
                <button
                  type="button"
                  key={m.user_id}
                  onClick={() => set({ packer: togglePacker(value.packer, m.name) })}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 text-gray-500 hover:border-blue-300'
                  }`}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Job Status */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Job Status</label>
        <div className="flex gap-2">
          {['PENDING', 'READY', 'DELIVERED'].map(s => (
            <button type="button" key={s} onClick={() => set({ status: s })} className={chip(value.status === s)}>{s}</button>
          ))}
        </div>
      </div>

      {/* Comments */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Comments</label>
        <textarea
          placeholder="Add comments..."
          value={value.comments}
          onChange={e => set({ comments: e.target.value })}
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Photos */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Photos (max 6)</label>
        {value.photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
            {value.photos.map((photo, idx) => (
              <div key={idx} className="relative group">
                <img src={photoSrc(photo, value.photoRef || { id: '' }, 'grid', photoToken)} alt="" className="w-full h-20 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => onRemovePhoto(idx)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {value.photos.length < 6 && (
          <PhotoAddButton onFiles={onPhotos} onPhotoNative={onPhotoNative} />
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 bg-gray-950 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        {saving ? 'Saving...' : (submitLabel ?? 'Save')}
      </button>
    </form>
  );
}
