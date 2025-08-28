// apps/web/src/lib/exporters.ts
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { jsPDF } from 'jspdf'
import * as docx from 'docx'
import type { AnalysisResult } from '../types'

/** JSON 다운로드 */
export function downloadJson(obj: unknown, filename = 'analysis.json') {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
  saveAs(blob, filename)
}

/** CSV 한 줄 생성 (간단 이스케이프) */
function csvRow(cols: Array<string | number | boolean | null | undefined>): string {
  return cols
    .map(v => {
      const s = String(v ?? '')
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    })
    .join(',')
}

/** CSV 묶음(zip) */
export async function exportCsvZip(result: AnalysisResult, filename = 'analysis-csv.zip') {
  const zip = new JSZip()

  // tables.csv
  const tRows: string[] = ['Table,Column,Type,PK,Nullable']
  for (const t of result.tables ?? []) {
    for (const c of t.columns ?? []) {
      tRows.push(
        csvRow([t.name, c.name, c.type, c.pk ? 'Y' : '', c.nullable ? 'Y' : 'N'])
      )
    }
  }
  zip.file('tables.csv', tRows.join('\n'))

  // processes.csv
  const pRows: string[] = ['Name,Description']
  for (const p of result.processes ?? []) {
    pRows.push(csvRow([p.name, p.description ?? '']))
  }
  zip.file('processes.csv', pRows.join('\n'))

  // crud.csv
  const cRows: string[] = ['Process,Table,Operation']
  for (const r of result.crudMatrix ?? []) {
    cRows.push(csvRow([r.process, r.table, r.operation]))
  }
  zip.file('crud.csv', cRows.join('\n'))

  // docs.csv
  const dRows: string[] = ['Doc']
  for (const d of result.docs ?? []) {
    dRows.push(csvRow([d]))
  }
  zip.file('docs.csv', dRows.join('\n'))

  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, filename)
}

/** SVG → PNG 다운로드 (ERD 등 다이어그램 저장용) */
export function exportDiagramPngFromSvg(svgEl: SVGSVGElement, filename = 'diagram.png') {
  const serializer = new XMLSerializer()
  const svgStr = serializer.serializeToString(svgEl)
  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    const scale = 2
    canvas.width = img.width * scale
    canvas.height = img.height * scale
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(blob => {
        if (blob) saveAs(blob, filename)
        URL.revokeObjectURL(url)
      })
    } else {
      URL.revokeObjectURL(url)
    }
  }
  img.onerror = () => URL.revokeObjectURL(url)
  img.src = url
}

/** PDF 내보내기 (선택적으로 ERD PNG 포함) */
export async function exportPdf(
  result: AnalysisResult,
  opts?: { erdPngDataUrl?: string; filename?: string }
) {
  const { erdPngDataUrl, filename = 'analysis.pdf' } = opts || {}
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 40
  let y = margin

  const line = (text: string, step = 16) => {
    doc.text(text, margin, y)
    y += step
  }
  const h = (text: string) => {
    doc.setFont('helvetica', 'bold')
    line(text, 20)
    doc.setFont('helvetica', 'normal')
  }

  h('As-Is Navigator Report')
  line(new Date().toISOString(), 18)

  h('Summary')
  line(`Tables: ${result.tables?.length ?? 0}`)
  line(`CRUD Rows: ${result.crudMatrix?.length ?? 0}`)
  line(`Processes: ${result.processes?.length ?? 0}`)
  line(`Docs: ${result.docs?.length ?? 0}`)
  y += 10

  if (erdPngDataUrl) {
    h('ERD')
    try {
      doc.addImage(erdPngDataUrl, 'PNG', margin, y, 520, 320, undefined, 'FAST')
      y += 330
    } catch {
      /* ignore image errors */
    }
  }

  // Tables
  h('Tables')
  for (const t of result.tables ?? []) {
    line(`- ${t.name}`, 18)
    for (const c of t.columns ?? []) {
      line(
        `  • ${c.name} : ${c.type}${c.pk ? ' (PK)' : ''}${
          c.nullable === false ? ' NOT NULL' : ''
        }`
      )
    }
  }
  y += 10

  // Processes
  h('Processes')
  for (const p of result.processes ?? []) {
    line(`- ${p.name} ${p.description ? `: ${p.description}` : ''}`)
  }
  y += 10

  // CRUD
  h('CRUD Matrix')
  for (const r of result.crudMatrix ?? []) {
    line(`- ${r.process} / ${r.table} / ${r.operation}`)
  }
  y += 10

  // Docs
  h('Docs')
  for (const d of result.docs ?? []) {
    line(`- ${d}`)
  }

  doc.save(filename)
}

/** DOCX 내보내기 (선택적으로 ERD PNG 포함) */
export async function exportDocx(
  result: AnalysisResult,
  opts?: { erdPngDataUrl?: string; filename?: string }
) {
  const { erdPngDataUrl, filename = 'analysis.docx' } = opts || {}

  const children: docx.Paragraph[] = []

  const H1 = (text: string) => new docx.Paragraph({ text, heading: docx.HeadingLevel.HEADING_1 })
  const H2 = (text: string) => new docx.Paragraph({ text, heading: docx.HeadingLevel.HEADING_2 })

  children.push(H1('As-Is Navigator Report'))
  children.push(new docx.Paragraph(new Date().toISOString()))
  children.push(new docx.Paragraph(''))

  // ERD 이미지
  if (erdPngDataUrl) {
    const pngBlob = await (await fetch(erdPngDataUrl)).blob()
    const buf = new Uint8Array(await pngBlob.arrayBuffer())
    children.push(H2('ERD'))
    children.push(
      new docx.Paragraph({
        children: [new docx.ImageRun({ data: buf, transformation: { width: 520, height: 320 } })],
      })
    )
  }

  // Tables
  children.push(H2('Tables'))
  for (const t of result.tables ?? []) {
    children.push(new docx.Paragraph({ text: `• ${t.name}`, bold: true }))
    for (const c of t.columns ?? []) {
      children.push(
        new docx.Paragraph(
          `   - ${c.name} : ${c.type}${c.pk ? ' (PK)' : ''}${
            c.nullable === false ? ' NOT NULL' : ''
          }`
        )
      )
    }
  }

  // Processes
  children.push(H2('Processes'))
  for (const p of result.processes ?? []) {
    children.push(new docx.Paragraph(`• ${p.name}${p.description ? ` : ${p.description}` : ''}`))
  }

  // CRUD
  children.push(H2('CRUD Matrix'))
  for (const r of result.crudMatrix ?? []) {
    children.push(new docx.Paragraph(`• ${r.process} / ${r.table} / ${r.operation}`))
  }

  // Docs
  children.push(H2('Docs'))
  for (const d of result.docs ?? []) {
    children.push(new docx.Paragraph(`• ${d}`))
  }

  const doc = new docx.Document({
    sections: [{ children }],
  })

  const blob = await docx.Packer.toBlob(doc)
  saveAs(blob, filename)
}

/** 전체 번들 ZIP (CSV+JSON+선택적 ERD PNG+PDF+DOCX) */
export async function exportZipBundle(
  result: AnalysisResult,
  opts?: { erdPngDataUrl?: string; filename?: string }
) {
  const { erdPngDataUrl, filename = 'analysis-bundle.zip' } = opts || {}
  const zip = new JSZip()

  // JSON
  zip.file('analysis.json', JSON.stringify(result, null, 2))

  // CSVs
  {
    const tRows: string[] = ['Table,Column,Type,PK,Nullable']
    for (const t of result.tables ?? []) {
      for (const c of t.columns ?? []) {
        tRows.push(csvRow([t.name, c.name, c.type, c.pk ? 'Y' : '', c.nullable ? 'Y' : 'N']))
      }
    }
    zip.file('tables.csv', tRows.join('\n'))

    const pRows: string[] = ['Name,Description']
    for (const p of result.processes ?? []) {
      pRows.push(csvRow([p.name, p.description ?? '']))
    }
    zip.file('processes.csv', pRows.join('\n'))

    const cRows: string[] = ['Process,Table,Operation']
    for (const r of result.crudMatrix ?? []) {
      cRows.push(csvRow([r.process, r.table, r.operation]))
    }
    zip.file('crud.csv', cRows.join('\n'))

    const dRows: string[] = ['Doc']
    for (const d of result.docs ?? []) {
      dRows.push(csvRow([d]))
    }
    zip.file('docs.csv', dRows.join('\n'))
  }

  // ERD PNG
  if (erdPngDataUrl) {
    const blob = await (await fetch(erdPngDataUrl)).blob()
    zip.file('erd.png', blob)
  }

  // PDF & DOCX
  {
    // PDF
    const pdfDoc = new jsPDF({ unit: 'pt', format: 'a4' })
    const margin = 40
    let y = margin
    const line = (text: string, step = 16) => {
      pdfDoc.text(text, margin, y)
      y += step
    }
    const h = (text: string) => {
      pdfDoc.setFont('helvetica', 'bold')
      line(text, 20)
      pdfDoc.setFont('helvetica', 'normal')
    }
    h('As-Is Navigator Report (PDF)')
    line(new Date().toISOString(), 18)
    if (erdPngDataUrl) {
      h('ERD')
      try {
        pdfDoc.addImage(erdPngDataUrl, 'PNG', margin, y, 520, 320, undefined, 'FAST')
        y += 330
      } catch {}
    }
    h('Tables')
    for (const t of result.tables ?? []) {
      line(`- ${t.name}`, 18)
      for (const c of t.columns ?? []) {
        line(
          `  • ${c.name} : ${c.type}${c.pk ? ' (PK)' : ''}${
            c.nullable === false ? ' NOT NULL' : ''
          }`
        )
      }
    }
    const pdfBlob = pdfDoc.output('blob')
    zip.file('analysis.pdf', pdfBlob)

    // DOCX
    const children: docx.Paragraph[] = []
    const H1 = (text: string) => new docx.Paragraph({ text, heading: docx.HeadingLevel.HEADING_1 })
    const H2 = (text: string) => new docx.Paragraph({ text, heading: docx.HeadingLevel.HEADING_2 })
    children.push(H1('As-Is Navigator Report'))
    children.push(new docx.Paragraph(new Date().toISOString()))
    children.push(new docx.Paragraph(''))
    if (erdPngDataUrl) {
      const pngBlob = await (await fetch(erdPngDataUrl)).blob()
      const buf = new Uint8Array(await pngBlob.arrayBuffer())
      children.push(H2('ERD'))
      children.push(
        new docx.Paragraph({
          children: [new docx.ImageRun({ data: buf, transformation: { width: 520, height: 320 } })],
        })
      )
    }
    children.push(H2('Tables'))
    for (const t of result.tables ?? []) {
      children.push(new docx.Paragraph({ text: `• ${t.name}`, bold: true }))
      for (const c of t.columns ?? []) {
        children.push(
          new docx.Paragraph(
            `   - ${c.name} : ${c.type}${c.pk ? ' (PK)' : ''}${
              c.nullable === false ? ' NOT NULL' : ''
            }`
          )
        )
      }
    }
    const doc = new docx.Document({ sections: [{ children }] })
    const docBlob = await docx.Packer.toBlob(doc)
    zip.file('analysis.docx', docBlob)
  }

  const out = await zip.generateAsync({ type: 'blob' })
  saveAs(out, filename)
}