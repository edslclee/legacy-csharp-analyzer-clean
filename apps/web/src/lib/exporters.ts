// apps/web/src/lib/exporters.ts

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  TextRun,
} from 'docx';

/** ----- Types (App과 동일한 스키마) ----- */
export type AnalysisResult = {
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      type?: string;
      pk?: boolean;
      fk?: { table: string; column: string };
      nullable?: boolean;
    }>;
  }>;
  erd_mermaid: string;
  crud_matrix: Array<{
    process: string;
    table: string;
    ops: Array<'C' | 'R' | 'U' | 'D'>;
  }>;
  processes: Array<{
    name: string;
    description?: string;
    children?: string[];
  }>;
  doc_links: Array<{
    doc: string;
    snippet: string;
    related: string;
  }>;
};

/** ---------------- CSV helpers (재사용 가능) ---------------- */
export function toCsvLine(cols: (string | number | boolean)[]) {
  return cols
    .map((v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(',');
}

export function buildTablesCsv(r: AnalysisResult) {
  const header = toCsvLine(['Table', 'Column', 'Type', 'PK', 'Nullable', 'FK']);
  const lines =
    r.tables?.flatMap((t) =>
      (t.columns ?? []).map((c) =>
        toCsvLine([
          t.name,
          c.name,
          c.type ?? '',
          c.pk ? 'Y' : '',
          c.nullable === false ? 'N' : 'Y',
          c.fk ? `${c.fk.table}:${c.fk.column}` : '',
        ]),
      ),
    ) ?? [];
  return [header, ...lines].join('\n');
}

export function buildCrudCsv(r: AnalysisResult) {
  const header = toCsvLine(['Process', 'Table', 'Ops']);
  const lines =
    r.crud_matrix?.map((row) =>
      toCsvLine([row.process, row.table, (row.ops ?? []).join('')]),
    ) ?? [];
  return [header, ...lines].join('\n');
}

export function buildProcessesCsv(r: AnalysisResult) {
  const header = toCsvLine(['Name', 'Description', 'Children']);
  const lines =
    r.processes?.map((p) =>
      toCsvLine([p.name, p.description ?? '', (p.children ?? []).join(' | ')]),
    ) ?? [];
  return [header, ...lines].join('\n');
}

export function buildDocsCsv(r: AnalysisResult) {
  const header = toCsvLine(['Doc', 'Snippet', 'Related']);
  const lines =
    r.doc_links?.map((d) => toCsvLine([d.doc, d.snippet, d.related])) ?? [];
  return [header, ...lines].join('\n');
}

/** ---------------- 공통 유틸 ---------------- */
function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',');
  const mimeMatch = /data:([^;]+);base64/.exec(meta || '');
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bin = atob(base64 || '');
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** ---------------- JSON 다운로드 ---------------- */
export function downloadJSON(result: AnalysisResult, filename = 'result.json') {
  const blob = new Blob([JSON.stringify(result, null, 2)], {
    type: 'application/json',
  });
  saveAs(blob, filename);
}

/** ---------------- CSV Zip ---------------- */
export async function exportCsvZip(
  result: AnalysisResult,
  filename = 'analysis-csv.zip',
) {
  const zip = new JSZip();
  zip.file('tables.csv', buildTablesCsv(result));
  zip.file('crud.csv', buildCrudCsv(result));
  zip.file('processes.csv', buildProcessesCsv(result));
  zip.file('docs.csv', buildDocsCsv(result));
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, filename);
}

/** ---------------- PDF (Blob 생성) ---------------- */
export async function createPdfBlob(
  result: AnalysisResult,
  opts?: { erdPngDataUrl?: string },
): Promise<Blob> {
  const { erdPngDataUrl } = opts || {};
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  let y = margin;

  const line = (text: string, step = 16) => {
    doc.text(text, margin, y);
    y += step;
  };
  const h = (text: string) => {
    doc.setFont(undefined, 'bold');
    line(text, 20);
    doc.setFont(undefined, 'normal');
  };

  h('As-Is Navigator Report');
  line(new Date().toISOString(), 18);
  y += 4;

  h('Summary');
  line(`Tables: ${result.tables?.length ?? 0}`);
  line(`CRUD Rows: ${result.crud_matrix?.length ?? 0}`);
  line(`Processes: ${result.processes?.length ?? 0}`);
  line(`Doc Links: ${result.doc_links?.length ?? 0}`);
  y += 8;

  if (erdPngDataUrl) {
    h('ERD');
    try {
      doc.addImage(erdPngDataUrl, 'PNG', margin, y, 520, 320, undefined, 'FAST');
      y += 330;
    } catch {
      // ignore
    }
  }

  h('Tables (snapshot)');
  for (const t of (result.tables ?? []).slice(0, 10)) {
    line(`• ${t.name} : ${(t.columns ?? []).length} cols`);
  }

  // jsPDF는 save()가 아닌 output('blob')으로 Blob 추출 가능
  return doc.output('blob');
}

export async function exportPdf(
  result: AnalysisResult,
  opts?: { erdPngDataUrl?: string; filename?: string },
) {
  const blob = await createPdfBlob(result, { erdPngDataUrl: opts?.erdPngDataUrl });
  saveAs(blob, opts?.filename ?? 'AsIs_Report.pdf');
}

/** ---------------- DOCX (Blob 생성) ---------------- */
export async function createDocxBlob(
  result: AnalysisResult,
): Promise<Blob> {
  const sections: Paragraph[] = [];

  sections.push(
    new Paragraph({
      text: 'As-Is Navigator Report',
      heading: HeadingLevel.HEADING_1,
    }),
  );
  sections.push(new Paragraph({ text: new Date().toISOString(), spacing: { after: 200 } }));

  sections.push(new Paragraph({ text: 'Summary', heading: HeadingLevel.HEADING_2 }));
  sections.push(
    new Paragraph(
      `Tables: ${result.tables?.length ?? 0}, CRUD Rows: ${
        result.crud_matrix?.length ?? 0
      }, Processes: ${result.processes?.length ?? 0}, Doc Links: ${
        result.doc_links?.length ?? 0
      }`,
    ),
  );

  sections.push(new Paragraph({ text: 'Tables', heading: HeadingLevel.HEADING_2 }));

  const rows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ text: 'Table', bold: true })],
        }),
        new TableCell({
          width: { size: 70, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ text: 'Columns', bold: true })],
        }),
      ],
    }),
  ];

  for (const t of result.tables ?? []) {
    const cols =
      t.columns?.map(
        (c) =>
          `${c.name}${c.pk ? ' [PK]' : ''}${c.fk ? ` [FK→${c.fk.table}.${c.fk.column}]` : ''}`,
      ) ?? [];
    rows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(t.name)] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun(cols.join(', '))] })] }),
        ],
      }),
    );
  }

  const tablesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });

  const doc = new Document({
    sections: [{ children: [...sections, tablesTable] }],
  });

  return Packer.toBlob(doc);
}

export async function exportDocx(
  result: AnalysisResult,
  opts?: { filename?: string },
) {
  const blob = await createDocxBlob(result);
  saveAs(blob, opts?.filename ?? 'AsIs_Report.docx');
}

/** ---------------- 통합 Zip (JSON+CSV+ERD.mmd+ERD.png+PDF+DOCX) ---------------- */
export async function exportAllZip(
  result: AnalysisResult,
  opts?: {
    filename?: string;
    /** ERD Canvas 등에서 얻은 dataURL (PNG) */
    erdPngDataUrl?: string;
    includePdf?: boolean;
    includeDocx?: boolean;
    /** 파일명 커스터마이즈 */
    names?: {
      json?: string;
      tablesCsv?: string;
      crudCsv?: string;
      processesCsv?: string;
      docsCsv?: string;
      erdMmd?: string;
      erdPng?: string;
      pdf?: string;
      docx?: string;
    };
  },
) {
  const {
    filename = 'as-is-report.zip',
    erdPngDataUrl,
    includePdf = true,
    includeDocx = true,
  } = opts ?? {};

  const names = {
    json: opts?.names?.json ?? 'result.json',
    tablesCsv: opts?.names?.tablesCsv ?? 'tables.csv',
    crudCsv: opts?.names?.crudCsv ?? 'crud.csv',
    processesCsv: opts?.names?.processesCsv ?? 'processes.csv',
    docsCsv: opts?.names?.docsCsv ?? 'docs.csv',
    erdMmd: opts?.names?.erdMmd ?? 'ERD.mmd',
    erdPng: opts?.names?.erdPng ?? 'ERD.png',
    pdf: opts?.names?.pdf ?? 'AsIs_Report.pdf',
    docx: opts?.names?.docx ?? 'AsIs_Report.docx',
  };

  const zip = new JSZip();

  // JSON
  zip.file(names.json, JSON.stringify(result, null, 2));

  // CSVs
  zip.file(names.tablesCsv, buildTablesCsv(result));
  zip.file(names.crudCsv, buildCrudCsv(result));
  zip.file(names.processesCsv, buildProcessesCsv(result));
  zip.file(names.docsCsv, buildDocsCsv(result));

  // ERD (mermaid)
  zip.file(names.erdMmd, result.erd_mermaid || 'erDiagram');

  // ERD PNG (dataURL → Blob)
  if (erdPngDataUrl) {
    zip.file(names.erdPng, dataUrlToBlob(erdPngDataUrl));
  }

  // PDF / DOCX
  if (includePdf) {
    const pdfBlob = await createPdfBlob(result, { erdPngDataUrl });
    zip.file(names.pdf, pdfBlob);
  }
  if (includeDocx) {
    const docxBlob = await createDocxBlob(result);
    zip.file(names.docx, docxBlob);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, filename);
}