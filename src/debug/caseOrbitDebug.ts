/** Live params for CaseOrbit — tweaked by CaseOrbitDebugPanel. */

export type CaseOrbitParams = {
  /** rad/sec */
  speed: number
  /** ellipse radii, px */
  rx: number
  ry: number
  rz: number
  /** world center offset, px */
  offsetX: number
  offsetY: number
  /** CSS perspective, px */
  perspective: number
  /** perspective-origin Y % */
  originY: number
  /** world vertical anchor % of stage */
  worldY: number
  /** depth scale range */
  scaleMin: number
  scaleMax: number
  opacityMin: number
  opacityMax: number
  hoverBoost: number
  /** speed factor while hovering a card */
  hoverSlow: number
  /** hover lerp rate */
  hoverLerp: number
  /** starting angle offset, deg */
  phaseDeg: number
  /** orbit plane rotation, deg (positions only — cards stay upright) */
  tiltX: number
  tiltY: number
  rotZ: number
  /** angular gap between slides, deg (30 ≈ full ring for 12) */
  gapDeg: number
  /** extra yaw on each card, deg */
  cardYaw: number
  /** dim factor for non-hovered when one is hot */
  dimScale: number
  dimOpacity: number
  /** draw red ellipse guide */
  showPath: number
}

/** Locked from user tuning session */
export const caseOrbitDefaults: CaseOrbitParams = {
  speed: 0.08,
  rx: 450,
  ry: 175,
  rz: 230,
  offsetX: -26,
  offsetY: -22,
  perspective: 1600,
  originY: 42,
  worldY: 40,
  scaleMin: 0.48,
  scaleMax: 1.1,
  opacityMin: 0.32,
  opacityMax: 1,
  hoverBoost: 1.28,
  hoverSlow: 0.18,
  hoverLerp: 8,
  phaseDeg: 0,
  tiltX: 0,
  tiltY: 0,
  rotZ: -16,
  gapDeg: 29,
  cardYaw: 0,
  dimScale: 0.92,
  dimOpacity: 0.45,
  showPath: 0,
}

export const caseOrbitParams: CaseOrbitParams = { ...caseOrbitDefaults }

let snapshotCache: CaseOrbitParams = { ...caseOrbitParams }

export type CaseOrbitListener = () => void
const listeners = new Set<CaseOrbitListener>()

export function resetCaseOrbitToDefaults() {
  ;(Object.keys(caseOrbitDefaults) as Array<keyof CaseOrbitParams>).forEach((key) => {
    caseOrbitParams[key] = caseOrbitDefaults[key]
  })
  snapshotCache = { ...caseOrbitParams }
  listeners.forEach((fn) => fn())
}

export function getCaseOrbitSnapshot() {
  return snapshotCache
}

export function setCaseOrbitParam<K extends keyof CaseOrbitParams>(
  key: K,
  value: CaseOrbitParams[K],
) {
  caseOrbitParams[key] = value
  snapshotCache = { ...caseOrbitParams }
  listeners.forEach((fn) => fn())
}

export function subscribeCaseOrbit(fn: CaseOrbitListener) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function dumpCaseOrbitParams() {
  return JSON.stringify(caseOrbitParams, null, 2)
}
