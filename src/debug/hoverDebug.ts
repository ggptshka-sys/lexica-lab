/** Mutable live debug params — tweaked by HoverDebugPanel (lab only). */
export type LayoutPose = {
  size: number
  rotZ: number
  tiltX: number
  tiltY: number
  perspective: number
  offsetX: number
  offsetY: number
}

export type HoverDebugParams = {
  radius: number
  force: number
  softness: number
  stiffness: number
  damping: number
  maxDisplace: number
  /** Kept for LayoutPose / hero lock compatibility */
  size: number
  rotZ: number
  tiltX: number
  tiltY: number
  perspective: number
  /** Brush midpoint on #the-lab (0–1) */
  offsetX: number
  offsetY: number
  waveAmp: number
  waveSpeed: number
  waveFreq: number
  waveDrift: number
  waveSwirl: number
  scrollRange: number
  scrollSmooth: number
  explodeEnd: number
  blastForce: number
  streamEnd: number
  followRate: number
  /** Chord length as fraction of min(labW, labH) */
  brushLen: number
  /** Stroke rotation, deg */
  brushRot: number
  /** How many bend points (1–4) */
  brushBendCount: number
  brushBend1: number
  brushBend2: number
  brushBend3: number
  brushBend4: number
  /** Bend positions along chord (0–1) */
  brushPos1: number
  brushPos2: number
  brushPos3: number
  brushPos4: number
  /** Max half-width as fraction of length */
  brushMid: number
  /** Tip half-width as fraction of length */
  brushTip: number
  /** Width envelope sharpness (sin^power) */
  brushPower: number
  /** Dot spacing, px */
  brushGap: number
  /** Cut fraction from one end (0 = full length) */
  brushTrim: number
  /** 0 = trim start, 1 = trim end */
  brushTrimEnd: number
  /** Scales tip+mid together — thicker, same taper proportions */
  brushWeight: number
  /** Stream pulse (disabled for now, kept for later) */
  brushFlowSpeed: number
  brushFlowAmt: number
  brushFlowWidth: number
  brushFlowMin: number
  brushFlowSoft: number
  labGray: number
  labGuides: number
}

export const preloadLayout: LayoutPose = {
  size: 0.17,
  rotZ: 0,
  tiltX: 0,
  tiltY: 0,
  perspective: 0.0009,
  offsetX: 0.5,
  offsetY: 0.5,
}

export const heroPoseLocked: LayoutPose = {
  size: 1.78,
  rotZ: 0,
  tiltX: -62,
  tiltY: 51,
  perspective: 0.0009,
  offsetX: 0.7,
  offsetY: 0.47,
}

export const heroWaveLocked = {
  waveAmp: 1,
  waveSpeed: 1.15,
  waveFreq: 0.028,
  waveDrift: 4,
  waveSwirl: 0.45,
} as const

export const heroHoverLocked = {
  radius: 120,
  force: 2.6,
  softness: 2,
  stiffness: 0.14,
  damping: 0.82,
  maxDisplace: 56,
} as const

/** Defaults from user screenshots (brush + bends) */
export const hoverDebugDefaults: HoverDebugParams = {
  radius: 120,
  force: 2.6,
  softness: 2,
  stiffness: 0.14,
  damping: 0.82,
  maxDisplace: 56,
  size: 0.82,
  rotZ: 0,
  tiltX: 0,
  tiltY: 0,
  perspective: 0,
  offsetX: 0.4,
  offsetY: 0.44,
  waveAmp: 0,
  waveSpeed: 1.15,
  waveFreq: 0.028,
  waveDrift: 0,
  waveSwirl: 0,
  scrollRange: 1.2,
  scrollSmooth: 0.03,
  explodeEnd: 0.42,
  blastForce: 0.55,
  streamEnd: 0.75,
  followRate: 0.14,
  brushLen: 0.97,
  brushRot: 75,
  brushBendCount: 2,
  brushBend1: 0.32,
  brushBend2: -0.28,
  brushBend3: 0.2,
  brushBend4: -0.15,
  brushPos1: 0.19,
  brushPos2: 0.62,
  brushPos3: 0.78,
  brushPos4: 0.9,
  brushMid: 0.02,
  brushTip: 0.002,
  brushPower: 1.35,
  brushGap: 6.5,
  brushTrim: 0,
  brushTrimEnd: 1,
  brushWeight: 1,
  brushFlowSpeed: 0.35,
  brushFlowAmt: 0,
  brushFlowWidth: 0.18,
  brushFlowMin: 0.12,
  brushFlowSoft: 1.6,
  labGray: 0,
  labGuides: 0,
}

export const hoverDebugParams: HoverDebugParams = { ...hoverDebugDefaults }

let snapshotCache: HoverDebugParams = { ...hoverDebugParams }

/** Apply screenshot defaults into the live panel state (also used after HMR). */
export function resetHoverDebugToDefaults() {
  ;(Object.keys(hoverDebugDefaults) as Array<keyof HoverDebugParams>).forEach((key) => {
    hoverDebugParams[key] = hoverDebugDefaults[key]
  })
  snapshotCache = { ...hoverDebugParams }
  listeners.forEach((fn) => fn())
}

export type HoverDebugListener = () => void
const listeners = new Set<HoverDebugListener>()

export function getHoverDebugSnapshot() {
  return snapshotCache
}

export function setHoverDebugParam<K extends keyof HoverDebugParams>(
  key: K,
  value: HoverDebugParams[K],
) {
  hoverDebugParams[key] = value
  snapshotCache = { ...hoverDebugParams }
  listeners.forEach((fn) => fn())
}

export function subscribeHoverDebug(fn: HoverDebugListener) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function poseFromParams(p: HoverDebugParams = hoverDebugParams): LayoutPose {
  return {
    size: p.size,
    rotZ: p.rotZ,
    tiltX: p.tiltX,
    tiltY: p.tiltY,
    perspective: p.perspective,
    offsetX: p.offsetX,
    offsetY: p.offsetY,
  }
}
