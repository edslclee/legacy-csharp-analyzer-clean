import { useEffect, useId, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'loose',
  theme: 'default',
});

type Props = {
  code?: string; // result.erd_mermaid
};

export default function ErdViewer({ code }: Props) {
  const [svg, setSvg] = useState('');
  const [err, setErr] = useState('');
  const uid = useId().replace(/[:]/g, '');

  useEffect(() => {
    const src = normalizeErd(code || '');

    mermaid
      .parse(src)
      .then(() => {
        return mermaid.render(`erd-${uid}`, src);
      })
      .then(({ svg }) => {
        setSvg(svg);
        setErr('');
      })
      .catch((e: any) => {
        const msg = e?.str || e?.message || String(e);
        setErr(msg);
      });
  }, [code, uid]);

  if (err) {
    return (
      <div className="rounded border p-3 text-sm">
        <div className="font-semibold mb-2">ERD 렌더 실패</div>
        <div className="text-red-600 mb-2">{err}</div>
        <div className="opacity-70">원본 코드</div>
        <pre className="mt-1 bg-gray-50 p-2 rounded overflow-auto text-xs whitespace-pre">
{code}
        </pre>
      </div>
    );
  }

  return (
    <div
      className="overflow-auto bg-white rounded border p-3"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/** Mermaid가 잘 파싱하도록 가벼운 보정 */
function normalizeErd(input: string) {
  let s = (input || '').trim();

  // ```mermaid fences 제거
  s = s.replace(/```mermaid/gi, '').replace(/```/g, '').trim();

  // erDiagram 접두가 없으면 붙여준다
  if (!/^erDiagram/i.test(s)) {
    s = 'erDiagram\n' + s;
  }

  return s;
}