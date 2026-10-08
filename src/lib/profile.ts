import { getAuth } from './auth';
import { KEYS, readJSON, writeJSON } from './storage';
import { apiGetProfile, apiSaveProfile } from './api';

export type ProfileData = {
  name: string;
  email: string;
  phone: string;
  education: string;
  skills: string;
  experience: string;
  resume: string;
};

export const emptyProfile: ProfileData = {
  name: '',
  email: '',
  phone: '',
  education: '',
  skills: '',
  experience: '',
  resume: '',
};

/** Fictional persona used by the "Use demo candidate" button. */
export const demoProfile: ProfileData = {
  name: 'Asha Verma',
  email: 'asha.verma@example.com',
  phone: '+91 98765 43210',
  education: 'B.Sc. Statistics · 2025',
  skills: 'Excel · SQL · Communication · Research',
  experience: '',
  resume: 'Asha_Verma_Resume.pdf',
};

export function getProfile(): ProfileData {
  const stored = readJSON<Partial<ProfileData>>(KEYS.profile, {});
  const merged: ProfileData = { ...emptyProfile, ...stored };
  const auth = getAuth();
  // Fall back to the account name/email until the person edits their profile.
  if (!merged.name && auth) merged.name = auth.name;
  if (!merged.email && auth) merged.email = auth.email;
  return merged;
}

export function saveProfile(data: ProfileData): boolean {
  const ok = writeJSON(KEYS.profile, data);
  void apiSaveProfile(data).catch(() => undefined);
  return ok;
}

export async function hydrateProfile(): Promise<ProfileData> {
  try {
    const remote = await apiGetProfile();
    const merged = { ...emptyProfile, ...remote };
    writeJSON(KEYS.profile, merged);
    return merged;
  } catch {
    return getProfile();
  }
}

export const PROFILE_AREAS = ['personal', 'education', 'skills', 'experience', 'resume'] as const;
export type ProfileArea = (typeof PROFILE_AREAS)[number];

export function profileAreaStatus(p: ProfileData): Record<ProfileArea, boolean> {
  return {
    personal: !!p.name.trim() && !!p.email.trim(),
    education: !!p.education.trim(),
    skills: !!p.skills.trim(),
    experience: !!p.experience.trim(),
    resume: !!p.resume.trim(),
  };
}

export function profileCompletion(p: ProfileData): { ready: number; total: number; percent: number } {
  const status = profileAreaStatus(p);
  const ready = PROFILE_AREAS.filter((a) => status[a]).length;
  return { ready, total: PROFILE_AREAS.length, percent: Math.round((ready / PROFILE_AREAS.length) * 100) };
}
