import { animate, stagger } from 'animejs'

export function fadeUp(selector: string, delay = 0) {
  animate(selector, {
    opacity: [0, 1],
    translateY: [16, 0],
    duration: 600,
    delay: stagger(60, { start: delay }),
    easing: 'easeOutCubic',
  })
}

export function countUp(el: HTMLElement, target: number, duration = 1200) {
  const obj = { val: 0 }
  animate(obj, {
    val: target,
    duration,
    ease: 'outExpo',
    update: () => {
      el.textContent = obj.val.toFixed(1)
    },
  })
}

export function pulseOnResult(selector: string) {
  animate(selector, {
    scale: [0.96, 1],
    duration: 500,
    ease: 'easeOutBack',
  })
}
