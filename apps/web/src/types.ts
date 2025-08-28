// apps/web/src/types.ts

export type Column = {
  name: string;
  type?: string;
  pk?: boolean;
  nullable?: boolean;
  fk?: { table: string; column: string } | undefined;
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

export type CsvZipPayload = {
  tablesCsv: string;
  crudCsv: string;
  processesCsv: string;
  docsCsv: string;
  erdPngDataUrl?: string; // ERD 탭 렌더 후 캡처 이미지 (선택)
};