# Lexica Lab — Hero Landing

Desktop-hero (1440) лендинга **Lexica Lab** по Figma + glyph-символ на Canvas 2D.

## Стек

- Vite + React + TypeScript
- CSS Modules
- Canvas 2D (без Three.js)

## Запуск

```bash
npm install
npm run dev
```

Сборка: `npm run build` · превью: `npm run preview`

## Что сделано

1. **Hero / Nav** — логотип `/exica`, нав `/ кейсы · подход · услуги · помощь`, CTA `/ обсудить проект`, заголовок, кнопки, лид + `lexica.lab`, скролл. UI: Neue Machina, слэши: Bitcount Grid Single.
2. **SymbolField** — белые **точки** (не глифы): preloader → сборка в круг+/ по маске → idle → UI. Hover-распад; **scroll explode** вниз / reform вверх. `prefers-reduced-motion` → сразу знак + UI.
3. **Cursor** — SVG из Figma (рамка + `+`).
4. Intro scramble на ссылках/кнопках после появления UI; заголовок/лид — fade-in.

Реф знака (solid vs dots): `docs/symbol-solid-vs-dots.png` · Figma dots: node `35:723`.

## Структура

```
src/components/
  Hero/
  Nav/
  SymbolField/
  Cursor/
  FadeIn/
src/assets/
  logo.svg
  cursor.svg
  symbol-mask.png
```

## Figma

- Landing: [24:3](https://www.figma.com/design/zz0icQPFEVGR1dQgc5ks9T/lab.---New-site-lexica?node-id=24-3)
- Cursor: [26:112](https://www.figma.com/design/zz0icQPFEVGR1dQgc5ks9T/lab.---New-site-lexica?node-id=26-112)

## Вне скоупа

Секции ниже fold, идеальный mobile, CMS.
