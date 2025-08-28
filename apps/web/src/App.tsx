import { useEffect, useMemo, useState } from 'react';
import { analyzeOrMock, apiHealth, isUsingMock, type AnalysisResult } from './lib/api';
import { downloadJSON, exportCsvZip, exportPdf, exportDocx, exportAllZip } from './lib/exporters';
import { ErdViewer } from './components';

type InputFile = { name: string; type: 'cs' | 'sql' | 'doc'; content: string };

const TABS = ['ERD', 'TABLES', 'CRUD', 'PROCESS', 'DOCS'] as const;
type TabKey = typeof TABS[number];

export default function App() {
  // 파일 상태
  const [codeFiles, setCodeFiles] = useState<InputFile[]>([]);
  const [docFiles, setDocFiles] = useState<InputFile[]>([]);
  // 결과/상태
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiLabel, setApiLabel] = useState<string>('...');

  // 탭
  const [activeTab, setActiveTab] = useState<TabKey>('DOCS');

  // API 상태 라벨링
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (isUsingMock()) {
          if (!cancelled) setApiLabel('mock mode');
        } else {
          const h = await apiHealth();
          if (!cancelled) setApiLabel(h?.model || 'online');
        }
      } catch {
        if (!cancelled) setApiLabel('offline');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 업로드 핸들러들
  const onPickCode = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    const target = await filesToInputs(files, ['.cs', '.sql', '.zip']);
    setCodeFiles(target);
    setResult(null);
  };

  const onPickDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    const target = await filesToInputs(files, ['.txt', '.md', '.pdf', '.docx']);
    setDocFiles(target);
    setResult(null);
  };

  // 분석 실행
  const canAnalyze = useMemo(() => true, []);
  const onAnalyze = async () => {
    if (!canAnalyze) return;
    setLoading(true);
    try {
      const payload = [...codeFiles, ...docFiles];
      const data = await analyzeOrMock(payload);
      setResult(data);
      // 결과가 오면 기본 탭은 DOCS로 (또는 원하는 탭)
      setActiveTab('DOCS');
    } catch (e) {
      console.error(e);
      alert('분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 다운로드
  const onDownloadJson = () => {
    if (!result) return;
    downloadJSON(result, 'result.json');
  };
  const onExportCsvZip = () => {
    if (!result) return;
    exportCsvZip(result, 'analysis-csv.zip');
  };
  const onExportPdf = () => {
    if (!result) return;
    exportPdf(result, { filename: 'AsIs_Report.pdf' });
  };
  const onExportDocx = () => {
    if (!result) return;
    exportDocx(result, { filename: 'AsIs_Report.docx' });
  };
  const onExportBundle = () => {
    if (!result) return;
    exportBundleZip(result, { filename: 'AsIs_Package.zip' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">As-Is Navigator (Prototype)</h1>
          <div className="text-sm text-gray-500">API: {apiLabel}</div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        {/* 1) 파일 추가 */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border bg-white p-5">
            <h2 className="text-lg font-semibold mb-4">1) 파일 추가</h2>

            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-2">코드/SQL 파일</div>
              <div className="flex items-center gap-3">
                <label className="inline-flex">
                  <input type="file" className="hidden" multiple onChange={onPickCode} />
                  <span className="rounded border px-3 py-2 cursor-pointer">파일 선택</span>
                </label>
                <span className="text-sm text-gray-500">
                  {codeFiles.length ? `${codeFiles.length}개 선택됨` : '선택된 파일 없음'}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-2">*.cs, *.sql, *.zip(내부 .cs/.sql) 지원</div>
            </div>

            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-2">문서 파일</div>
              <div className="flex items-center gap-3">
                <label className="inline-flex">
                  <input type="file" className="hidden" multiple onChange={onPickDoc} />
                  <span className="rounded border px-3 py-2 cursor-pointer">파일 선택</span>
                </label>
                <span className="text-sm text-gray-500">
                  {docFiles.length ? `${docFiles.length}개 선택됨` : '선택된 파일 없음'}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-2">* txt 우선, PDF/DOCX는 후속 지원 예정</div>
            </div>

            <button
              className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
              onClick={onAnalyze}
              disabled={loading}
            >
              {loading ? '분석 중...' : '분석 실행'}
            </button>

            <div className="text-xs text-gray-400 mt-4">
              ※ mock 모드에서는 파일 없이도 실행됩니다.
            </div>
          </div>

          {/* 2) 결과 & 다운로드 */}
          <div className="rounded-lg border bg-white p-5">
            <h2 className="text-lg font-semibold mb-4">2) 결과 & 다운로드</h2>

            <div className="flex items-center gap-3 mb-4">
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
                DOCX
              </button>
              <button className="rounded-md border px-3 py-2 text-sm" onClick={onExportBundle}>
                ZIP (All)
              </button>
            </div>

            {/* 하위 탭: ERD / TABLES / CRUD / PROCESS / DOCS */}
            <div className="flex gap-2 mb-3">
              {TABS.map((t) => (
                <button
                  key={t}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    activeTab === t ? 'bg-black text-white' : ''
                  }`}
                  onClick={() => setActiveTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="min-h-[280px] rounded border p-3 bg-white">
              {!result ? (
                <div className="text-sm text-gray-500">
                  아직 결과가 없습니다. 파일을 추가하고 “분석 실행”을 눌러주세요.
                </div>
              ) : (
                <>
                  {activeTab === 'ERD' && <ErdViewer code={result.erd_mermaid} />}

                  {activeTab === 'TABLES' && (
                    <TablesView data={result} />
                  )}

                  {activeTab === 'CRUD' && (
                    <CrudView data={result} />
                  )}

                  {activeTab === 'PROCESS' && (
                    <ProcessView data={result} />
                  )}

                  {activeTab === 'DOCS' && (
                    <DocsView data={result} />
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-10 text-center text-xs text-gray-400">
        Generated by As-Is Navigator
      </footer>
    </div>
  );
}

/* ------------------- 하위 뷰 (간단한 리스트 렌더링) ------------------- */

function TablesView({ data }: { data: AnalysisResult }) {
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Table</th>
            <th className="py-2">Columns</th>
          </tr>
        </thead>
        <tbody>
          {data.tables?.map((t, idx) => (
            <tr key={idx} className="border-b align-top">
              <td className="py-2 pr-4 font-medium">{t.name}</td>
              <td className="py-2">
                <ul className="list-disc pl-5">
                  {t.columns?.map((c, i) => (
                    <li key={i}>
                      {c.name}:{' '}
                      <span className="opacity-70">{c.type || 'unknown'}</span>
                      {c.pk ? ' [PK]' : ''}
                      {c.fk ? ` [FK→${c.fk.table}.${c.fk.column}]` : ''}
                      {c.nullable === false ? ' [NOT NULL]' : ''}
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CrudView({ data }: { data: AnalysisResult }) {
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Process</th>
            <th className="py-2 pr-4">Table</th>
            <th className="py-2">Ops</th>
          </tr>
        </thead>
        <tbody>
          {data.crud_matrix?.map((r, i) => (
            <tr key={i} className="border-b">
              <td className="py-2 pr-4">{r.process}</td>
              <td className="py-2 pr-4">{r.table}</td>
              <td className="py-2">{r.ops?.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProcessView({ data }: { data: AnalysisResult }) {
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Process</th>
            <th className="py-2">Description</th>
          </tr>
        </thead>
        <tbody>
          {data.processes?.map((p, i) => (
            <tr key={i} className="border-b">
              <td className="py-2 pr-4">{p.name}</td>
              <td className="py-2">{p.description || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocsView({ data }: { data: AnalysisResult }) {
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Doc</th>
            <th className="py-2 pr-4">Snippet</th>
            <th className="py-2">Related</th>
          </tr>
        </thead>
        <tbody>
          {data.doc_links?.map((d, i) => (
            <tr key={i} className="border-b">
              <td className="py-2 pr-4 font-medium">{d.doc}</td>
              <td className="py-2 pr-4">{d.snippet}</td>
              <td className="py-2">{d.related}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------- 유틸 ------------------- */

async function filesToInputs(files: File[], allowExts: string[]): Promise<InputFile[]> {
  const out: InputFile[] = [];
  for (const f of files) {
    const lower = f.name.toLowerCase();
    const ok = allowExts.some((ext) => lower.endsWith(ext));
    if (!ok) continue;
    const text = await f.text();
    out.push({
      name: f.name,
      type: lower.endsWith('.cs') ? 'cs' : lower.endsWith('.sql') ? 'sql' : 'doc',
      content: text,
    });
  }
  return out;
}