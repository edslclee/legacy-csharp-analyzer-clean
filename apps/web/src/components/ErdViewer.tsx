// apps/web/src/components/ErdViewer.tsx
import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

type ErdViewerProps = {
  /** Mermaid ERD 텍스트 (예: "erDiagram\n  USERS { ... }") */
  mermaid: string;
  /** Optional: 외부에서 SVG 엘리먼트를 참조해 PNG 등으로 내보내기 위해 사용 */
  svgRef?: React.RefObject<SVGSVGElement>;
  /** Optional: 추가 클래스 */
  className?: string;
  /** Optional: 렌더 결과 콜백 (성공/실패) */
  onRender?: (ok: boolean, error?: unknown) => void;
};

// mermaid 초기화는 한 번만
let initialized = false;

export function ErdViewer({ mermaid: text, svgRef, className, onRender }: ErdViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!initialized) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose', // 외부 스타일/폰트 허용(내부에서만 사용)
        theme: 'default',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, Noto Sans, sans-serif',
        // 필요 시 기타 옵션 추가
      });
      initialized = true;
    }
  }, []);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;

    // 비어 있거나 의미 없는 경우 사용자 안내
    const source = (text ?? '').trim();
    if (!source) {
      host.innerHTML = `
        <div style="padding:12px;color:#6b7280;font-size:12px;">
          ERD 데이터가 없습니다. 분석을 실행하면 ERD가 표시됩니다.
        </div>`;
      onRender?.(true);
      // 외부 PNG 내보내기에서 안전하게 처리되도록 svgRef 초기화
      if (svgRef && 'current' in svgRef) (svgRef as any).current = null;
      return;
    }

    // 렌더링
    const id = 'erd-' + Math.random().toString(36).slice(2);
    // 이전 내용 제거
    host.innerHTML = '';

    (async () => {
      try {
        const { svg } = await mermaid.render(id, source);
        host.innerHTML = svg;

        // 실제 svg 요소를 부모로 전달 (PNG 내보내기용)
        const svgEl = host.querySelector('svg') as SVGSVGElement | null;
        if (svgRef && 'current' in svgRef) {
          (svgRef as any).current = svgEl ?? null;
        }

        onRender?.(true);
      } catch (err) {
        // 오류 메시지 표시
        host.innerHTML = `
          <pre style="background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;padding:12px;border-radius:8px;white-space:pre-wrap;font-size:12px;">
Mermaid ERD 렌더링 중 오류가 발생했습니다.

${String(err)}
          </pre>
          <details style="margin-top:8px;">
            <summary style="cursor:pointer;font-size:12px;color:#374151;">원본 ERD 보기</summary>
            <pre style="margin-top:6px;background:#f3f4f6;border:1px solid #e5e7eb;color:#111827;padding:8px;border-radius:6px;white-space:pre-wrap;font-size:12px;">${escapeHtml(
              source.slice(0, 5000)
            )}${source.length > 5000 ? '\n... (truncated)' : ''}</pre>
          </details>
        `;
        // svgRef 초기화 (내보내기 방지)
        if (svgRef && 'current' in svgRef) (svgRef as any).current = null;
        onRender?.(false, err);
      }
    })();
  }, [text, svgRef, onRender]);

  return (
    <div
      ref={containerRef}
      className={['overflow-auto rounded-lg border border-gray-200 bg-white', className]
        .filter(Boolean)
        .join(' ')}
      style={{
        minHeight: 360,
        maxHeight: '60vh',
        padding: 8,
      }}
      aria-label="ERD Diagram"
    />
  );
}

/** 간단한 HTML escape */
function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}