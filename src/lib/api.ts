import type { Job } from '../data/jobs';
import type { ProfileData } from './profile';
import type { AnswerMap } from './wizard';

export const API_BASE = (import.meta.env?.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const ACCESS_KEY = 'applyease:access-token';
const REFRESH_KEY = 'applyease:refresh-token';

export function getAccessToken(): string | null { try { return localStorage.getItem(ACCESS_KEY); } catch { return null; } }
export function setTokens(access: string, refresh: string) { try { localStorage.setItem(ACCESS_KEY, access); localStorage.setItem(REFRESH_KEY, refresh); } catch {} }
export function clearTokens() { try { localStorage.removeItem(ACCESS_KEY); localStorage.removeItem(REFRESH_KEY); } catch {} }

async function refresh(): Promise<string | null> {
  try {
    const rt = localStorage.getItem(REFRESH_KEY); if (!rt) return null;
    const r = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ refresh_token: rt }) });
    if (!r.ok) { clearTokens(); return null; }
    const data = await r.json(); setTokens(data.access_token, data.refresh_token); return data.access_token;
  } catch { return null; }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers || {}); headers.set('Content-Type', 'application/json');
  const token = getAccessToken(); if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, {...init, headers});
  if (response.status === 401 && retry && await refresh()) return apiFetch<T>(path, init, false);
  const text = await response.text();
  let body: any = null; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(body?.detail || body?.message || `API request failed (${response.status})`);
  return body as T;
}

export type ApiAuthResult = { access_token:string; refresh_token:string; user:{id:number;email:string;name:string} };
export async function apiRegister(name:string,email:string,password:string){ return apiFetch<ApiAuthResult>('/auth/register',{method:'POST',body:JSON.stringify({name,email,password})}); }
export async function apiLogin(email:string,password:string){ return apiFetch<ApiAuthResult>('/auth/login',{method:'POST',body:JSON.stringify({email,password})}); }
export async function apiLogout(){ try { await apiFetch('/auth/logout',{method:'POST'}); } finally { clearTokens(); } }
export async function apiGetProfile(){ return apiFetch<ProfileData>('/profile'); }
export async function apiSaveProfile(data:ProfileData){ return apiFetch<ProfileData>('/profile',{method:'PATCH',body:JSON.stringify({data})}); }
export async function apiGetJobs(params: { query?: string; location?: string; jobType?: string } = {}) { const q = new URLSearchParams(); if (params.query) q.set('query', params.query); if (params.location) q.set('location', params.location); if (params.jobType) q.set('job_type', params.jobType); return apiFetch<Job[]>(`/jobs${q.toString() ? `?${q.toString()}` : ''}`); }
export async function apiGetJob(id:string){ return apiFetch<Job>(`/jobs/${encodeURIComponent(id)}`); }
export async function apiAnalyzeJob(id:string){ return apiFetch<{job:Job;analysis:any;status:string}>(`/jobs/${encodeURIComponent(id)}/analyze`,{method:'POST'}); }
export async function apiImportJob(text:string){ return apiFetch<{job:Job;analysis:any;status:string}>('/jobs/import',{method:'POST',body:JSON.stringify({text})}); }
export async function apiImportJobUrl(url:string){ return apiFetch<{job:Job;analysis:any;status:string}>('/jobs/import-url',{method:'POST',body:JSON.stringify({text:url})}); }
export async function apiGetJobAnalysis(id:string){ return apiFetch<{model:string;status:string;analysis:any;createdAt:string}>(`/jobs/${encodeURIComponent(id)}/analysis`); }
export async function apiGetDraft(jobId:string){ return apiFetch<{jobId:string;step:number;answers:AnswerMap;savedAt:string|null}>(`/applications/${encodeURIComponent(jobId)}/draft`); }
export async function apiSaveDraft(jobId:string,step:number,answers:AnswerMap){ return apiFetch(`/applications/${encodeURIComponent(jobId)}/draft`,{method:'PATCH',body:JSON.stringify({step,answers})}); }
export async function apiConfirm(jobId:string, confirmationMethod:'keyboard'|'voice'='keyboard'){ return apiFetch<{confirmed:boolean;confirmedAt:string;confirmationMethod:string}>(`/applications/${encodeURIComponent(jobId)}/confirm`,{method:'POST',body:JSON.stringify({acknowledge:true,confirmation_method:confirmationMethod})}); }
export async function apiSubmit(jobId:string){ return apiFetch<{jobId:string;reference:string;submittedAt:string;status:'Submitted'}>(`/applications/${encodeURIComponent(jobId)}/submit`,{method:'POST',body:JSON.stringify({})}); }
export async function apiGetSubmission(jobId:string){ return apiFetch<{jobId:string;reference:string;submittedAt:string;status:'Submitted'}>(`/applications/${encodeURIComponent(jobId)}/submission`); }
export async function apiGetApplications(){ return apiFetch<any[]>('/applications'); }
export async function apiGetDisclosure(){ return apiFetch<{enabled:boolean;sharedWithEmployer:boolean;payload:Record<string,unknown>}>('/settings/disclosure'); }
export async function apiSaveDisclosure(enabled:boolean,payload:Record<string,unknown>={},sharedWithEmployer:boolean=false){ return apiFetch('/settings/disclosure',{method:'PUT',body:JSON.stringify({enabled,payload,shared_with_employer:sharedWithEmployer})}); }
export async function apiExportAccount(){ return apiFetch<Record<string,unknown>>('/account/export'); }
export async function apiMarkExternalSubmitted(jobId:string){ return apiFetch<{ok:boolean;jobId:string;status:string}>(`/applications/${encodeURIComponent(jobId)}/external-complete`,{method:'POST'}); }

export async function apiUploadResume(jobId: string | undefined, file: File){
  const token = getAccessToken();
  const body = new FormData(); body.append('upload', file);
  const headers = new Headers(); if (token) headers.set('Authorization', `Bearer ${token}`);
  const path = jobId ? `/files/resume?job_id=${encodeURIComponent(jobId)}` : '/files/resume';
  const response = await fetch(`${API_BASE}${path}`, { method:'POST', headers, body });
  const text = await response.text(); let data:any=null; try { data=text?JSON.parse(text):null; } catch { data=text; }
  if (!response.ok) throw new Error(data?.detail || `Upload failed (${response.status})`);
  return data as {id:string;name:string;size:number;mimeType:string};
}
export async function apiDownloadFile(id:string){ const token=getAccessToken(); const headers=new Headers(); if(token) headers.set('Authorization', `Bearer ${token}`); const r=await fetch(`${API_BASE}/files/${encodeURIComponent(id)}`, {headers}); if(!r.ok) throw new Error('Could not open saved resume'); return r.blob(); }
export async function apiGetFileAccess(id:string){ return apiFetch<{token:string;expiresInSeconds:number}>(`/files/${encodeURIComponent(id)}/access`,{method:'POST'}); }
export async function apiDeleteFile(id:string){ return apiFetch<{ok:boolean}>(`/files/${encodeURIComponent(id)}`,{method:'DELETE'}); }
export async function apiDeleteAccount(){ return apiFetch<{ok:boolean}>('/account',{method:'DELETE'}); }

export async function apiGetApplicationKit(jobId:string){ return apiFetch<{job:Job;answers:AnswerMap;resumeFileId:string|null;status?:string}>(`/applications/${encodeURIComponent(jobId)}/application-kit`); }
