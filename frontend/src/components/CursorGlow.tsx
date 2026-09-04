import { useEffect, useRef, useState } from 'react'

export default function CursorGlow() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [hovering, setHovering] = useState(false)

  useEffect(() => {
    // hide on mobile / touch
    if (window.matchMedia('(pointer: coarse)').matches) return

    let mouseX = 0, mouseY = 0
    let ringX = 0, ringY = 0
    let raf = 0

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mouseX}px, ${mouseY}px)`
      }
      if (!visible) setVisible(true)
    }

    const onEnterInteractive = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('a, button, [role="button"], input, select, textarea, label')) {
        setHovering(true)
      }
    }

    const onLeaveInteractive = (e: MouseEvent) => {
      const target = e.relatedTarget as HTMLElement | null
      if (!target?.closest?.('a, button, [role="button"], input, select, textarea, label')) {
        setHovering(false)
      }
    }

    const onLeave = () => setVisible(false)
    const onEnter = () => setVisible(true)

    const tick = () => {
      ringX += (mouseX - ringX) * 0.15
      ringY += (mouseY - ringY) * 0.15
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ringX}px, ${ringY}px)`
      }
      raf = requestAnimationFrame(tick)
    }

    document.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseover', onEnterInteractive, { passive: true })
    document.addEventListener('mouseout', onLeaveInteractive, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseenter', onEnter)
    raf = requestAnimationFrame(tick)

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onEnterInteractive)
      document.removeEventListener('mouseout', onLeaveInteractive)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('mouseenter', onEnter)
      cancelAnimationFrame(raf)
    }
  }, [visible])

  return (
    <>
      {/* Small dot — follows cursor instantly */}
      <div
        ref={dotRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999] -translate-x-1/2 -translate-y-1/2"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      >
        <div
          className="rounded-full bg-white mix-blend-difference"
          style={{
            width: hovering ? 6 : 8,
            height: hovering ? 6 : 8,
            transition: 'width 0.3s ease, height 0.3s ease',
          }}
        />
      </div>

      {/* Trailing ring — follows with delay */}
      <div
        ref={ringRef}
        className="pointer-events-none fixed top-0 left-0 z-[9998] -translate-x-1/2 -translate-y-1/2"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease, width 0.3s ease, height 0.3s ease, border-color 0.3s ease',
        }}
      >
        <div
          className="rounded-full border mix-blend-difference"
          style={{
            width: hovering ? 40 : 32,
            height: hovering ? 40 : 32,
            borderColor: hovering ? 'rgba(139, 92, 246, 0.8)' : 'rgba(255, 255, 255, 0.25)',
            boxShadow: hovering ? '0 0 20px rgba(139, 92, 246, 0.3)' : 'none',
          }}
        />
      </div>

      {/* Global style to hide default cursor */}
      <style>{`
        @media (pointer: fine) {
          *, *::before, *::after {
            cursor: none !important;
          }
        }
      `}</style>
    </>
  )
}
