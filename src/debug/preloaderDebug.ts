/** Locked cipher field params (preloader + site background). */

export type PreloaderParams = {
  grid: number
  dotSize: number
  logoSize: number
  logoX: number
  logoY: number
  safePad: number
  fieldSpeed: number
  fieldScale: number
  fieldScale2: number
  fineMix: number
  warpAmt: number
  warpScale: number
  threshold: number
}

export const preloaderDefaults: PreloaderParams = {
  grid: 4.5,
  dotSize: 1.35,
  logoSize: 0.1,
  logoX: 0.5,
  logoY: 0.5,
  safePad: 1.8,
  fieldSpeed: 0.28,
  fieldScale: 5,
  fieldScale2: 6.6,
  fineMix: 0.68,
  warpAmt: 1.28,
  warpScale: 3.15,
  threshold: 0.62,
}

export const preloaderParams: PreloaderParams = { ...preloaderDefaults }

/** Logo + field resting before tunnel. */
export const PRELOADER_HOLD_MS = 2200
/** Dark circle expands to full screen. */
export const PRELOADER_TUNNEL_MS = 1000
/** Solid black beat after expand («чёрное переключение»). */
export const PRELOADER_BLACK_MS = 1000
/** Hero text / FadeIn + scramble on black (then canvas stops — no field on Hero). */
export const PRELOADER_TEXT_MS = 1100
