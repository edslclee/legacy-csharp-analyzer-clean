// apps/web/src/lib/api.ts
// Guardrails: keep the same public surface used by App.tsx
// - isUsingMock(): boolean
// - setMockMode(v: boolean): void
// - apiHealth(): Promise<{ ok: boolean; model?: string; mode: 'mock' | 'online' }>
// - analyzeOrMock(files: File[] | InputLike[]): Promise<AnalysisResult>

export type AnalysisResult = {
  erd_mermaid?: string;
  process_mermaid?: string;
  tables?: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
      pk?: boolean;
      nullable?: boolean;
      fk?: { table: string; column: string };
    }>;
  }>;
  processes?: Array<{ name: string; description?: string; children?: string[] }>;
  crud_matrix?: Array<{ process: string; table: string; ops?: string[] }>;
  docs?: Array<{ name: string; snippet?: string; related?: string[] }>;
};

export type HealthResponse = { ok: boolean; model?: string; mode: 'mock' | 'online' };

// App 쪽에서 임시로 쓰는 입력 파일 형태 지원 (zip/cs/sql/txt 등)
export type InputLike = {
  name: string;
  type?: string; // 'cs' | 'sql' | 'doc' | mime 등
  content: string | Blob | ArrayBuffer;
};

/* ---------------- Mock Mode Toggle ---------------- */

const MOCK_KEY = 'as_is_nav__mock';

export function isUsingMock(): boolean {
  const raw = localStorage.getItem(MOCK_KEY);
  if (raw == null) return true; // 기본은 mock
  return raw === '1';
}

export function setMockMode(v: boolean) {
  localStorage.setItem(MOCK_KEY, v ? '1' : '0');
}

/* ---------------- Helpers ---------------- */

function getBaseUrl(): string {
  return import.meta.env.VITE_API_BASE?.trim() || 'http://localhost:8787';
}

async function fetchJson(input: RequestInfo, init?: RequestInit, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: ctrl.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
    }
    return res.json();
  } finally {
    clearTimeout(id);
  }
}

function toFile(value: string | Blob | ArrayBuffer, name: string, mime?: string) {
  if (value instanceof Blob) return new File([value], name, { type: mime || value.type || 'application/octet-stream' });
  if (value instanceof ArrayBuffer) return new File([value], name, { type: mime || 'application/octet-stream' });
  // string
  return new File([value], name, { type: mime || 'text/plain;charset=utf-8' });
}

/* ---------------- API: health ---------------- */

export async function apiHealth(): Promise<HealthResponse> {
  if (isUsingMock()) {
    // 동적 import 로 번들 안정성
    try {
      const { mockHealth } = await import('./mock');
      const m = await mockHealth();
      return { ok: true, model: m?.model ?? 'mock', mode: 'mock' };
    } catch {
      return { ok: true, model: 'mock', mode: 'mock' };
    }
  }

  try {
    const base = getBaseUrl();
    const data = (await fetchJson(`${base}/health`, { method: 'GET' })) as { model?: string };
    return { ok: true, model: data?.model ?? 'online', mode: 'online' };
  } catch (e) {
    return { ok: false, model: 'offline', mode: 'online' };
  }
}

/* ---------------- API: analyze ---------------- */

export async function analyzeOrMock(files: File[] | InputLike[]): Promise<AnalysisResult> {
  if (isUsingMock()) {
    const { mockAnalyze } = await import('./mock');
    return mockAnalyze();
  }

  // 실서버: FormData 업로드
  const form = new FormData();

  // files 가 File[] 이거나 InputLike[] 일 수 있음 둘 다 처리
  for (const f of files as any[]) {
    if (f instanceof File) {
      // 이름 기반으로 종류 판단 (서버는 필드명 상관없이 파일 읽도록 구현했다고 가정)
      form.append('files', f, f.name);
    } else if (f && typeof f === 'object' && 'name' in f && 'content' in f) {
      const name = String((f as InputLike).name || 'file.bin');
      const mime = guessMimeFromName(name) || (f as any).type || 'application/octet-stream';
      form.append('files', toFile((f as InputLike).content, name, mime), name);
    }
  }

  const base = getBaseUrl();
  const data = await fetchJson(`${base}/analyze`, { method: 'POST', body: form }, 120000);
  // 서버 응답을 AnalysisResult 형태로 보정
  return normalizeResult(data);
}

/* ---------------- Normalize & Utils ---------------- */

function normalizeResult(raw: any): AnalysisResult {
  const out: AnalysisResult = {
    erd_mermaid: raw?.erd_mermaid || raw?.erd || undefined,
    process_mermaid: raw?.process_mermaid || raw?.process || undefined,
    tables: Array.isArray(raw?.tables)
      ? raw.tables.map((t: any) => ({
          name: String(t?.name || ''),
          columns: Array.isArray(t?.columns)
            ? t.columns.map((c: any) => ({
                name: String(c?.name || ''),
                type: String(c?.type || ''),
                pk: !!c?.pk,
                nullable: c?.nullable !== false, // 없으면 true 로
                fk: c?.fk && c?.fk.table && c?.fk.column ? { table: String(c.fk.table), column: String(c.fk.column) } : undefined,
              }))
            : [],
        }))
      : [],
    processes: Array.isArray(raw?.processes)
      ? raw.processes.map((p: any) => ({
          name: String(p?.name || ''),
          description: p?.description ? String(p.description) : undefined,
          children: Array.isArray(p?.children) ? p.children.map((x: any) => String(x)) : undefined,
        }))
      : undefined,
    crud_matrix: Array.isArray(raw?.crud_matrix)
      ? raw.crud_matrix.map((r: any) => ({
          process: String(r?.process || ''),
          table: String(r?.table || ''),
          ops: Array.isArray(r?.ops) ? r.ops.map((x: any) => String(x)) : undefined,
        }))
      : undefined,
    docs: Array.isArray(raw?.docs)
      ? raw.docs.map((d: any) => ({
          name: String(d?.name || ''),
          snippet: d?.snippet ? String(d.snippet) : undefined,
          related: Array.isArray(d?.related) ? d.related.map((x: any) => String(x)) : undefined,
        }))
      : undefined,
  };

  return out;
}

function guessMimeFromName(name: string): string | undefined {
  const lower = name.toLowerCase();
  if (lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.cs')) return 'text/plain';
  if (lower.endsWith('.sql')) return 'text/plain';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.zip')) return 'application/zip';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return undefined;
}