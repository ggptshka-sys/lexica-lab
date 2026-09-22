import { useState, useSyncExternalStore } from 'react'
import {
  getHoverDebugSnapshot,
  resetHoverDebugToDefaults,
  setHoverDebugParam,
  subscribeHoverDebug,
  type HoverDebugParams,
} from '../../debug/hoverDebug'
import styles from './HoverDebugPanel.module.css'

type TabId = 'brush' | 'bends' | 'scroll'

type SliderDef = {
  key: keyof HoverDebugParams
  label: string
  min: number
  max: number
  step: number
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'brush', label: 'brush' },
  { id: 'bends', label: 'bends' },
  { id: 'scroll', label: 'scroll' },
]

const BRUSH_SLIDERS: SliderDef[] = [
  { key: 'offsetX', label: 'pos X', min: 0.05, max: 0.95, step: 0.01 },
  { key: 'offsetY', label: 'pos Y', min: 0.05, max: 0.95, step: 0.01 },
  { key: 'brushLen', label: 'length', min: 0.2, max: 1.8, step: 0.01 },
  { key: 'brushRot', label: 'rot °', min: -180, max: 180, step: 1 },
  { key: 'brushTrim', label: 'trim', min: 0, max: 0.7, step: 0.01 },
  { key: 'brushTrimEnd', label: 'trim end', min: 0, max: 1, step: 1 },
  { key: 'brushWeight', label: 'weight', min: 0.5, max: 2.5, step: 0.05 },
  { key: 'brushMid', label: 'mid thick', min: 0.01, max: 0.22, step: 0.005 },
  { key: 'brushTip', label: 'tip thick', min: 0, max: 0.06, step: 0.001 },
  { key: 'brushPower', label: 'taper', min: 0.5, max: 3, step: 0.05 },
  { key: 'brushGap', label: 'dot gap', min: 3.5, max: 14, step: 0.5 },
  { key: 'labGray', label: 'tone', min: 0, max: 220, step: 1 },
  { key: 'labGuides', label: 'guides', min: 0, max: 1, step: 1 },
]

const BEND_SLIDERS: SliderDef[] = [
  { key: 'brushBendCount', label: 'bends', min: 1, max: 4, step: 1 },
  { key: 'brushBend1', label: 'bend 1', min: -1, max: 1, step: 0.01 },
  { key: 'brushPos1', label: 'pos 1', min: 0.08, max: 0.92, step: 0.01 },
  { key: 'brushBend2', label: 'bend 2', min: -1, max: 1, step: 0.01 },
  { key: 'brushPos2', label: 'pos 2', min: 0.08, max: 0.92, step: 0.01 },
  { key: 'brushBend3', label: 'bend 3', min: -1, max: 1, step: 0.01 },
  { key: 'brushPos3', label: 'pos 3', min: 0.08, max: 0.92, step: 0.01 },
  { key: 'brushBend4', label: 'bend 4', min: -1, max: 1, step: 0.01 },
  { key: 'brushPos4', label: 'pos 4', min: 0.08, max: 0.92, step: 0.01 },
]

const SCROLL_SLIDERS: SliderDef[] = [
  { key: 'scrollRange', label: 'scroll range (vh)', min: 0.4, max: 2.5, step: 0.05 },
  { key: 'scrollSmooth', label: 'scroll smooth', min: 0.02, max: 0.25, step: 0.005 },
  { key: 'explodeEnd', label: 'explode end', min: 0.1, max: 0.9, step: 0.01 },
  { key: 'blastForce', label: 'blast force', min: 0.1, max: 1.5, step: 0.05 },
  { key: 'streamEnd', label: 'morph end', min: 0.2, max: 1, step: 0.01 },
  { key: 'followRate', label: 'follow rate', min: 0.02, max: 0.45, step: 0.005 },
]

function formatValue(key: keyof HoverDebugParams, value: number, step: number) {
  if (key === 'brushRot') return `${Math.round(value)}°`
  if (key === 'labGuides') return value >= 0.5 ? 'on' : 'off'
  if (key === 'brushTrimEnd') return value >= 0.5 ? 'end' : 'start'
  if (key === 'labGray' || key === 'brushBendCount') return String(Math.round(value))
  if (step < 1) return value.toFixed(2)
  return String(Math.round(value))
}

function Sliders({
  sliders,
  params,
}: {
  sliders: SliderDef[]
  params: HoverDebugParams
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
            onChange={(e) => setHoverDebugParam(s.key, Number(e.target.value))}
          />
        </label>
      ))}
    </div>
  )
}

export function HoverDebugPanel() {
  const [open, setOpen] = useState(true)
  const [tab, setTab] = useState<TabId>('brush')
  const params = useSyncExternalStore(
    subscribeHoverDebug,
    getHoverDebugSnapshot,
    getHoverDebugSnapshot,
  )

  if (!open) {
    return (
      <button
        type="button"
        className={styles.fab}
        data-cursor-hover
        data-cursor-dark
        onClick={() => setOpen(true)}
        aria-expanded={false}
        aria-label="Открыть debug-панель"
      >
        debug
      </button>
    )
  }

  const body =
    tab === 'brush' ? (
      <Sliders sliders={BRUSH_SLIDERS} params={params} />
    ) : tab === 'bends' ? (
      <Sliders sliders={BEND_SLIDERS} params={params} />
    ) : (
      <Sliders sliders={SCROLL_SLIDERS} params={params} />
    )

  return (
    <aside className={styles.panel} data-cursor-hover data-cursor-dark>
      <div className={styles.head}>
        <span>lab brush</span>
        <div className={styles.headActions}>
          <button
            type="button"
            className={styles.reset}
            onClick={() => resetHoverDebugToDefaults()}
          >
            reset
          </button>
          <button
            type="button"
            className={styles.reset}
            onClick={() => setOpen(false)}
            aria-expanded={true}
            aria-label="Скрыть debug-панель"
          >
            hide
          </button>
        </div>
      </div>

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
