import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface LightboxImage {
  url: string
  label: string
  caption?: string
}

export function Lightbox({ images, index, onIndex, onClose }: { images: LightboxImage[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const img = images[index]

  const go = useCallback(
    (d: number) => {
      onIndex((index + d + images.length) % images.length)
      setZoom(1)
      setPan({ x: 0, y: 0 })
    },
    [index, images.length, onIndex],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(6, z * 1.25))
      if (e.key === '-') setZoom((z) => Math.max(1, z / 1.25))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose])

  const onWheel = (e: React.WheelEvent) => {
    setZoom((z) => Math.min(6, Math.max(1, z * (e.deltaY < 0 ? 1.1 : 0.9))))
  }
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    setPan({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) })
  }
  const onPointerUp = () => (drag.current = null)

  return (
    <div className="lightbox" role="dialog" aria-label={img.label}>
      <div className="top">
        <span>
          {img.label}
          {img.caption ? ` · ${img.caption}` : ''} · {index + 1}/{images.length}
        </span>
        <span style={{ display: 'flex', gap: 2 }}>
          <button className="icon-btn" onClick={() => setZoom((z) => Math.max(1, z / 1.25))} aria-label="Zoom out"><ZoomOut /></button>
          <button className="icon-btn" onClick={() => setZoom((z) => Math.min(6, z * 1.25))} aria-label="Zoom in"><ZoomIn /></button>
          {images.length > 1 && (
            <>
              <button className="icon-btn" onClick={() => go(-1)} aria-label="Previous"><ChevronLeft /></button>
              <button className="icon-btn" onClick={() => go(1)} aria-label="Next"><ChevronRight /></button>
            </>
          )}
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button>
        </span>
      </div>
      <div className="stage" onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onDoubleClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>
        <img src={img.url} alt={img.label} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} draggable={false} />
      </div>
      {images.length > 1 && (
        <div className="strip">
          {images.map((im, i) => (
            <img key={im.url} src={im.url} alt="" className={i === index ? 'on' : ''} onClick={() => { onIndex(i); setZoom(1); setPan({ x: 0, y: 0 }) }} />
          ))}
        </div>
      )}
    </div>
  )
}
