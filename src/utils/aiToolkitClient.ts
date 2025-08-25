// aiToolkitClient.ts
export const DEFAULT_BASE_URL = 'http://localhost:8675';

export type GPUIds = string; // e.g., "0" or "0,1"

export interface CreateJobResponse {
  id: string;
  name: string;
  gpu_ids: string | null;
  job_config: string; // stored as JSON string in DB
  status?: string;
  info?: string;
}

export interface JobRow extends CreateJobResponse {}

export async function createJob(params: {
  baseUrl?: string;
  name: string;
  gpuIDs: GPUIds;
  jobConfig: any; // JSON object from template after substitution
}): Promise<CreateJobResponse> {
  const BASE_URL = params.baseUrl || DEFAULT_BASE_URL;
  const res = await fetch(`${BASE_URL}/api/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: params.name, gpu_ids: params.gpuIDs, job_config: params.jobConfig }),
  });
  if (res.status === 409) throw new Error('Job name already exists');
  if (!res.ok) throw new Error(`Create job failed (${res.status})`);
  return res.json();
}

export async function listJobs(baseUrl?: string): Promise<{ jobs: CreateJobResponse[] }> {
  const BASE_URL = baseUrl || DEFAULT_BASE_URL;
  const res = await fetch(`${BASE_URL}/api/jobs`);
  if (!res.ok) throw new Error(`List jobs failed (${res.status})`);
  return res.json();
}

export async function getJobById(id: string, baseUrl?: string): Promise<JobRow> {
  const BASE_URL = baseUrl || DEFAULT_BASE_URL;
  const res = await fetch(`${BASE_URL}/api/jobs?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Get job failed (${res.status})`);
  return res.json();
}

export async function getJobLog(id: string, baseUrl?: string): Promise<{ log: string }> {
  const BASE_URL = baseUrl || DEFAULT_BASE_URL;
  const res = await fetch(`${BASE_URL}/api/jobs/${encodeURIComponent(id)}/log`);
  if (!res.ok) throw new Error(`Get log failed (${res.status})`);
  return res.json();
}

export async function startJob(jobID: string, baseUrl?: string): Promise<CreateJobResponse> {
  const BASE_URL = baseUrl || DEFAULT_BASE_URL;
  const res = await fetch(`${BASE_URL}/api/jobs/${encodeURIComponent(jobID)}/start`);
  if (!res.ok) throw new Error(`Start job failed (${res.status})`);
  return res.json();
}

export async function upsertAndStartJob(params: {
  baseUrl?: string;
  name: string;
  gpuIDs: GPUIds;
  jobConfig: any;
}): Promise<{ id: string }> {
  const BASE_URL = params.baseUrl || DEFAULT_BASE_URL;
  try {
    const created = await createJob(params);
    await startJob(created.id, BASE_URL);
    return { id: created.id };
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      const list = await listJobs(BASE_URL);
      const existing = list.jobs.find(j => j.name === params.name);
      if (!existing) throw new Error('Existing job not found after conflict');
      const res = await fetch(`${BASE_URL}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: existing.id, name: params.name, gpu_ids: params.gpuIDs, job_config: params.jobConfig }),
      });
      if (!res.ok) throw new Error(`Update job failed (${res.status})`);
      await startJob(existing.id, BASE_URL);
      return { id: existing.id };
    }
    throw e;
  }
}

export async function upsertJob(params: {
  baseUrl?: string;
  name: string;
  gpuIDs: GPUIds;
  jobConfig: any;
}): Promise<{ id: string }> {
  const BASE_URL = params.baseUrl || DEFAULT_BASE_URL;
  try {
    const created = await createJob(params);
    return { id: created.id };
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      const list = await listJobs(BASE_URL);
      const existing = list.jobs.find(j => j.name === params.name);
      if (!existing) throw new Error('Existing job not found after conflict');
      const res = await fetch(`${BASE_URL}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: existing.id, name: params.name, gpu_ids: params.gpuIDs, job_config: params.jobConfig }),
      });
      if (!res.ok) throw new Error(`Update job failed (${res.status})`);
      return { id: existing.id };
    }
    throw e;
  }
}

// Poll job until running (or a stable error), with Windows transient launch error tolerance
export async function pollJobRunning(
  id: string,
  opts: { baseUrl?: string; timeoutSec?: number; intervalMs?: number } = {}
): Promise<JobRow> {
  const baseUrl = opts.baseUrl || DEFAULT_BASE_URL;
  const timeoutSec = opts.timeoutSec ?? 30;
  const intervalMs = opts.intervalMs ?? 1000;
  const start = Date.now();
  let last: JobRow | null = null;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = await getJobById(id, baseUrl);
    last = job;
    if (job.status === 'running') return job;
    if (job.status === 'error' && job.info && job.info.startsWith('Error launching job')) {
      // transient: keep polling
    } else if (job.status === 'error') {
      throw new Error(`Job error: ${job.info || 'unknown'}`);
    }
    if (Date.now() - start > timeoutSec * 1000) return job;
    await new Promise(r => setTimeout(r, intervalMs));
  }
}
