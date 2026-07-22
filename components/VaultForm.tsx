'use client';

import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';

const JOB_TYPES       = ['Fire', 'Water', 'Moving', 'Storage'];
const CONTENTS_TYPES  = ['Boxes', 'Furniture', 'Both'];
const ROOM_LOCATIONS  = ['Kitchen', 'Patio', 'Living Room', 'Family Room', 'Dining Room', 'Bathroom', 'Bedroom 1', 'Bedroom 2', 'Bedroom 3'];
const VAULT_STATUSES  = ['Total Loss', 'Needs Cleaning', 'Ready to Go', 'Storage Only'];
const ROWS            = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const COLUMNS         = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export interface VaultFormData {
  client_name: string;
  job_type: string;
  contents_type: string;
  room_location: string[];
  vault_status: string[];
  packer: string;
  status: string;
  comments: string;
  photos: string[];
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

export default function VaultForm({
  value, onChange, mode, positionLabel, error, saving, submitLabel, onSubmit, onPhotos, onRemovePhoto,
}: Props) {
  const set = (patch: Partial<VaultFormData>) => onChange({ ...value, ...patch });

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

      {/* Vault Status */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Vault Status {mode === 'add' ? '(multi)' : ''}</label>
        <div className="flex flex-wrap gap-2">
          {VAULT_STATUSES.map(s => (
            <button type="button" key={s} onClick={() => set({ vault_status: toggle(value.vault_status, s) })} className={chip(value.vault_status.includes(s))}>{s}</button>
          ))}
        </div>
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
      </div>

      {/* Status */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Status</label>
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
          <div className="grid grid-cols-3 gap-2 mb-2">
            {value.photos.map((src, idx) => (
              <div key={idx} className="relative group">
                <img src={src} alt="" className="w-full h-20 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => onRemovePhoto(idx)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {value.photos.length < 6 && (
          <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <CameraIcon className="w-5 h-5 text-gray-300 mb-1" />
            <span className="text-xs text-gray-400">Click to add photos</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => onPhotos(e.target.files)} />
          </label>
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
