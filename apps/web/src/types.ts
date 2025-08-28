// apps/web/src/types.ts

export interface InputFile {
  name: string
  /** 'cs' | 'sql' | 'doc' (지정 외 확장자 대비해 string 허용) */
  type: 'cs' | 'sql' | 'doc' | string
  content: string
}

export interface AnalysisResult {
  /** Mermaid ERD (optional 로 두어 충돌 방지) */
  erd_mermaid?: string

  tables?: Array<{
    name: string
    columns: Array<{
      name: string
      type: string
      pk?: boolean
      nullable?: boolean
    }>
  }>

  processes?: Array<{
    name: string
    description?: string
  }>

  /** 표 렌더링 용 (행: process, 열: table, 값: operation) */
  crudMatrix?: Array<{
    process: string
    table: string
    operation: string // 'C' | 'R' | 'U' | 'D' 중 하나
  }>

  /** 관련 문서 링크/텍스트 모음 */
  docs?: string[]
}