# Lexica Lab — лендинг

## Цель

Desktop лендинг Lexica Lab: Monochrome ASCII Cybercore. Полная страница по макету Frame 20 (`37:1401`).

## Стек

Vite + React + TypeScript, CSS Modules, Canvas 2D, Three.js (LexicaMark3D, OrbitMark).

## Figma

- Full page: https://www.figma.com/design/zz0icQPFEVGR1dQgc5ks9T/lab.---New-site-lexica?node-id=37-1401
- Hero `24:3` → Lab `37:724` → Process `60:2453` → Case `40:1460` → Team `87:1288` → Services `56:2098` → Contacts `61:2603`
- Mobile Frame 93: https://www.figma.com/design/zz0icQPFEVGR1dQgc5ks9T/lab.---New-site-lexica?node-id=105-1703

## Статус

- Cipher-прелодер на `/preloader`. Hero: LexicaWord → 3D mark (только Hero, sink под Lab).
- Тексты сайта — lowercase (`text-transform` + строки).
- Hero 24:3: mega title, tagline справа, lead+CTA слева снизу, scroll по центру, cookie banner (blur stub).
- Case 40:1460: 2 featured + мини-шоты (hover scale); title scramble + image zoom. Team 87:1288: фото → bio. Дальше Services.
- Wash секций непрозрачный (#fff / #000).
- Process `60:2453` 1:1.
- Адаптив: **mobile Frame 93 `105:1703`** (402, pad 16) — burger/drawer, Hero stack, Lab/Process/Case/Team/Services/Contacts; 1920+ `--page-pad: 120px`, `--edge-y: 40`, mark `--mark-scale`.
