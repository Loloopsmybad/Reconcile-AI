import { useEffect, useRef, useState } from 'react'

export default function CursorGlow() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [hovering, setHovering] = useState(false)

  useEffect(() => {
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
      ringX += (mouseX - ringX) * 0.12
      ringY += (mouseY - ringY) * 0.12
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

  // dot offset: sits on the inner edge of the ring (bottom side)
  // ring 48px default → radius 24, dot 14px → radius 7, offset = 24 - 7 = 17
  // ring 60px hover → radius 30, dot 10px → radius 5, offset = 30 - 5 = 25
  const dotOffsetY = hovering ? 25 : 17

  return (
    <>
      {/* Dot — sits on inner edge of ring */}
      <div
        ref={dotRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999] -translate-x-1/2"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.2s ease',
          marginTop: `${dotOffsetY}px`,
          transitionProperty: 'opacity, margin-top',
          transitionDuration: '0.2s, 0.3s',
          transitionTimingFunction: 'ease, ease',
        }}
      >
        <div
          className="rounded-full"
          style={{
            width: hovering ? 10 : 14,
            height: hovering ? 10 : 14,
            background: hovering
              ? 'radial-gradient(circle, #a78bfa 0%, #7c3aed 100%)'
              : 'radial-gradient(circle, #c4b5fd 0%, #8b5cf6 100%)',
            boxShadow: hovering
              ? '0 0 16px rgba(139, 92, 246, 0.6), 0 0 32px rgba(139, 92, 246, 0.3)'
              : '0 0 10px rgba(139, 92, 246, 0.4)',
            transition: 'width 0.3s ease, height 0.3s ease, background 0.3s ease, box-shadow 0.3s ease',
          }}
        />
      </div>

      {/* Ring — larger, follows with delay + inner fill */}
      <div
        ref={ringRef}
        className="pointer-events-none fixed top-0 left-0 z-[9998] -translate-x-1/2 -translate-y-1/2"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease, width 0.3s ease, height 0.3s ease',
        }}
      >
        <div
          className="rounded-full"
          style={{
            width: hovering ? 60 : 48,
            height: hovering ? 60 : 48,
            border: `1.5px solid ${hovering ? 'rgba(139, 92, 246, 0.7)' : 'rgba(196, 181, 253, 0.3)'}`,
            background: hovering
              ? 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.04) 70%, transparent 100%)'
              : 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, rgba(139, 92, 246, 0.02) 70%, transparent 100%)',
            boxShadow: hovering
              ? '0 0 24px rgba(139, 92, 246, 0.25), inset 0 0 12px rgba(139, 92, 246, 0.1)'
              : '0 0 8px rgba(139, 92, 246, 0.08)',
            transition: 'width 0.3s ease, height 0.3s ease, border-color 0.3s ease, background 0.3s ease, box-shadow 0.3s ease',
          }}
        />
      </div>

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
