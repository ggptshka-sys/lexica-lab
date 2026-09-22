import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import styles from './LexicaMark3D.module.css'

type Props = {
  /** When false, mark stays in rest pose (e.g. during preloader). */
  active?: boolean
  /** Hero scroll-sink. Off in menu so mark stays centered. */
  followScroll?: boolean
  /** Multiplier for `--mark-scale` (e.g. 2 in mobile menu). */
  scaleMul?: number
  className?: string
}

const STROKE = 0.14
const DEPTH = 0.26
const OUTER_R = 1
const INNER_R = OUTER_R - STROKE

const INTRO_START_SCALE = 0.1
const INTRO_SCALE_DUR = 0.75
const IDLE_SPIN = 0.2
const INTRO_SPIN = 14.5
const INTRO_SPIN_TAU = 1.15
const SCROLL_SPIN = 5.2
const SLASH_SPIN_RATIO = 1

function readMarkScale() {
  if (typeof window === 'undefined') return 0.66
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--mark-scale')
    .trim()
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) && n > 0 ? n : 0.66
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v))
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3
}

function easeOutQuint(t: number) {
  return 1 - (1 - t) ** 5
}

function slashPath(len: number, halfW: number, angle: number): THREE.Vector2[] {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const local: [number, number][] = [
    [-len, -halfW],
    [len, -halfW],
    [len, halfW],
    [-len, halfW],
  ]
  return local.map(([x, y]) => new THREE.Vector2(x * c - y * s, x * s + y * c))
}

function makeRingGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  shape.absarc(0, 0, OUTER_R, 0, Math.PI * 2, false)
  const hole = new THREE.Path()
  hole.absarc(0, 0, INNER_R, 0, Math.PI * 2, true)
  shape.holes.push(hole)

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 80,
  })
  geo.center()
  geo.computeVertexNormals()
  return geo
}

function makeSlashGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  const pts = slashPath(INNER_R * 0.62, STROKE * 0.5, -Math.PI / 4.6)
  shape.moveTo(pts[0]!.x, pts[0]!.y)
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i]!.x, pts[i]!.y)
  shape.closePath()

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: DEPTH,
    bevelEnabled: false,
    curveSegments: 1,
  })
  geo.center()
  geo.computeVertexNormals()
  return geo
}

/**
 * Hero-only Lexica mark.
 * Intro spin → idle; on scroll sinks under The Lab (does not follow the page).
 */
export function LexicaMark3D({
  active = true,
  followScroll = true,
  scaleMul = 1,
  className,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const w0 = host.clientWidth || window.innerWidth
    const h0 = host.clientHeight || window.innerHeight
    if (w0 < 2 || h0 < 2) return

    const readScale = () => readMarkScale() * scaleMul

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(w0, h0, false)
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.58
    host.appendChild(renderer.domElement)
    renderer.domElement.className = styles.canvas

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, w0 / h0, 0.1, 40)
    camera.position.set(0, 0.05, 4.1)
    camera.lookAt(0, 0, 0)

    const pmrem = new THREE.PMREMGenerator(renderer)
    const envScene = new THREE.Scene()
    envScene.background = new THREE.Color('#131313')
    const addEnvPanel = (color: string, pos: [number, number, number], scale: [number, number, number]) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(1, 24, 16),
        new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }),
      )
      m.position.set(...pos)
      m.scale.set(...scale)
      envScene.add(m)
      return m
    }
    const envLightA = addEnvPanel('#ffffff', [3.5, 6, 2], [4.5, 2.1, 1.15])
    const envLightB = addEnvPanel('#e0e0e0', [-5, 2, 3], [2.5, 3.1, 1])
    const envLightC = addEnvPanel('#ffffff', [0, 4.5, 6], [3.2, 1.4, 1])
    const envLightD = addEnvPanel('#aaaaaa', [2, -3, -4], [2.6, 1.3, 1.7])
    const envFloor = addEnvPanel('#404040', [0, -6, 0], [7, 0.35, 7])
    const envRT = pmrem.fromScene(envScene, 0.04)
    scene.environment = envRT.texture
    scene.environmentIntensity = 1.35

    scene.add(new THREE.AmbientLight(0xffffff, 0.28))
    scene.add(new THREE.HemisphereLight(0xffffff, 0x1c1c1c, 0.42))
    const key = new THREE.DirectionalLight(0xffffff, 2.55)
    key.position.set(2.2, 7, 4.5)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.5)
    fill.position.set(-4.5, 2, 3.5)
    scene.add(fill)
    const fillFront = new THREE.DirectionalLight(0xffffff, 0.68)
    fillFront.position.set(0.4, 1.5, 6)
    scene.add(fillFront)
    const rim = new THREE.DirectionalLight(0xffffff, 1.75)
    rim.position.set(-2, -0.5, -5)
    scene.add(rim)
    const spot = new THREE.SpotLight(0xffffff, 4.1, 18, Math.PI / 6, 0.28, 1.1)
    spot.position.set(0.3, 5, 4)
    spot.target.position.set(0, 0, 0)
    scene.add(spot)
    scene.add(spot.target)

    const metalMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#f6f6f6'),
      metalness: 0.96,
      roughness: 0.03,
      envMapIntensity: 1.9,
      clearcoat: 1,
      clearcoatRoughness: 0.012,
      reflectivity: 1,
      ior: 2.33,
    })

    const root = new THREE.Group()
    scene.add(root)

    const ring = new THREE.Mesh(makeRingGeometry(), metalMat)
    root.add(ring)

    const slashPivot = new THREE.Group()
    root.add(slashPivot)
    const slash = new THREE.Mesh(makeSlashGeometry(), metalMat)
    slashPivot.add(slash)

    const restRot = new THREE.Euler(-0.28, 0.22, 0.04)
    root.rotation.copy(restRot)
    root.position.set(0, 0, 0)
    let restScale = readScale()
    root.scale.setScalar(reduced ? restScale : INTRO_START_SCALE)

    let raf = 0
    let running = true
    let introScaleT = reduced || !active ? 1 : 0
    let spinBoost = reduced || !active ? 0 : INTRO_SPIN - IDLE_SPIN
    let spinAngle = 0
    let scrollTarget = 0
    let scrollSmooth = 0
    const clock = new THREE.Clock()

    const measureScroll = () => {
      if (!followScroll || !active || reduced) return 0
      const range = Math.max(1, window.innerHeight * 0.88)
      return clamp(window.scrollY / range, 0, 1)
    }

    const onScroll = () => {
      scrollTarget = measureScroll()
    }

    const onResize = () => {
      const w = host.clientWidth || window.innerWidth
      const h = host.clientHeight || window.innerHeight
      camera.aspect = w / Math.max(1, h)
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
      restScale = readScale()
    }

    const tick = () => {
      if (!running) return
      const dt = Math.min(0.05, clock.getDelta())
      const idle = clock.elapsedTime

      if (reduced || !active) {
        root.rotation.set(restRot.x, restRot.y, restRot.z)
        root.position.set(0, 0, 0)
        root.scale.setScalar(restScale)
        slashPivot.rotation.z = 0
      } else {
        if (introScaleT < 1) introScaleT = Math.min(1, introScaleT + dt / INTRO_SCALE_DUR)
        const scaleE = easeOutQuint(introScaleT)

        spinBoost *= Math.exp(-dt / INTRO_SPIN_TAU)
        if (spinBoost < 0.002) spinBoost = 0

        scrollTarget = measureScroll()
        scrollSmooth += (scrollTarget - scrollSmooth) * clamp(dt * 6, 0.05, 0.25)
        if (Math.abs(scrollTarget - scrollSmooth) < 0.0004) scrollSmooth = scrollTarget
        const scrollE = easeOutCubic(scrollSmooth)

        const scrollBoost = scrollE * SCROLL_SPIN
        spinAngle += (IDLE_SPIN + spinBoost + scrollBoost) * dt

        root.rotation.x =
          restRot.x + Math.sin(idle * 0.35) * 0.03 * (1 - scrollE) * scaleE + scrollE * 0.35
        root.rotation.y = restRot.y + spinAngle
        root.rotation.z = restRot.z + scrollE * 0.2

        slashPivot.rotation.z = -spinAngle * SLASH_SPIN_RATIO

        // Sink under The Lab — Hero overflow + Lab wash cover
        root.position.x = 0
        root.position.y = -scrollE * 2.15
        root.position.z = -scrollE * 1.1
        root.scale.setScalar(
          THREE.MathUtils.lerp(INTRO_START_SCALE, restScale, scaleE) * (1 - scrollE * 0.12),
        )
        root.visible = scrollE < 0.98
      }

      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }

    onScroll()
    scrollSmooth = scrollTarget
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    raf = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      ring.geometry.dispose()
      slash.geometry.dispose()
      metalMat.dispose()
      envLightA.geometry.dispose()
      ;(envLightA.material as THREE.Material).dispose()
      envLightB.geometry.dispose()
      ;(envLightB.material as THREE.Material).dispose()
      envLightC.geometry.dispose()
      ;(envLightC.material as THREE.Material).dispose()
      envLightD.geometry.dispose()
      ;(envLightD.material as THREE.Material).dispose()
      envFloor.geometry.dispose()
      ;(envFloor.material as THREE.Material).dispose()
      envRT.dispose()
      pmrem.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement)
    }
  }, [active, reduced, followScroll, scaleMul])

  return (
    <div
      ref={hostRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      aria-hidden
    />
  )
}
