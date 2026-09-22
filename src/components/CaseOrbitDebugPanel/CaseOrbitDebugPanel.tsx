import { useState, useSyncExternalStore } from 'react'
import {
  dumpCaseOrbitParams,
  getCaseOrbitSnapshot,
  resetCaseOrbitToDefaults,
  setCaseOrbitParam,
  subscribeCaseOrbit,
  type CaseOrbitParams,
} from '../../debug/caseOrbitDebug'
import styles from '../HoverDebugPanel/HoverDebugPanel.module.css'

type SliderDef = {
  key: keyof CaseOrbitParams
  label: string
  min: number
  max: number
  step: number
}

const PATH: SliderDef[] = [
  { key: 'rx', label: 'radius X', min: 120, max: 900, step: 5 },
  { key: 'ry', label: 'radius Y', min: 40, max: 500, step: 5 },
  { key: 'rz', label: 'radius Z', min: 0, max: 800, step: 5 },
  { key: 'offsetX', label: 'offset X', min: -400, max: 400, step: 2 },
  { key: 'offsetY', label: 'offset Y', min: -400, max: 400, step: 2 },
  { key: 'worldY', label: 'world Y %', min: 20, max: 80, step: 1 },
  { key: 'phaseDeg', label: 'phase °', min: -180, max: 180, step: 1 },
  { key: 'gapDeg', label: 'gap ° (между)', min: 8, max: 90, step: 1 },
  { key: 'showPath', label: 'path guide', min: 0, max: 1, step: 1 },
]

const MOTION: SliderDef[] = [
  { key: 'speed', label: 'speed', min: 0, max: 1.2, step: 0.01 },
  { key: 'hoverSlow', label: 'hover slow', min: 0, max: 1, step: 0.01 },
  { key: 'hoverBoost', label: 'hover scale', min: 1, max: 1.8, step: 0.01 },
  { key: 'hoverLerp', label: 'hover lerp', min: 1, max: 20, step: 0.5 },
  { key: 'tiltX', label: 'tilt X °', min: -80, max: 80, step: 1 },
  { key: 'tiltY', label: 'tilt Y °', min: -80, max: 80, step: 1 },
  { key: 'rotZ', label: 'rot Z °', min: -180, max: 180, step: 1 },
  { key: 'cardYaw', label: 'card yaw °', min: -60, max: 60, step: 1 },
]

const LOOK: SliderDef[] = [
  { key: 'perspective', label: 'perspective', min: 400, max: 2800, step: 20 },
  { key: 'originY', label: 'persp origin Y %', min: 20, max: 80, step: 1 },
  { key: 'scaleMin', label: 'scale min', min: 0.2, max: 1, step: 0.01 },
  { key: 'scaleMax', label: 'scale max', min: 0.5, max: 1.6, step: 0.01 },
  { key: 'opacityMin', label: 'opacity min', min: 0.05, max: 1, step: 0.01 },
  { key: 'opacityMax', label: 'opacity max', min: 0.2, max: 1, step: 0.01 },
  { key: 'dimScale', label: 'dim scale', min: 0.5, max: 1, step: 0.01 },
  { key: 'dimOpacity', label: 'dim opacity', min: 0.1, max: 1, step: 0.01 },
]

type TabId = 'path' | 'motion' | 'look'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'path', label: 'path' },
  { id: 'motion', label: 'motion' },
  { id: 'look', label: 'look' },
]

function formatValue(key: keyof CaseOrbitParams, value: number, step: number) {
  if (key === 'showPath') return value >= 0.5 ? 'on' : 'off'
  if (
    key === 'phaseDeg' ||
    key === 'worldY' ||
    key === 'originY' ||
    key === 'tiltX' ||
    key === 'tiltY' ||
    key === 'rotZ' ||
    key === 'gapDeg' ||
    key === 'cardYaw'
  ) {
    return `${Math.round(value)}`
  }
  if (step < 1) return value.toFixed(2)
  return String(Math.round(value))
}

function Sliders({
  sliders,
  params,
}: {
  sliders: SliderDef[]
  params: CaseOrbitParams
}) {
  return (
    <div className={styles.group}>
      {sliders.map((s) => (
        <label key={s.key} className={styles.row}>
          <span className={styles.label}>
            {s.label}
            <strong>{formatValue(s.key, params[s.key], s.step)}</strong>
          </span>
          <input
            type="range"
            min={s.min}
            max={s.max}
            step={s.step}
            value={params[s.key]}
            onChange={(e) => setCaseOrbitParam(s.key, Number(e.target.value))}
          />
        </label>
      ))}
    </div>
  )
}

export function CaseOrbitDebugPanel() {
  const [open, setOpen] = useState(true)
  const [tab, setTab] = useState<TabId>('path')
  const params = useSyncExternalStore(
    subscribeCaseOrbit,
    getCaseOrbitSnapshot,
    getCaseOrbitSnapshot,
  )

  if (!open) {
    return (
      <button
        type="button"
        className={styles.fab}
        style={{ top: 'auto', bottom: 16 }}
        data-cursor-hover
        data-cursor-dark
        onClick={() => setOpen(true)}
        aria-expanded={false}
        aria-label="Открыть case orbit debug"
      >
        case
      </button>
    )
  }

  const body =
    tab === 'path' ? (
      <Sliders sliders={PATH} params={params} />
    ) : tab === 'motion' ? (
      <Sliders sliders={MOTION} params={params} />
    ) : (
      <Sliders sliders={LOOK} params={params} />
    )

  return (
    <aside
      className={styles.panel}
      style={{ top: 'auto', bottom: 16, maxHeight: 'min(70dvh, calc(100dvh - 32px))' }}
      data-cursor-hover
      data-cursor-dark
    >
      <div className={styles.head}>
        <span>case orbit</span>
        <div className={styles.headActions}>
          <button
            type="button"
            className={styles.reset}
            onClick={() => {
              const json = dumpCaseOrbitParams()
              void navigator.clipboard?.writeText(json)
              console.log('[case orbit]', json)
            }}
          >
            copy
          </button>
          <button
            type="button"
            className={styles.reset}
            onClick={() => resetCaseOrbitToDefaults()}
          >
            reset
          </button>
          <button
            type="button"
            className={styles.reset}
            onClick={() => setOpen(false)}
            aria-expanded={true}
            aria-label="Скрыть case orbit debug"
          >
            hide
          </button>
        </div>
      </div>
      <p className={styles.hint}>path / speed / depth — live</p>

      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={[styles.tab, tab === t.id ? styles.tabActive : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {body}
    </aside>
  )
}
