// apps/web/src/lib/api.ts
import type { AnalysisResult, InputFile } from '../types'
import { mockAnalyze } from './mock'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8787'

// 내부 토글 (초기값: .env VITE_USE_MOCK=true/1 이면 mock)
let MOCK_MODE =
  String(import.meta.env.VITE_USE_MOCK ?? '').toLowerCase() === 'true' ||
  String(import.meta.env.VITE_USE_MOCK ?? '') === '1'

export function isUsingMock() {
  return MOCK_MODE
}

export function setMockMode(v: boolean) {
  MOCK_MODE = !!v
}

export async function apiHealth(): Promise<{ ok: boolean; model?: string }> {
  try {
    const r = await fetch(`${API_BASE}/health`, { method: 'GET' })
    if (!r.ok) return { ok: false }
    const j = await r.json()
    return { ok: true, model: j?.model }
  } catch {
    return { ok: false }
  }
}

/** 실제 API 또는 목업 중 하나 호출 */
export async function analyzeOrMock(files: InputFile[]): Promise<AnalysisResult> {
  if (MOCK_MODE) {
    return mockAnalyze(files ?? [])
  }

  const payload = { files, maxChars: 200_000 }

  const r = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`API_ERROR ${r.status} ${text}`)
  }
  const data = (await r.json()) as AnalysisResult
  return data
}