import { useEffect, useMemo, useRef, useState } from 'react';
import { ErdViewer } from './components/ErdViewer';
import { apiHealth, isUsingMock, setMockMode, analyzeOrMock } from './lib/api';
import {
  downloadJSON,
  exportCsvZip,
  exportPdf,
  exportDocx,
  exportZipBundle,
  exportDiagramPngFromSvg,
} from './lib/exporters';

// ---------- Types ----------
type Column = {
  name?: string;
  type?: string;
  pk?: boolean;
  nullable?: boolean;
  fk?: { table?: string; column?: string };
};

type Table = {
  name?: string;
  columns?: Column[];
};

type CrudRow =
  | { process?: string; table?: string; ops?: string[] }
  | { entity?: string; C?: boolean; R?: boolean; U?: boolean; D?: boolean };

type ProcItem = { name: string; description?: string; children?: string[] };
type DocLink = { doc: string; snippet?: string; related?: string };

export type AnalysisResult = {
  tables?: Table[];
  erd_mermaid?: string;
  crud_matrix?: CrudRow[];
  processes?: Array<string | ProcItem>;
  doc_links?: Array<string | DocLink>;
};

// ---------- Small helpers ----------
const renderScalar = (v: unknown) => {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
};

const normalizeProcess = (p: unknown): ProcItem => {
  if (typeof p === 'string') return { name: p };
  if (p && typeof p === 'object') {
    const anyP = p as any;
    return {
      name: renderScalar(anyP.name) || 'Unnamed',
      description: renderScalar(anyP.description) || undefined,
      children: Array.isArray(anyP.children)
        ? anyP.children.map((c: any) => renderScalar(c)).filter(Boolean) as string[]
        : undefined,
    };
  }
  return { name: 'Unnamed' };
};

const normalizeDoc = (d: unknown): DocLink => {
  if (typeof d === 'string') return { doc: d };
  if (d && typeof d === 'object') {
    const anyD = d as any;
    return {
      doc: renderScalar(anyD.doc) || 'Untitled',
      snippet: renderScalar(anyD.snippet) || undefined,
      related: renderScalar(anyD.related) || undefined,
    };
  }
  return { doc: 'Untitled' };
};

// ---------- UI ----------
type InputFile = { name: string; type: 'cs' | 'sql' | 'doc'; content: string };

type TabKey = 'ERD' | 'TABLES' | 'PROCESS' | 'CRUD' | 'DOCS';

export default function App() {
  // Header
  const [apiLabel, setApiLabel] = useState<string>('checking...');
  // Upload state
  const [codeFiles, setCodeFiles] = useState<InputFile[]>([]);
  const [docFiles, setDocFiles] = useState<InputFile[]>([]);
  // Analyze
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  // Tabs
  const [activeTab, setActiveTab] = useState<TabKey>('ERD');

  // --- API Label / mock toggle detection ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isUsingMock()) {
          if (!cancelled) setApiLabel('mock mode');
        } else {
          const h = await apiHealth();
          if (!cancelled) setApiLabel(h?.model ? `online (${h.model})` : 'online');
        }
      } catch {
        if (!cancelled) setApiLabel('offline');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // --- Computed flags ---
  const fileCount = codeFiles.length + docFiles.length;
  const canAnalyze = useMemo(() => {
    // mock 모드에서는 파일 없이도 OK
    return isUsingMock() ? true : fileCount > 0;
  }, [fileCount]);

  const canExport = !!result;

  // --- Handlers: Upload ---
  const onUploadCode = async (files: FileList | null) => {
    if (!files) return;
    const out: InputFile[] = [];
    for (const f of Array.from(files)) {
      if (f.name.toLowerCase().endsWith('.zip')) {
        // (옵션) ZIP 파싱은 후속. 지금은 무시/경고만
        console.warn('ZIP ingestion not implemented yet (prototype)');
        continue;
      }
      const lower = f.name.toLowerCase();
      if (!lower.endsWith('.cs') && !lower.endsWith('.sql')) continue;
      const text = await f.text();
      out.push({
        name: f.name,
        type: lower.endsWith('.cs') ? 'cs' : 'sql',
        content: text,
      });
    }
    setCodeFiles(prev => [...prev, ...out]);
  };

  const onUploadDoc = async (files: FileList | null) => {
    if (!files) return;
    const out: InputFile[] = [];
    for (const f of Array.from(files)) {
      const lower = f.name.toLowerCase();
      if (!lower.endsWith('.txt')) continue; // 프로토타입: txt 우선
      const text = await f.text();
      out.push({ name: f.name, type: 'doc', content: text });
    }
    setDocFiles(prev => [...prev, ...out]);
  };

  const onClearFiles = () => {
    setCodeFiles([]);
    setDocFiles([]);
  };

  // --- Analyze ---
  async function onAnalyze() {
    if (!canAnalyze) return;
    setLoading(true);
    try {
      const payloadFiles = [...codeFiles, ...docFiles];
      const data = await analyzeOrMock(payloadFiles);
      setResult(data);
      // 분석 후 탭 표시: ERD부터
      setActiveTab('ERD');
    } catch (e) {
      console.error(e);
      alert('분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  // --- Exports (per-tab) ---
  const svgRef = useRef<SVGSVGElement | null>(null);

  const onDownloadJson = () => {
    if (!result) return;
    downloadJSON(result, 'analysis.json');
  };

  const onExportCsvZip = () => {
    if (!result) return;
    exportCsvZip(result, 'analysis-csv.zip');
  };

  const onExportPdf = async () => {
    if (!result) return;
    const erdPng = await captureErdPng();
    await exportPdf(result, { erdPngDataUrl: erdPng, filename: 'analysis.pdf' });
  };

  const onExportDocx = async () => {
    if (!result) return;
    const erdPng = await captureErdPng();
    await exportDocx(result, { erdPngDataUrl: erdPng, filename: 'analysis.docx' });
  };

  const onExportZipBundle = async () => {
    if (!result) return;
    const erdPng = await captureErdPng();
    await exportZipBundle(result, { erdPngDataUrl: erdPng, filename: 'analysis-bundle.zip' });
  };

  const onExportErdPng = async () => {
    // 현재 탭이 ERD일 때만 의미 있음
    const svg = svgRef.current;
    if (svg) await exportDiagramPngFromSvg(svg, 'erd.png');
  };

  const captureErdPng = async (): Promise<string | undefined> => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    // exporters.ts에서 사용하는 내부 루틴과 동일한 로직으로 PNG dataURL을 생성
    return await (async () => {
      const xml = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      try {
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = url;
        });
        const w = svg.viewBox?.baseVal?.width || svg.width?.baseVal?.value || 800;
        const h = svg.viewBox?.baseVal?.height || svg.height?.baseVal?.value || 600;
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(w);
        canvas.height = Math.ceil(h);
        const ctx = canvas.getContext('2d');
        if (!ctx) return undefined;
        // 흰 배경
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/png');
      } finally {
        URL.revokeObjectURL(url);
      }
    })();
  };

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header (fixed) */}
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold" />
          <div className="text-base font-semibold">As-Is Navigator (Prototype)</div>
          <div className="text-sm text-gray-600">API: {apiLabel}</div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-8">
        {/* Block 1: File Upload */}
        <section className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">1) File Upload</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: code/sql */}
            <div className="space-y-2">
              <div className="text-sm text-gray-600">C#/SQL Files (*.cs, *.sql, .zip)</div>
              <input
                type="file"
                multiple
                accept=".cs,.sql,.zip"
                onChange={(e) => onUploadCode(e.target.files)}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:px-3 file:py-1 file:text-sm"
              />
              <ul className="text-xs text-gray-600 list-disc pl-5">
                {codeFiles.map((f, i) => (<li key={i}>{f.name}</li>))}
              </ul>
            </div>
            {/* Right: docs */}
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Document Files (*.txt)</div>
              <input
                type="file"
                multiple
                accept=".txt"
                onChange={(e) => onUploadDoc(e.target.files)}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:px-3 file:py-1 file:text-sm"
              />
              <ul className="text-xs text-gray-600 list-disc pl-5">
                {docFiles.map((f, i) => (<li key={i}>{f.name}</li>))}
              </ul>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
            <div>총 파일: {fileCount}개</div>
            <div className="space-x-2">
              <button className="rounded-md border px-3 py-1 text-sm" onClick={onClearFiles}>
                목록 비우기
              </button>
            </div>
          </div>
        </section>

        {/* Block 2: Analyze */}
        <section className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">2) 분석 실행</h2>
          <div className="flex items-center gap-3">
            <button
              className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
              disabled={!canAnalyze || loading}
              onClick={onAnalyze}
            >
              {loading ? '분석 중...' : '분석 실행'}
            </button>
            <span className="text-xs text-gray-600">
              ※ mock 모드에서는 파일 없이도 실행됩니다.
            </span>
          </div>
        </section>

        {/* Block 3: Results */}
        {result && (
          <section className="border rounded-lg p-4">
            <h2 className="font-semibold mb-3">3) Results</h2>

            {/* Tabs */}
            <div className="mb-4 border-b">
              <nav className="flex gap-3 text-sm">
                {(['ERD', 'TABLES', 'PROCESS', 'CRUD', 'DOCS'] as TabKey[]).map(k => (
                  <button
                    key={k}
                    className={`-mb-px border-b-2 px-3 py-2 ${activeTab === k ? 'border-gray-900 font-medium' : 'border-transparent text-gray-500'}`}
                    onClick={() => setActiveTab(k)}
                  >
                    {k}
                  </button>
                ))}
              </nav>
            </div>

            {/* Per-tab exporters */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600 mr-2">내보내기:</span>
              {/* ERD 전용 PNG 버튼 (ERD 탭일 때 활성) */}
              <button
                className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                disabled={activeTab !== 'ERD'}
                onClick={onExportErdPng}
                title="ERD PNG 다운로드"
              >
                Diagram PNG
              </button>

              <button className="rounded-md border px-3 py-2 text-sm" onClick={onDownloadJson}>JSON</button>
              <button className="rounded-md border px-3 py-2 text-sm" onClick={onExportCsvZip}>CSV (zip)</button>
              <button className="rounded-md border px-3 py-2 text-sm" onClick={onExportPdf}>PDF</button>
              <button className="rounded-md border px-3 py-2 text-sm" onClick={onExportDocx}>Word</button>
            </div>

            {/* Tab bodies */}
            {/* ERD */}
            {activeTab === 'ERD' && (
              <div className="border rounded p-3">
                <ErdViewer mermaid={result.erd_mermaid ?? ''} svgRef={svgRef} />
              </div>
            )}

            {/* TABLES */}
            {activeTab === 'TABLES' && (
              <div className="space-y-6">
                {(result.tables ?? []).map((t: any, i: number) => (
                  <div key={i}>
                    <h3 className="font-semibold mb-2">{renderScalar(t?.name) || `Table_${i + 1}`}</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-[600px] text-sm">
                        <thead className="text-left">
                          <tr>
                            <th className="py-1 pr-3">Column</th>
                            <th className="py-1 pr-3">Type</th>
                            <th className="py-1 pr-3">PK</th>
                            <th className="py-1 pr-3">Nullable</th>
                            <th className="py-1 pr-3">FK</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(t?.columns ?? []).map((c: any, j: number) => (
                            <tr key={j} className="border-t">
                              <td className="py-1 pr-3">{renderScalar(c?.name)}</td>
                              <td className="py-1 pr-3">{renderScalar(c?.type)}</td>
                              <td className="py-1 pr-3">{c?.pk ? 'Y' : ''}</td>
                              <td className="py-1 pr-3">{c?.nullable === false ? '' : 'Y'}</td>
                              <td className="py-1 pr-3">
                                {c?.fk?.table && c?.fk?.column ? `${c.fk.table}.${c.fk.column}` : ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PROCESS */}
            {activeTab === 'PROCESS' && (
              <div className="space-y-3">
                <ol className="list-decimal pl-5 space-y-2">
                  {(result.processes ?? []).map((raw, idx) => {
                    const p = normalizeProcess(raw);
                    return (
                      <li key={idx}>
                        <div className="font-medium">{p.name}</div>
                        {p.description && (
                          <div className="text-sm text-gray-600">{p.description}</div>
                        )}
                        {p.children?.length ? (
                          <ul className="list-disc pl-5 mt-1 space-y-1">
                            {p.children.map((c, i) => (
                              <li key={i} className="text-sm">{c}</li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {/* CRUD */}
            {activeTab === 'CRUD' && (
              <div className="overflow-x-auto">
                <table className="min-w-[600px] text-sm">
                  <thead className="text-left">
                    <tr>
                      <th className="py-1 pr-3">Process</th>
                      <th className="py-1 pr-3">Table</th>
                      <th className="py-1 pr-3">C</th>
                      <th className="py-1 pr-3">R</th>
                      <th className="py-1 pr-3">U</th>
                      <th className="py-1 pr-3">D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(result.crud_matrix ?? []).map((r: any, i: number) => {
                      const process = renderScalar(r?.process) || '';
                      const table = renderScalar(r?.table) || renderScalar(r?.entity) || '';
                      const ops: string[] = Array.isArray(r?.ops) ? r.ops : [];
                      const has = (ch: 'C' | 'R' | 'U' | 'D') => (r?.[ch] ? true : ops.includes(ch));
                      return (
                        <tr key={i} className="border-t">
                          <td className="py-1 pr-3">{process}</td>
                          <td className="py-1 pr-3">{table}</td>
                          <td className="py-1 pr-3">{has('C') ? 'Y' : ''}</td>
                          <td className="py-1 pr-3">{has('R') ? 'Y' : ''}</td>
                          <td className="py-1 pr-3">{has('U') ? 'Y' : ''}</td>
                          <td className="py-1 pr-3">{has('D') ? 'Y' : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* DOCS */}
            {activeTab === 'DOCS' && (
              <div className="space-y-3">
                <ul className="space-y-2">
                  {(result.doc_links ?? []).map((raw: any, idx: number) => {
                    const d = normalizeDoc(raw);
                    return (
                      <li key={idx} className="border rounded p-3">
                        <div className="font-medium">{d.doc}</div>
                        {d.snippet && <div className="text-sm text-gray-600 mt-1">{d.snippet}</div>}
                        {d.related && <div className="text-xs text-gray-500 mt-1">related: {d.related}</div>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Block 4: Final bundle */}
        {result && (
          <section className="border rounded-lg p-4">
            <h2 className="font-semibold mb-3">4) 최종 분석 보고서 (전체 번들)</h2>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-md border px-3 py-2 text-sm" onClick={onDownloadJson}>
                JSON
              </button>
              <button className="rounded-md border px-3 py-2 text-sm" onClick={onExportCsvZip}>
                CSV (zip)
              </button>
              <button className="rounded-md border px-3 py-2 text-sm" onClick={onExportPdf}>
                PDF
              </button>
              <button className="rounded-md border px-3 py-2 text-sm" onClick={onExportDocx}>
                Word
              </button>
              <button className="rounded-md border px-3 py-2 text-sm" onClick={onExportZipBundle}>
                ZIP (모두)
              </button>
            </div>
          </section>
        )}
      </main>

      <footer className="py-10 text-center text-xs text-gray-400">
        Generated by As-Is Navigator
      </footer>
    </div>
  );
}