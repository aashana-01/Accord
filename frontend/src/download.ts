// Download Page: a PNG of what's on screen, or a PDF report (map picture + every conversation).
// The PDF is made of page images, so every language (Arabic, Chinese, Hindi...) prints correctly
// without bundling fonts. A tiny hand-written PDF file wraps the images.
import { toCanvas, toPng } from 'html-to-image'

const skip = (node: HTMLElement) =>
  !(node.classList && (node.classList.contains('react-flow__controls') || node.classList.contains('react-flow__attribution')))

function save(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export const fileStem = (channel: string) =>
  `accord-${channel.replace(/[^\w-]+/g, '-')}-${new Date().toLocaleDateString('en-CA')}`

export async function mapPng(node: HTMLElement): Promise<string> {
  return toPng(node, { pixelRatio: 2, filter: skip, cacheBust: true })
}

export async function downloadPng(node: HTMLElement, stem: string) {
  save(await mapPng(node), `${stem}.png`)
}

// ---------- PDF ----------
const A4 = { w: 595.28, h: 841.89 } // points

/** Where a page may break without cutting through a line of text (y in CSS px from the report top). */
function breakPoints(root: HTMLElement): number[] {
  const top = root.getBoundingClientRect().top
  const ys = [...root.querySelectorAll('article, section, li, h2, h3, h4, p, img, dl, [data-break]')].map(
    (el) => el.getBoundingClientRect().bottom - top,
  )
  return [...new Set(ys.map((y) => Math.ceil(y)))].sort((a, b) => a - b)
}

export async function downloadPdf(root: HTMLElement, stem: string) {
  const scale = 2
  const cssWidth = root.offsetWidth
  const breaks = breakPoints(root)
  // the report is rendered off-screen; put it back at 0,0 inside the picture
  const canvas = await toCanvas(root, {
    pixelRatio: scale,
    backgroundColor: '#ffffff',
    cacheBust: true,
    width: cssWidth,
    height: root.scrollHeight,
    style: { position: 'static', left: '0', top: '0', margin: '0' },
  })
  const pageCss = (cssWidth * A4.h) / A4.w // page height in CSS px
  const total = canvas.height / scale

  // slice into pages, breaking between blocks when possible
  const pages: string[] = []
  let y = 0
  while (y < total - 1) {
    let end = Math.min(y + pageCss, total)
    if (end < total) {
      const good = breaks.filter((b) => b > y + pageCss * 0.5 && b <= end)
      if (good.length) end = good[good.length - 1] + 4
    }
    const page = document.createElement('canvas')
    page.width = canvas.width
    page.height = Math.round(pageCss * scale)
    const ctx = page.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, page.width, page.height)
    ctx.drawImage(canvas, 0, y * scale, canvas.width, (end - y) * scale, 0, 0, canvas.width, (end - y) * scale)
    pages.push(page.toDataURL('image/jpeg', 0.9))
    y = end
  }
  const blob = buildPdf(pages, canvas.width, Math.round(pageCss * scale))
  const url = URL.createObjectURL(blob)
  save(url, `${stem}.pdf`)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Minimal PDF: one full-page JPEG per page. */
function buildPdf(jpegDataUrls: string[], imgW: number, imgH: number): Blob {
  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0
  const push = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === 'string' ? enc.encode(chunk) : chunk
    parts.push(bytes)
    length += bytes.length
  }
  const obj = (n: number, body: () => void) => {
    offsets[n] = length
    push(`${n} 0 obj\n`)
    body()
    push('\nendobj\n')
  }

  const n = jpegDataUrls.length
  // object numbers: 1 catalog, 2 pages, then per page: page, image, content
  const pageObj = (i: number) => 3 + i * 3
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'))
  obj(2, () => push(`<< /Type /Pages /Count ${n} /Kids [${jpegDataUrls.map((_, i) => `${pageObj(i)} 0 R`).join(' ')}] >>`))
  jpegDataUrls.forEach((url, i) => {
    const p = pageObj(i)
    const bin = atob(url.split(',')[1])
    const jpg = new Uint8Array(bin.length)
    for (let k = 0; k < bin.length; k++) jpg[k] = bin.charCodeAt(k)
    const draw = `q ${A4.w} 0 0 ${A4.h} 0 0 cm /Im0 Do Q`
    obj(p, () =>
      push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /XObject << /Im0 ${p + 1} 0 R >> >> /Contents ${p + 2} 0 R >>`,
      ),
    )
    obj(p + 1, () => {
      push(
        `<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`,
      )
      push(jpg)
      push('\nendstream')
    })
    obj(p + 2, () => push(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`))
  })
  const count = 3 + n * 3
  const xref = length
  push(`xref\n0 ${count}\n0000000000 65535 f \n`)
  for (let i = 1; i < count; i++) push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}
