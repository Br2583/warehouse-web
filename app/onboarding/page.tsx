'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { pb } from '@/lib/pb';
import { useAuth } from '@/lib/auth-context';
import {
  BuildingOffice2Icon, UserCircleIcon, CameraIcon, ChevronRightIcon, ArrowPathIcon, BriefcaseIcon,
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
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #111827 100%)' }}>
      <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync name/picture once user loads
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

  // Sync company name once user loads
  useEffect(() => {
    if (user?.company_name) setCompanyName(prev => prev || user.company_name || '');
  }, [user?.company_name]);

  if (loading) return <Spinner />;
  if (!user) { router.replace('/login'); return <Spinner />; }

  const isOwner = user?.role === 'owner';
  const totalSteps = isOwner ? 2 : 1;

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return; }
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
    setError('');
  };

  const saveProfile = async () => {
    if (!displayName.trim()) { setError('Please enter your name'); return; }
    if (!user?.id) { setError('Not authenticated'); return; }
    setSaving(true);
    setError('');
    try {
      const form = new FormData();
      form.append('name', displayName.trim());
      form.append('job_title', jobTitle.trim());
      if (avatarFile) form.append('avatar', avatarFile);

      // Only mark profile_complete if worker (owner needs step 2 first)
      if (!isOwner) form.append('profile_complete', 'true');

      await pb.collection('users').update(user.id, form);

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

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #111827 100%)' }}>
      <div className="w-full max-w-md">

        {/* Steps indicator */}
        {totalSteps > 1 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  i + 1 < step ? 'bg-blue-500 text-white' :
                  i + 1 === step ? 'bg-blue-600 text-white ring-2 ring-blue-400/40' :
                  'bg-white/10 text-white/40'
                }`}>
                  {i + 1}
                </div>
                {i < totalSteps - 1 && <div className={`w-8 h-0.5 ${i + 1 < step ? 'bg-blue-500' : 'bg-white/10'}`} />}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">

          {step === 1 && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <UserCircleIcon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-white font-semibold text-lg">Set up your profile</h1>
                  <p className="text-white/40 text-sm">How should teammates see you?</p>
                </div>
              </div>

              {/* Avatar */}
              <div className="flex justify-center mb-6">
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white/20 hover:border-blue-400 transition-colors group">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/10 flex items-center justify-center">
                      <UserCircleIcon className="w-8 h-8 text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <CameraIcon className="w-5 h-5 text-white" />
                  </div>
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wide">Full name *</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wide">Job title</label>
                  <div className="relative">
                    <BriefcaseIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={e => setJobTitle(e.target.value)}
                      placeholder="e.g. Warehouse Manager, Driver..."
                      className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}

              <button
                onClick={saveProfile}
                disabled={saving || !displayName.trim()}
                className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
              >
                {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : null}
                {isOwner ? 'Continue' : 'Get Started'}
                {!saving && <ChevronRightIcon className="w-4 h-4" />}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <BuildingOffice2Icon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-white font-semibold text-lg">Your company</h1>
                  <p className="text-white/40 text-sm">Tell us a bit about the business</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wide">Company name *</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Company name"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wide">Industry</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowIndustryDropdown(s => !s)}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-left text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
                    >
                      <span className={industry ? 'text-white' : 'text-white/30'}>{industry || 'Select industry...'}</span>
                      <ChevronRightIcon className={`w-4 h-4 text-white/30 transition-transform ${showIndustryDropdown ? 'rotate-90' : ''}`} />
                    </button>
                    {showIndustryDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-white/20 rounded-xl overflow-y-auto max-h-48 shadow-xl">
                        {INDUSTRIES.map(ind => (
                          <button
                            key={ind}
                            type="button"
                            onClick={() => { setIndustry(ind); setShowIndustryDropdown(false); }}
                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-blue-600 hover:text-white ${industry === ind ? 'text-blue-400' : 'text-white/70'}`}
                          >
                            {ind}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wide">Description <span className="normal-case text-white/30">(optional)</span></label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Brief description of what you do..."
                    rows={3}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-3 text-white/40 hover:text-white/70 text-sm transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={saveCompany}
                  disabled={saving || !companyName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
                >
                  {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : null}
                  Finish Setup
                </button>
              </div>
            </>
          )}

        </div>

        <p className="text-center text-white/20 text-xs mt-4">
          You can always update this later in your profile
        </p>
      </div>
    </div>
  );
}
