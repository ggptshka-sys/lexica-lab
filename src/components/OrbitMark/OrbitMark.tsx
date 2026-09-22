import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import {
  RINGS,
  makeEllipsePath,
  pointsPerRing,
  ringQuaternion,
  sampleLogoMark,
  sampleRingPoints,
} from './orbits'
import styles from './OrbitMark.module.css'

export type OrbitMode = 'wireframe' | 'dots'

type Props = {
  active?: boolean
  mode?: OrbitMode
  assemble?: boolean
}

const ASSEMBLE_MS = 1100
const REASSEMBLE_MS = 1000
const DOT_SIZE = 0.026
const LOGO_DOT_SIZE = 0.024
const CURSOR_RADIUS = 0.32
const CURSOR_FORCE = 0.36
const HERO_X = 0.95
const HERO_Y = -0.05
const CENTER_X = 0
const CENTER_Y = 0

function createDotTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size * 0.38, 0, Math.PI * 2)
  ctx.fill()
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function createWireRing(ring: (typeof RINGS)[number]): THREE.Object3D {
  const path = makeEllipsePath(ring.rx, ring.ry)
  const geo = new THREE.TubeGeometry(path, 160, ring.tube, 8, true)
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: 0.55,
    toneMapped: false,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.quaternion.copy(ringQuaternion(ring.rotation))
  return mesh
}

function createPoints(
  positions: Float32Array,
  tex: THREE.Texture,
  size = DOT_SIZE,
): THREE.Points {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size,
    map: tex,
    transparent: true,
    alphaTest: 0.4,
    depthWrite: false,
    sizeAttenuation: true,
    toneMapped: false,
  })
  const pts = new THREE.Points(geo, mat)
  pts.frustumCulled = false
  return pts
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

/** Theme under viewport center: light → black particles, dark → white */
function sampleThemeColor(): 'light' | 'dark' {
  const x = window.innerWidth * 0.5
  const y = window.innerHeight * 0.5
  const el = document.elementFromPoint(x, y)
  if (!el) return 'dark'
  const themed = el.closest('[data-nav-theme]') as HTMLElement | null
  return themed?.dataset.navTheme === 'light' ? 'light' : 'dark'
}

/**
 * Orbit mark: hero assemble → one explode into The Lab → reassemble center →
 * fixed until Contacts, color follows section bg.
 */
export function OrbitMark({
  active = true,
  mode = 'dots',
  assemble = false,
}: Props) {
  const hostRef = useRef<HTMLCanvasElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const canvas = hostRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40)
    camera.position.set(2.1, 1.35, 2.95)
    camera.lookAt(0.15, 0, 0)

    const root = new THREE.Group()
    root.position.set(HERO_X, HERO_Y, 0)
    scene.add(root)

    const orbits = new THREE.Group()
    root.add(orbits)
    const logoGroup = new THREE.Group()
    root.add(logoGroup)

    const disposables: THREE.Object3D[] = []
    let dotTex: THREE.Texture | null = null
    const homeChunks: Float32Array[] = []
    const startChunks: Float32Array[] = []
    const explodeChunks: Float32Array[] = []
    const liveAttrs: THREE.BufferAttribute[] = []
    const pointMats: THREE.PointsMaterial[] = []
    const parents: THREE.Object3D[] = []

    const seedScatter = (home: Float32Array) => {
      const start = new Float32Array(home.length)
      for (let i = 0; i < home.length; i += 3) {
        const ang = Math.random() * Math.PI * 2
        const elev = (Math.random() - 0.5) * Math.PI
        const dist = 2.8 + Math.random() * 3.5
        start[i] = Math.cos(ang) * Math.cos(elev) * dist
        start[i + 1] = Math.sin(elev) * dist
        start[i + 2] = Math.sin(ang) * Math.cos(elev) * dist
      }
      return start
    }

    const seedExplode = (home: Float32Array) => {
      const out = new Float32Array(home.length)
      for (let i = 0; i < home.length; i += 3) {
        const hx = home[i]!
        const hy = home[i + 1]!
        const hz = home[i + 2]!
        const len = Math.hypot(hx, hy, hz) || 1
        const burst = 0.9 + Math.random() * 2.4
        out[i] = hx + (hx / len) * burst + (Math.random() - 0.55) * 1.8
        out[i + 1] = hy + (hy / len) * burst * 0.35 - (0.4 + Math.random() * 1.2)
        out[i + 2] = hz + (hz / len) * burst + (Math.random() - 0.5) * 1.4
      }
      return out
    }

    if (mode === 'wireframe') {
      for (const ring of RINGS) {
        const mesh = createWireRing(ring)
        orbits.add(mesh)
        disposables.push(mesh)
      }
    } else {
      dotTex = createDotTexture()
      for (const ring of RINGS) {
        const count = pointsPerRing(ring, 0.09)
        const home = sampleRingPoints(ring, count)
        const start = assemble && !reduced ? seedScatter(home) : home.slice(0)
        const pts = createPoints(start.slice(0) as Float32Array, dotTex, DOT_SIZE)
        orbits.add(pts)
        disposables.push(pts)
        homeChunks.push(home)
        startChunks.push(start)
        explodeChunks.push(seedExplode(home))
        liveAttrs.push(pts.geometry.getAttribute('position') as THREE.BufferAttribute)
        pointMats.push(pts.material as THREE.PointsMaterial)
        parents.push(pts)
      }

      const logoHome = sampleLogoMark(0.36, 0.032)
      const logoStart =
        assemble && !reduced ? seedScatter(logoHome) : logoHome.slice(0)
      const logoPts = createPoints(
        logoStart.slice(0) as Float32Array,
        dotTex,
        LOGO_DOT_SIZE,
      )
      logoGroup.add(logoPts)
      disposables.push(logoPts)
      homeChunks.push(logoHome)
      startChunks.push(logoStart)
      explodeChunks.push(seedExplode(logoHome))
      liveAttrs.push(logoPts.geometry.getAttribute('position') as THREE.BufferAttribute)
      pointMats.push(logoPts.material as THREE.PointsMaterial)
      parents.push(logoPts)
    }

    const resize = () => {
      const w = parent.clientWidth || 1
      const h = parent.clientHeight || 1
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()

    const pointer = { x: 0, y: 0, active: false }
    const onPointerMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / (window.innerWidth || 1)) * 2 - 1
      pointer.y = -(e.clientY / (window.innerHeight || 1)) * 2 + 1
      pointer.active = true
    }
    const onPointerLeave = () => {
      pointer.active = false
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('blur', onPointerLeave)
    document.documentElement.addEventListener('mouseleave', onPointerLeave)

    const raycaster = new THREE.Raycaster()
    const hitPlane = new THREE.Plane()
    const hitPoint = new THREE.Vector3()
    const hitLocal = new THREE.Vector3()
    const camDir = new THREE.Vector3()
    const rootWorld = new THREE.Vector3()
    const ndc = new THREE.Vector2()
    const tmpColor = new THREE.Color()
    const white = new THREE.Color(0xffffff)
    const black = new THREE.Color(0x111111)

    let raf = 0
    let running = true
    const clock = new THREE.Clock()
    const assembleStart = performance.now()
    let reassembleAt = -1
    let lastTheme: 'light' | 'dark' = 'dark'
    let themeAcc = 0

    const scrollState = () => {
      const h = window.innerHeight || 1
      const y = window.scrollY
      const explodeP = reduced ? 0 : clamp(y / (h * 0.85), 0, 1)
      const contacts = document.getElementById('contacts')
      let hide = 0
      if (contacts) {
        const top = contacts.getBoundingClientRect().top
        hide = clamp(1 - top / (h * 0.45), 0, 1)
      }
      return { explodeP, hide }
    }

    let { explodeP, hide } = scrollState()
    const onScroll = () => {
      ;({ explodeP, hide } = scrollState())
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    const tick = () => {
      if (!running) return
      const t = clock.getElapsedTime()
      const now = performance.now()
      const dt = clock.getDelta()

      let assembleE = 1
      if (assemble && !reduced && mode === 'dots') {
        assembleE = easeOutCubic(Math.min(1, (now - assembleStart) / ASSEMBLE_MS))
      }

      const explodeE = reduced ? 0 : easeInOutCubic(explodeP)

      if (!reduced && explodeE >= 0.98 && reassembleAt < 0) {
        reassembleAt = now
      }
      const reassembleE =
        reassembleAt < 0
          ? 0
          : easeOutCubic(Math.min(1, (now - reassembleAt) / REASSEMBLE_MS))

      // Root: hero → drift during explode → center after reassemble
      const toCenter = Math.max(explodeE, reassembleE)
      root.position.x = HERO_X + (CENTER_X - HERO_X) * toCenter
      root.position.y = HERO_Y + (CENTER_Y - HERO_Y) * toCenter

      themeAcc += dt
      if (themeAcc > 0.12) {
        themeAcc = 0
        lastTheme = sampleThemeColor()
      }

      // Color: white on hero → black after reassemble on light; then follow theme
      let colorT = 0
      if (reassembleE > 0) {
        colorT = reassembleE
        if (reassembleE >= 1) {
          colorT = lastTheme === 'light' ? 1 : 0
        }
      }
      tmpColor.copy(white).lerp(black, colorT)
      for (const mat of pointMats) {
        mat.color.copy(tmpColor)
        mat.opacity = 1 - hide
        mat.transparent = hide > 0.01
        mat.visible = hide < 0.98
      }

      const canCursor =
        !reduced &&
        active &&
        mode === 'dots' &&
        assembleE > 0.95 &&
        explodeE < 0.05 &&
        reassembleAt < 0 &&
        hide < 0.1

      if (!reduced && active && explodeE < 0.2 && reassembleE < 0.2) {
        const spinFade = 1 - Math.max(explodeE / 0.2, reassembleE)
        orbits.rotation.y = t * 0.16 * spinFade
        orbits.rotation.x = Math.sin(t * 0.1) * 0.07 * spinFade
        orbits.rotation.z = Math.cos(t * 0.08) * 0.045 * spinFade
        logoGroup.scale.setScalar(1 + Math.sin(t * 1.05) * 0.012 * spinFade)
      } else if (reassembleE >= 1 && hide < 0.5) {
        orbits.rotation.y = t * 0.12
        orbits.rotation.x = Math.sin(t * 0.08) * 0.05
        orbits.rotation.z = Math.cos(t * 0.06) * 0.035
        logoGroup.scale.setScalar(1 + Math.sin(t * 0.9) * 0.01)
      }

      root.updateWorldMatrix(true, true)

      let planeReady = false
      if (canCursor && pointer.active) {
        camera.getWorldDirection(camDir)
        rootWorld.setFromMatrixPosition(root.matrixWorld)
        hitPlane.setFromNormalAndCoplanarPoint(camDir.negate(), rootWorld)
        ndc.set(pointer.x, pointer.y)
        raycaster.setFromCamera(ndc, camera)
        planeReady = raycaster.ray.intersectPlane(hitPlane, hitPoint) !== null
      }

      if (mode === 'dots') {
        for (let c = 0; c < liveAttrs.length; c++) {
          const attr = liveAttrs[c]!
          const home = homeChunks[c]!
          const start = startChunks[c]!
          const boom = explodeChunks[c]!
          const arr = attr.array as Float32Array
          const obj = parents[c]!

          let useCursor = false
          if (planeReady) {
            hitLocal.copy(hitPoint)
            obj.worldToLocal(hitLocal)
            useCursor = true
          }

          for (let i = 0; i < arr.length; i += 3) {
            // Intro assemble
            let hx = start[i]! + (home[i]! - start[i]!) * assembleE
            let hy = start[i + 1]! + (home[i + 1]! - start[i + 1]!) * assembleE
            let hz = start[i + 2]! + (home[i + 2]! - start[i + 2]!) * assembleE

            // Explode (once)
            const ex = hx + (boom[i]! - hx) * explodeE
            const ey = hy + (boom[i + 1]! - hy) * explodeE
            const ez = hz + (boom[i + 2]! - hz) * explodeE

            // Reassemble to home
            let x = ex + (home[i]! - ex) * reassembleE
            let y = ey + (home[i + 1]! - ey) * reassembleE
            let z = ez + (home[i + 2]! - ez) * reassembleE

            if (useCursor) {
              const dx = hx - hitLocal.x
              const dy = hy - hitLocal.y
              const dz = hz - hitLocal.z
              const d = Math.hypot(dx, dy, dz)
              if (d < CURSOR_RADIUS && d > 1e-4) {
                const fall = 1 - d / CURSOR_RADIUS
                const push = fall * fall * CURSOR_FORCE
                x = hx + (dx / d) * push
                y = hy + (dy / d) * push
                z = hz + (dz / d) * push
              }
            }

            arr[i] = x
            arr[i + 1] = y
            arr[i + 2] = z
          }
          attr.needsUpdate = true
        }
      }

      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    const ro = new ResizeObserver(resize)
    ro.observe(parent)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('blur', onPointerLeave)
      document.documentElement.removeEventListener('mouseleave', onPointerLeave)
      window.removeEventListener('scroll', onScroll)
      for (const obj of disposables) {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
            child.geometry.dispose()
            const m = child.material
            if (Array.isArray(m)) m.forEach((x) => x.dispose())
            else m.dispose()
          }
        })
      }
      dotTex?.dispose()
      renderer.dispose()
    }
  }, [active, mode, assemble, reduced])

  return <canvas ref={hostRef} className={styles.canvas} aria-hidden />
}
