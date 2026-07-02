'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { pb } from '@/lib/pb';
import { useAuth } from '@/lib/auth-context';
import { compressImage } from '@/lib/compress-image';
import {
  BuildingOffice2Icon, UserCircleIcon, CameraIcon, ChevronRightIcon,
  ArrowPathIcon, BriefcaseIcon, ArrowLeftIcon, CheckIcon,
} from '@heroicons/react/24/outline';

const INDUSTRIES = [
  'Warehouse & Logistics',
  'Moving & Storage',
  'Fire & Water Restoration',
  'Retail & Distribution',
  'Manufacturing',
  'Construction',
  'Other',
];

function Spinner() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — profile
  const [displayName, setDisplayName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [avatarBase64, setAvatarBase64] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(prev => prev || user.name || '');
      setAvatarPreview(prev => prev || user.picture || '');
    }
  }, [user]);

  // Step 2 — company (owner only)
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);

  useEffect(() => {
    if (user?.company_name) setCompanyName(prev => prev || user.company_name || '');
  }, [user?.company_name]);

  if (loading) return <Spinner />;
  if (!user) { router.replace('/login'); return <Spinner />; }

  const isOwner = user?.role === 'owner';
  const totalSteps = isOwner ? 2 : 1;

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    setError('');
    try {
      const base64 = await compressImage(f);
      setAvatarBase64(base64);
      setAvatarPreview(base64);
    } catch (err: any) {
      setError(err?.message || 'Image too large to upload');
    }
  };

  const saveProfile = async () => {
    if (!displayName.trim()) { setError('Please enter your name'); return; }
    if (!user?.id) { setError('Not authenticated'); return; }
    setSaving(true);
    setError('');
    try {
      // Update name and job_title (small fields — direct PB call with fresh token)
      await pb.collection('users').update(user.id, {
        name:      displayName.trim(),
        job_title: jobTitle.trim(),
        ...(isOwner ? {} : { profile_complete: true }),
      });

      // Upload avatar via server-side admin route (avoids user token permission issues)
      if (avatarBase64) {
        const res = await fetch('/api/profile/avatar', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ userId: user.id, avatar_base64: avatarBase64 }),
        });
        if (!res.ok) throw new Error('Failed to upload photo — profile saved without it');
      }

      if (isOwner) {
        setStep(2);
      } else {
        await refreshUser();
        router.replace('/dashboard');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const saveCompany = async () => {
    if (!user?.company_id) { setError('No company linked'); return; }
    setSaving(true);
    setError('');
    try {
      await pb.collection('companies').update(user.company_id, {
        name:        companyName.trim() || user.company_name,
        industry:    industry,
        description: description.trim(),
      });
      await pb.collection('users').update(user.id, { profile_complete: true });
      await refreshUser();
      router.replace('/dashboard');
    } catch (e: any) {
      setError(e?.message || 'Failed to save company info');
    } finally {
      setSaving(false);
    }
  };

  /* shared input styles (same as login/signup) */
  const inputBase = 'w-full px-4 py-3 rounded-[10px] text-sm text-gray-900 placeholder-gray-300 outline-none transition-all';
  const inputStyle = { background: '#f8fafc', border: '1.5px solid #cbd5e1' };
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,.15)';
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#cbd5e1'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {/* WM Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-gray-950 rounded-[8px] flex items-center justify-center">
            <span className="text-white font-black text-[9px] italic leading-none">WM</span>
          </div>
          <span className="font-bold text-gray-900 text-sm">Warehouse Manager</span>
        </div>

        {/* Steps indicator */}
        {totalSteps > 1 && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i + 1 < step ? 'bg-blue-600 text-white' :
                  i + 1 === step ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {i + 1 < step ? <CheckIcon className="w-4 h-4" /> : i + 1}
                </div>
                {i < totalSteps - 1 && (
                  <div className={`w-10 h-0.5 rounded-full transition-colors ${i + 1 < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className="bg-white rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,.09)] border border-gray-200 p-8"
        >
          {step === 1 && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <UserCircleIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="font-extrabold text-gray-900 text-lg tracking-tight">Set up your profile</h1>
                  <p className="text-slate-400 text-sm">How should teammates see you?</p>
                </div>
              </div>

              {/* Avatar */}
              <div className="flex justify-center mb-6">
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors group">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <UserCircleIcon className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <CameraIcon className="w-5 h-5 text-white" />
                  </div>
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
              </div>

              <div className="space-y-4">
                <div className="group">
                  <label className="block text-[12px] font-semibold text-slate-500 mb-1.5 group-focus-within:text-blue-600 transition-colors">Full name *</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your full name"
                    className={inputBase}
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>

                <div className="group">
                  <label className="block text-[12px] font-semibold text-slate-500 mb-1.5 group-focus-within:text-blue-600 transition-colors">Job title</label>
                  <div className="relative">
                    <BriefcaseIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={e => setJobTitle(e.target.value)}
                      placeholder="e.g. Warehouse Manager, Driver..."
                      className={`${inputBase} pl-10`}
                      style={inputStyle}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="mt-3 text-red-500 text-sm">
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                onClick={saveProfile}
                disabled={saving || !displayName.trim()}
                className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-[10px] bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_2px_12px_rgba(59,130,246,.3)] disabled:opacity-50"
              >
                {saving
                  ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <>{isOwner ? 'Continue' : 'Get Started'} <ChevronRightIcon className="w-4 h-4" /></>}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <BuildingOffice2Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="font-extrabold text-gray-900 text-lg tracking-tight">Your company</h1>
                  <p className="text-slate-400 text-sm">Tell us a bit about the business</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="group">
                  <label className="block text-[12px] font-semibold text-slate-500 mb-1.5 group-focus-within:text-blue-600 transition-colors">Company name *</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Company name"
                    className={inputBase}
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">Industry</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowIndustryDropdown(s => !s)}
                      className="w-full text-left text-sm px-4 py-3 rounded-[10px] transition-all flex items-center justify-between"
                      style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1' }}
                    >
                      <span className={industry ? 'text-gray-900' : 'text-gray-300'}>{industry || 'Select industry...'}</span>
                      <ChevronRightIcon className={`w-4 h-4 text-gray-300 transition-transform ${showIndustryDropdown ? 'rotate-90' : ''}`} />
                    </button>
                    {showIndustryDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-2xl overflow-y-auto max-h-48 shadow-xl">
                        {INDUSTRIES.map(ind => (
                          <button
                            key={ind}
                            type="button"
                            onClick={() => { setIndustry(ind); setShowIndustryDropdown(false); }}
                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-blue-50 hover:text-blue-600 ${industry === ind ? 'text-blue-600 font-medium' : 'text-gray-600'}`}
                          >
                            {ind}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="group">
                  <label className="block text-[12px] font-semibold text-slate-500 mb-1.5 group-focus-within:text-blue-600 transition-colors">
                    Description <span className="font-normal text-slate-300">(optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Brief description of what you do..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-[10px] text-sm text-gray-900 placeholder-gray-300 outline-none transition-all resize-none"
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="mt-3 text-red-500 text-sm">
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-4 py-3 text-slate-400 hover:text-slate-600 text-sm transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={saveCompany}
                  disabled={saving || !companyName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[10px] bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_2px_12px_rgba(59,130,246,.3)] disabled:opacity-50"
                >
                  {saving
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : 'Finish Setup'}
                </button>
              </div>
            </>
          )}
        </motion.div>

        <p className="text-center text-slate-400 text-xs mt-4">
          You can always update this later in your profile
        </p>
      </div>
    </div>
  );
}
