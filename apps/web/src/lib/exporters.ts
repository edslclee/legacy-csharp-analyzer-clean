// apps/web/src/lib/exporters.ts
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import * as docx from 'docx';

/** 최소 타입 (API 타입과 호환) */
export type CrudRow = { process: string; table: string; ops: ('C'|'R'|'U'|'D')[] };
export type TableCol = { name: string; type?: string; pk?: boolean; nullable?: boolean; fk?: { table: string; column: string } };
export type TableDef = { name: string; columns: TableCol[] };
export type ProcessDef = { name: string; description?: string; children?: string[] };
export type DocLink = { doc: string; snippet: string; related: string };
export type AnalysisResult = {
  erd_mermaid: string;
  tables: TableDef[];
  crud_matrix: CrudRow[];
  processes: ProcessDef[];
  doc_links: DocLink[];
};

/* -------------------- 공통 유틸 -------------------- */

function textToBlob(text: string, mime = 'text/plain;charset=utf-8') {
  return new Blob([text], { type: mime });
}

function jsonToBlob(obj: unknown) {
  return textToBlob(JSON.stringify(obj, null, 2), 'application/json;charset=utf-8');
}

function tableToCsv(tables: TableDef[]) {
  const lines: string[] = ['Table,Column,Type,PK,Nullable,FK.Table,FK.Column'];
  for (const t of tables ?? []) {
    for (const c of t.columns ?? []) {
      lines.push([
        wrapCsv(t.name),
        wrapCsv(c.name),
        wrapCsv(c.type ?? ''),
        c.pk ? 'Y' : '',
        c.nullable === false ? 'N' : 'Y',
        wrapCsv(c.fk?.table ?? ''),
        wrapCsv(c.fk?.column ?? ''),
      ].join(','));
    }
  }
  return lines.join('\n');
}

function crudToCsv(crud: CrudRow[]) {
  const lines: string[] = ['Process,Table,Ops'];
  for (const r of crud ?? []) {
    lines.push([wrapCsv(r.process), wrapCsv(r.table), wrapCsv((r.ops ?? []).join(''))].join(','));
  }
  return lines.join('\n');
}

function processesToCsv(procs: ProcessDef[]) {
  const lines: string[] = ['Name,Description,Children'];
  for (const p of procs ?? []) {
    lines.push([wrapCsv(p.name), wrapCsv(p.description ?? ''), wrapCsv((p.children ?? []).join(' > '))].join(','));
  }
  return lines.join('\n');
}

function docsToCsv(docs: DocLink[]) {
  const lines: string[] = ['Doc,Snippet,Related'];
  for (const d of docs ?? []) {
    lines.push([wrapCsv(d.doc), wrapCsv(d.snippet), wrapCsv(d.related)].join(','));
  }
  return lines.join('\n');
}

function wrapCsv(s: string) {
  if (s == null) return '';
  const needsQuote = /[",\n]/.test(s);
  return needsQuote ? `"${s.replace(/"/g, '""')}"` : s;
}

/* -------------------- JSON -------------------- */

export function downloadJson(data: unknown, filename = 'result.json') {
  saveAs(jsonToBlob(data), filename);
}

/* downloadJSON 별칭 제공 (App.tsx 가 기존 이름을 그대로 써도 동작하게) */
export const downloadJSON = downloadJson;

/* -------------------- CSV ZIP -------------------- */

export async function exportCsvZip(result: AnalysisResult, filename = 'analysis-csv.zip') {
  const zip = new JSZip();
  zip.file('tables.csv', tableToCsv(result.tables || []));
  zip.file('crud.csv', crudToCsv(result.crud_matrix || []));
  zip.file('processes.csv', processesToCsv(result.processes || []));
  zip.file('docs.csv', docsToCsv(result.doc_links || []));
  zip.file('erd_mermaid.mmd', result.erd_mermaid ?? '');

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, filename);
}

/* exportCSVZip 별칭 제공 */
export const exportCSVZip = exportCsvZip;

/* -------------------- PDF -------------------- */

export async function exportPdf(result: AnalysisResult, opts?: { erdSvg?: SVGSVGElement | null; filename?: string }) {
  const { erdSvg = null, filename = 'AsIs_Report.pdf' } = opts || {};
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  let y = margin;

  const line = (text: string, step = 16) => { doc.text(text, margin, y); y += step; };
  const h = (text: string) => { doc.setFont(undefined, 'bold'); line(text, 20); doc.setFont(undefined, 'normal'); };

  h('As-Is Navigator Report');
  line(new Date().toISOString(), 18);

  h('Summary');
  line(`Tables: ${result.tables?.length ?? 0}`);
  line(`CRUD Rows: ${result.crud_matrix?.length ?? 0}`);
  line(`Processes: ${result.processes?.length ?? 0}`);
  line(`Doc Links: ${result.doc_links?.length ?? 0}`);
  y += 10;

  // ERD (가능하면 SVG→PNG 변환 후 삽입)
  if (erdSvg) {
    try {
      const dataUrl = await svgToPngDataUrl(erdSvg, 1040, 640);
      doc.addImage(dataUrl, 'PNG', margin, y, 520, 320, undefined, 'FAST');
      y += 330;
    } catch {
      // 무시
    }
  }

  h('Tables');
  for (const t of result.tables ?? []) {
    line(`• ${t.name}`, 18);
    for (const c of t.columns ?? []) {
      line(`  - ${c.name} ${c.type ?? ''} ${c.pk ? '(PK)' : ''} ${c.nullable === false ? 'NOT NULL' : ''}`);
      if (y > 760) { doc.addPage(); y = margin; }
    }
    y += 6;
    if (y > 760) { doc.addPage(); y = margin; }
  }

  h('CRUD Matrix');
  for (const r of result.crud_matrix ?? []) {
    line(`• ${r.process} - ${r.table} [${(r.ops ?? []).join('')}]`);
    if (y > 760) { doc.addPage(); y = margin; }
  }

  h('Processes');
  for (const p of result.processes ?? []) {
    line(`• ${p.name} ${p.description ? `- ${p.description}` : ''}`);
    if (p.children?.length) line(`  children: ${p.children.join(' > ')}`);
    if (y > 760) { doc.addPage(); y = margin; }
  }

  h('Doc Links');
  for (const d of result.doc_links ?? []) {
    line(`• ${d.doc} :: ${d.related}`);
    if (d.snippet) line(`  ${d.snippet}`);
    if (y > 760) { doc.addPage(); y = margin; }
  }

  doc.save(filename);
}

/* -------------------- DOCX -------------------- */

export async function exportDocx(result: AnalysisResult, filename = 'AsIs_Report.docx') {
  const P = docx.Paragraph;
  const T = docx.TextRun;

  const title = new P({ children: [new T({ text: 'As-Is Navigator Report', bold: true, size: 28 })] });
  const doc = new docx.Document({
    sections: [
      {
        children: [
          title,
          new P({ children: [new T({ text: new Date().toISOString(), size: 16 })] }),
          new P({ children: [new T({ text: '' })] }),

          new P({ children: [new T({ text: 'Summary', bold: true, size: 24 })] }),
          new P({ children: [new T(`Tables: ${result.tables?.length ?? 0}`)] }),
          new P({ children: [new T(`CRUD Rows: ${result.crud_matrix?.length ?? 0}`)] }),
          new P({ children: [new T(`Processes: ${result.processes?.length ?? 0}`)] }),
          new P({ children: [new T(`Doc Links: ${result.doc_links?.length ?? 0}`)] }),
          new P({ children: [new T({ text: '' })] }),

          new P({ children: [new T({ text: 'Tables', bold: true, size: 24 })] }),
          ...((result.tables ?? []).flatMap(t => [
            new P({ children: [new T({ text: `• ${t.name}`, bold: true })] }),
            ...(t.columns ?? []).map(c =>
              new P({ children: [new T(`  - ${c.name} ${c.type ?? ''} ${c.pk ? '(PK)' : ''} ${c.nullable === false ? 'NOT NULL' : ''}`)] })
            ),
          ])),

          new P({ children: [new T({ text: '' })] }),
          new P({ children: [new T({ text: 'CRUD Matrix', bold: true, size: 24 })] }),
          ...((result.crud_matrix ?? []).map(r =>
            new P({ children: [new T(`• ${r.process} - ${r.table} [${(r.ops ?? []).join('')}]`)] })
          )),

          new P({ children: [new T({ text: '' })] }),
          new P({ children: [new T({ text: 'Processes', bold: true, size: 24 })] }),
          ...((result.processes ?? []).map(p => [
            new P({ children: [new T(`• ${p.name}${p.description ? ` - ${p.description}` : ''}`)] }),
            ...(p.children?.length ? [new P({ children: [new T(`  children: ${p.children.join(' > ')}`)] })] : []),
          ]) as any).flat(),

          new P({ children: [new T({ text: '' })] }),
          new P({ children: [new T({ text: 'Doc Links', bold: true, size: 24 })] }),
          ...((result.doc_links ?? []).map(d => [
            new P({ children: [new T(`• ${d.doc} :: ${d.related}`)] }),
            ...(d.snippet ? [new P({ children: [new T(`  ${d.snippet}`)] })] : []),
          ]) as any).flat(),
        ],
      },
    ],
  });

  const blob = await docx.Packer.toBlob(doc as any);
  saveAs(blob, filename);
}

/* -------------------- SVG → PNG (ERD 다이어그램) -------------------- */

export async function exportDiagramPngFromSvg(svgEl: SVGSVGElement, filename = 'erd.png') {
  const dataUrl = await svgToPngDataUrl(svgEl, 1600, 1000);
  saveAs(dataUrlToBlob(dataUrl), filename);
}

async function svgToPngDataUrl(svgEl: SVGSVGElement, width = 1600, height = 1000) {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  const svgText = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  const img = new Image();
  // 사파리/크롬 CORS 회피
  img.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(e);
    img.src = svgUrl;
  });
  URL.revokeObjectURL(svgUrl);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL('image/png');
}

function dataUrlToBlob(dataUrl: string) {
  const [header, data] = dataUrl.split(',');
  const isBase64 = /;base64$/.test(header);
  const mime = header.split(':')[1].split(';')[0];
  const bin = isBase64 ? atob(data) : decodeURIComponent(data);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

/* -------------------- 번들 ZIP (선택) -------------------- */

export async function exportAllZip(
  result: AnalysisResult,
  opts?: { erdSvg?: SVGSVGElement | null; filename?: string }
) {
  const { erdSvg = null, filename = 'analysis-bundle.zip' } = opts || {};
  const zip = new JSZip();

  // JSON
  zip.file('result.json', JSON.stringify(result, null, 2));

  // CSVs
  zip.file('tables.csv', tableToCsv(result.tables || []));
  zip.file('crud.csv', crudToCsv(result.crud_matrix || []));
  zip.file('processes.csv', processesToCsv(result.processes || []));
  zip.file('docs.csv', docsToCsv(result.doc_links || []));

  // Mermaid
  zip.file('erd_mermaid.mmd', result.erd_mermaid ?? '');

  // ERD PNG
  if (erdSvg) {
    try {
      const dataUrl = await svgToPngDataUrl(erdSvg, 1600, 1000);
      zip.file('erd.png', dataUrl.split(',')[1]!, { base64: true });
    } catch {
      // 무시
    }
  }

  // PDF / DOCX (간단 버전 텍스트)
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  pdf.text('As-Is Navigator PDF (see app export for full version)', 40, 60);
  const pdfBlob = pdf.output('blob');
  zip.file('report.pdf', await pdfBlob.arrayBuffer());

  const doc = new docx.Document({
    sections: [{ children: [new docx.Paragraph('As-Is Navigator DOCX (see app export for full version)')] }],
  });
  const docBlob = await docx.Packer.toBlob(doc as any);
  zip.file('report.docx', await docBlob.arrayBuffer());

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, filename);
}
// 호환용 별칭 추가:
export const exportZipBundle = exportAllZip;