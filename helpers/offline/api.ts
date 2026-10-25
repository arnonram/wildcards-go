import type {
  ConflictBody,
  PullResponse,
  PutCharacterBody,
  PutCharacterOk,
  ServerCharacter,
} from '../../dtos/sync';

const REQUEST_TIMEOUT = 12_000;

/** A non-2xx response. Network failures and timeouts reject with other errors. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    return await fetch(path, { cache: 'no-store', ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fail(response: Response, what: string): Promise<never> {
  const body = await response.json().catch(() => null);
  const detail = (body as { message?: string } | null)?.message;
  throw new ApiError(
    `Failed to ${what} (${response.status}${detail ? `: ${detail}` : ''})`,
    response.status,
    body,
  );
}

export async function putCharacterRemote(
  id: string,
  body: PutCharacterBody,
): Promise<{ ok: PutCharacterOk } | { conflict: ServerCharacter | null }> {
  const response = await request(`/api/characters/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (response.status === 409) {
    return { conflict: ((await response.json()) as ConflictBody).server };
  }
  if (!response.ok) return fail(response, 'save character');
  return { ok: (await response.json()) as PutCharacterOk };
}

export async function pullRemote(since: number): Promise<PullResponse> {
  const response = await request(`/api/characters?since=${since}`);
  if (!response.ok) return fail(response, 'load characters');
  return (await response.json()) as PullResponse;
}

export async function putPortraitRemote(id: string, rev: string, blob: Blob): Promise<void> {
  const response = await request(
    `/api/characters/${encodeURIComponent(id)}/portrait?rev=${encodeURIComponent(rev)}`,
    { method: 'PUT', headers: { 'Content-Type': blob.type || 'image/webp' }, body: blob },
  );
  if (!response.ok) return fail(response, 'save portrait');
}

export async function getPortraitRemote(id: string): Promise<{ rev: string; blob: Blob } | null> {
  const response = await request(`/api/characters/${encodeURIComponent(id)}/portrait`);
  if (response.status === 404) return null;
  if (!response.ok) return fail(response, 'load portrait');
  return { rev: response.headers.get('X-Portrait-Rev') ?? '', blob: await response.blob() };
}
