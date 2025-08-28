// apps/web/src/__tests__/app-guardrails.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import App from '../App'

vi.mock('../lib/api', () => ({
  isUsingMock: () => true,
  setMockMode: () => {},
  apiHealth: async () => ({ ok: true, model: 'mock' }),
  analyzeOrMock: async () => ({
    tables: [],
    erd_mermaid: 'erDiagram',
    crud_matrix: [],
    processes: [],
    doc_links: [],
  }),
}))

describe('Guardrails: layout blocks & header', () => {
  it('헤더 텍스트와 API 라벨이 존재한다', async () => {
    render(<App />)
    expect(screen.getByText(/As-Is Navigator \(Prototype\)/i)).toBeInTheDocument()
    expect(await screen.findByText(/API:\s*mock mode/i)).toBeInTheDocument()
  })

  it('4개 블록의 루트 영역(id)들이 존재한다', () => {
    render(<App />)
    expect(document.querySelector('#block-upload')).toBeTruthy()
    expect(document.querySelector('#block-run')).toBeTruthy()
    expect(document.querySelector('#block-results')).toBeTruthy()
    expect(document.querySelector('#block-report')).toBeTruthy()
  })

  it('탭 컨테이너가 존재한다', () => {
    render(<App />)
    expect(document.querySelector('#results-tabs')).toBeTruthy()
  })
})