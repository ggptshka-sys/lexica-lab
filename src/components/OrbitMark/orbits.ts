import * as THREE from 'three'

export type RingDef = {
  /** Ellipse radii in local XY */
  rx: number
  ry: number
  /** Euler XYZ (radians) */
  rotation: [number, number, number]
  /** Tube radius for wireframe stage */
  tube: number
}

/** Intersecting elliptical orbits — SentientX-like readable loops, shared center */
export const RINGS: RingDef[] = [
  { rx: 1.58, ry: 0.62, rotation: [1.2, 0.22, 0.12], tube: 0.028 },
  { rx: 1.52, ry: 0.56, rotation: [0.28, 1.28, 0.35], tube: 0.028 },
  { rx: 1.48, ry: 0.68, rotation: [1.35, 0.85, -0.28], tube: 0.026 },
  { rx: 1.45, ry: 0.52, rotation: [0.18, 0.48, 1.15], tube: 0.026 },
  { rx: 1.62, ry: 0.48, rotation: [0.92, -0.72, 0.45], tube: 0.024 },
  { rx: 1.38, ry: 0.72, rotation: [-0.55, 0.38, 0.9], tube: 0.024 },
]

export function makeEllipsePath(rx: number, ry: number): THREE.CatmullRomCurve3 {
  const curve2 = new THREE.EllipseCurve(0, 0, rx, ry, 0, Math.PI * 2, false, 0)
  const pts2 = curve2.getPoints(96)
  const pts3 = pts2.map((p) => new THREE.Vector3(p.x, p.y, 0))
  // Closed smooth path
  return new THREE.CatmullRomCurve3(pts3, true, 'catmullrom', 0.15)
}

export function ringQuaternion(rotation: [number, number, number]): THREE.Quaternion {
  const e = new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ')
  return new THREE.Quaternion().setFromEuler(e)
}

/** Sample world-space points along a rotated elliptical ring */
export function sampleRingPoints(
  ring: RingDef,
  count: number,
  out?: Float32Array,
): Float32Array {
  const path = makeEllipsePath(ring.rx, ring.ry)
  const q = ringQuaternion(ring.rotation)
  const arr = out ?? new Float32Array(count * 3)
  const p = new THREE.Vector3()

  for (let i = 0; i < count; i++) {
    const u = i / count
    path.getPoint(u, p)
    p.applyQuaternion(q)
    arr[i * 3] = p.x
    arr[i * 3 + 1] = p.y
    arr[i * 3 + 2] = p.z
  }
  return arr
}

export function pointsPerRing(ring: RingDef, spacing = 0.085): number {
  const a = ring.rx
  const b = ring.ry
  const h = ((a - b) * (a - b)) / ((a + b) * (a + b))
  const circ = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))
  return Math.max(48, Math.round(circ / spacing))
}

/**
 * Particle Lexica mark: true circle via concentric rings + sharp slash cutout.
 * Polar sampling avoids flat/jagged cartesian edges.
 */
export function sampleLogoMark(radius = 0.36, gap = 0.032): Float32Array {
  const points: number[] = []
  const slashHalfW = radius * 0.1
  const ux = Math.cos(Math.PI / 4.2)
  const uy = Math.sin(Math.PI / 4.2)
  const nx = -uy
  const ny = ux

  const inSlash = (x: number, y: number) => {
    const along = x * ux + y * uy
    const across = x * nx + y * ny
    return Math.abs(along) <= radius * 0.78 && Math.abs(across) <= slashHalfW
  }

  // Center speck
  if (!inSlash(0, 0)) points.push(0, 0, 0.02)

  for (let r = gap; r <= radius + 1e-6; r += gap) {
    const n = Math.max(8, Math.round((2 * Math.PI * r) / gap))
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r
      if (inSlash(x, y)) continue
      points.push(x, y, 0.02)
    }
  }

  return new Float32Array(points)
}
