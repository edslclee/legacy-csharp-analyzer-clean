// apps/web/src/components/ErdViewer.tsx
import React, { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

export interface ErdViewerProps {
  /** Mermaid 소스 (빈 문자열 가능) */
  mermaid: string
  /** 렌더된 SVG를 외부에서 캡처하려면 전달 */
  svgRef?: React.RefObject<SVGSVGElement>
  className?: string
}

/** ERD 전용 뷰어: mermaid → SVG 렌더 */
export const ErdViewer: React.FC<ErdViewerProps> = ({ mermaid: code, svgRef, className }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' })

    const run = async () => {
      if (!containerRef.current) return
      containerRef.current.innerHTML = '' // reset

      if (!code?.trim()) {
        const p = document.createElement('p')
        p.className = 'text-sm text-gray-500'
        p.textContent = 'No ERD to display.'
        containerRef.current.appendChild(p)
        return
      }

      const id = 'erd-' + Math.random().toString(36).slice(2)
      try {
        const { svg } = await mermaid.render(id, code)
        containerRef.current.innerHTML = svg
        const svgEl = containerRef.current.querySelector('svg')
        if (svgEl && svgRef) {
          ;(svgRef as React.RefObject<SVGSVGElement>).current = svgEl as SVGSVGElement
        }
      } catch (e: any) {
        const pre = document.createElement('pre')
        pre.className = 'text-xs text-red-600 whitespace-pre-wrap'
        pre.textContent = `ERD render failed:\n${e?.message || e}`
        containerRef.current.appendChild(pre)
      }
    }

    run()
  }, [code])

  return <div ref={containerRef} className={className} />
}

export default ErdViewer