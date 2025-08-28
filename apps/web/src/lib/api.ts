// apps/web/src/lib/api.ts
export type Column = {
  name: string;
  type?: string;
  pk?: boolean;
  fk?: { table: string; column: string };
  nullable?: boolean;
};

export type Table = {
  name: string;
  columns: Column[];
};

export type CrudRow = {
  process: string;
  table: string;
  ops: Array<'C' | 'R' | 'U' | 'D'>;
};

export type ProcessNode = {
  name: string;
  description?: string;
  children?: string[];
};

export type DocLink = {
  doc: string;
  snippet: string;
  related: string;
};

export type AnalysisResult = {
  tables: Table[];
  erd_mermaid: string;
  crud_matrix: CrudRow[];
  processes: ProcessNode[];
  doc_links: DocLink[];
};

// ------------ mock 연동/실제 API 토글 ------------
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8787';

let _useMock = true; // 기본: mock 사용
export function isUsingMock() {
  return _useMock;
}
export function setUseMock(v: boolean) {
  _useMock = v;
}

// mock 함수 import (이름 반드시 일치!)
import { mockAnalyze } from './mock';

// ------------ 실제 API ------------
export async function apiHealth(): Promise<{ ok: boolean; model?: string }> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, model: data?.model };
  } catch {
    return { ok: false };
  }
}

export type InputFile = { name: string; type: 'cs' | 'sql' | 'doc'; content: string };

export async function analyze(files: InputFile[]): Promise<AnalysisResult> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, maxChars: 200_000 }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`API_ERROR: ${res.status} ${err}`);
  }
  return res.json();
}

// ------------ 토글 엔트리포인트 ------------
export async function analyzeOrMock(files: InputFile[]): Promise<AnalysisResult> {
  if (isUsingMock()) {
    return mockAnalyze(files);
  }
  return analyze(files);
}