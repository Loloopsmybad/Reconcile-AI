import { animate, stagger, createTimeline } from 'animejs'

/**
 * Watermelon-inspired animation utilities built on anime.js v4.
 */

/** Hero / header intro reveal on page load. */
export function introReveal(selector: string) {
  return animate(selector, {
    opacity: [0, 1],
    translateY: [18, 0],
    filter: ['blur(6px)', 'blur(0px)'],
    duration: 900,
    stagger: 120,
    easing: 'easeOutCubic',
  })
}

/** Staggered fade-up reveal for a group of elements (result sections). */
export function fadeUpStagger(selector: string, from = 0) {
  return animate(selector, {
    opacity: [0, 1],
    translateY: [22, 0],
    duration: 600,
    delay: stagger(90, { start: from }),
    easing: 'easeOutCubic',
  })
}

/** Animate a number from 0 -> target into an element's text content. */
export function countUp(targetEl: HTMLElement, target: number, decimals = 0, prefix = '', duration = 1400) {
  const obj = { val: 0 }
  return animate(obj, {
    val: target,
    duration,
    ease: 'outExpo',
    update: () => {
      const value = decimals > 0 ? obj.val.toFixed(decimals) : Math.round(obj.val).toString()
      targetEl.textContent = prefix + Number(value).toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    },
  })
}

/** Springy pop-in for a newly rendered element (e.g. after results load). */
export function popIn(selector: string) {
  return animate(selector, {
    scale: [0.92, 1],
    opacity: [0, 1],
    duration: 500,
    ease: 'easeOutBack',
  })
}

/** Progress-bar fill animation. */
export function fillBar(el: HTMLElement, targetPercent: number, duration = 1200) {
  return animate(el, {
    width: `${targetPercent}%`,
    duration,
    ease: 'outQuad',
  })
}

/** Pulse a status dot (used with the "live" badge). */
export function pulseDot(selector: string, loop = true) {
  return animate(selector, {
    scale: [1, 1.35, 1],
    opacity: [1, 0.4, 1],
    duration: 1200,
    ease: 'easeInOutSine',
    loop,
  })
}

/** Row-by-row highlight flash when a table updates. */
export function flashRows(selector: string) {
  return animate(selector, {
    backgroundColor: ['rgba(109,92,255,0.18)', 'rgba(109,92,255,0)'],
    duration: 900,
    delay: stagger(40),
    easing: 'easeOutQuad',
  })
}

/** Full-page result intro assembled as a timeline. */
export function resultTimeline() {
  const tl = createTimeline({ defaults: { ease: 'easeOutCubic' } })
  tl.add('.result-metric', { opacity: [0, 1], translateY: [16, 0], duration: 450, delay: stagger(70) })
    .add('.result-chart', { opacity: [0, 1], translateY: [14, 0], duration: 500 }, '-=250')
    .add('.result-table', { opacity: [0, 1], translateY: [12, 0], duration: 500, delay: stagger(80) }, '-=250')
  return tl
}
