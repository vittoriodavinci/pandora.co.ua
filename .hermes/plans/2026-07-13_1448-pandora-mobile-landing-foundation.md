# Pandora Mobile Landing Foundation Plan

> **For Hermes:** planning only. Do not implement until the user explicitly allows edits.

**Goal:** привести мобильную версию Pandora к модели лендинга: один пункт меню = один цельный экран, свайп/scroll между экранами, без случайного подхвата следующей секции снизу.

**Architecture:** вместо отдельных заплаток для `#about`, `#project`, `#signal`, `#contact` нужен единый mobile foundation layer в конце CSS. Он должен управлять высотой экранов, snap/swipe-поведением, компактным режимом и fallback-режимом, если текст не помещается.

**Tech Stack:** статический `index.html`, CSS media queries, CSS variables, небольшой vanilla JS для измерения высоты секций и назначения классов `is-compact` / `is-overflow`.

---

## Контекст

Рабочий файл: `D:/~Pandora.co.ua/pandora-usen/index.html`.

Не трогать без отдельной команды:
- deploy;
- commit;
- push;
- backend;
- `index.rar`;
- `D:/~Pandora.co.ua/pandora-usen/1/index.html`;
- `D:/~/WEB/pandora.co.ua`.

Старые версии не удалять. Перед любыми правками создать backup в `D:/~Pandora.co.ua/pandora-usen/backups/`.

Текущие симптомы по скриншотам пользователя:
- `Главная` цепляет следующий экран снизу.
- `О проекте` цепляет следующий экран снизу.
- `Участие` цепляет `Связаться` снизу.
- `Связаться` иногда не показывает футер целиком или режет его.
- Свайп/лендинг-поведение из старой заплатки не восстановлено как система.

---

## Acceptance Criteria

1. На mobile каждый пункт меню открывает цельную смысловую зону:
   - Главная;
   - О нас;
   - О проекте;
   - Участие;
   - Связаться.
2. При переходе по меню экран не должен случайно показывать начало следующей секции.
3. Свайп/scroll должен ощущаться как лендинг: секции листаются экран за экраном.
4. Если текст секции не помещается:
   - сначала применяется compact-режим;
   - если compact не помогает, включается universal contained-scroll: текстовая зона остаётся внутри экрана, справа появляется тонкая жёлтая полоса/scrollbar-индикатор, а прокрутка идёт внутри описания, не выталкивая следующий экран.
5. `Участие` сохраняет уже исправленное в `v1.02`:
   - скрытый блок `Обратите внимание`;
   - видимые кнопки `Рассказать другу` и `Присоединиться`;
   - share-menu открывается вверх.
6. `Связаться` показывает форму и футер целиком на целевых mobile viewport'ах, насколько это физически возможно без разрушения читаемости.
7. `О проекте`/carousel не ломается: сохранить `about-project-landing`, `apl-stage`, `apl-panel`, `#aplPanelLeft`, `#aplPanelRight`, `pandoraProjectCarousel`, горизонтальный свайп, кнопки `Логотип`/`Название`.
8. В футере обновить видимый marker версии, например до `(v2.00)`, с комментарием `ВЕРСИЯ` и инструкцией удаления.

---

## Proposed Approach

Сделать не очередной hard-reset, а новый удаляемый слой:

```css
/* ВЕРСИЯ v2.00 — MOBILE LANDING FOUNDATION */
@media (max-width: 768px) {
  ...
}
/* END ВЕРСИЯ v2.00 */
```

Задачи слоя:
- задать единые переменные высоты mobile header/nav/footer;
- восстановить snap/swipe между основными секциями;
- нормализовать секции как экраны;
- добавить compact-режимы по высоте viewport;
- оставить fallback для секций, где текст физически не помещается.

---

## Step-by-Step Plan

### Task 1: Сделать read-only аудит текущих конфликтов

**Objective:** понять, какие текущие CSS-слои ломают mobile landing behavior.

**Files:**
- Read: `D:/~Pandora.co.ua/pandora-usen/index.html`

**Actions:**
1. Найти все правила для:
   - `scroll-snap`;
   - `height: 100vh`, `height: 100svh`, `min-height: 100vh`, `min-height: 100svh`;
   - `overflow: hidden`, `overflow-y: auto`;
   - `#hero`, `#about`, `#project`, `.project-*`, `#signal`, `#contact`, `footer`;
   - старые blocks `pandora-mobile-hard-reset`, `mobile-hotfix`, `v1.01`, `v1.02`.
2. Не править файл на этом шаге.
3. Выписать, какие правила нужно перебить в новом final-layer.

**Verification:** список конфликтов есть, без изменений в файлах.

---

### Task 2: Создать backup перед v2.00

**Objective:** сохранить текущую рабочую версию перед архитектурной правкой.

**Files:**
- Copy: `D:/~Pandora.co.ua/pandora-usen/index.html`
- To: `D:/~Pandora.co.ua/pandora-usen/backups/index_mobile_landing_foundation_v2_00_2026-07-13.html`

**Verification:** backup существует и размер близок к исходному `index.html`.

---

### Task 3: Ввести mobile CSS variables

**Objective:** перестать гадать с высотой, сделать расчетные переменные.

**Modify:** `D:/~Pandora.co.ua/pandora-usen/index.html`

Add inside final v2 block:

```css
@media (max-width: 768px) {
  :root {
    --pandora-mobile-header-h: 64px;
    --pandora-mobile-nav-h: 42px;
    --pandora-mobile-top-ui: calc(var(--pandora-mobile-header-h) + var(--pandora-mobile-nav-h));
    --pandora-mobile-screen-h: calc(100svh - var(--pandora-mobile-top-ui));
    --pandora-mobile-section-pad-x: 18px;
    --pandora-mobile-section-pad-y: 14px;
    --pandora-mobile-gap: 12px;
  }
}
```

**Notes:** values must be checked against real header/nav height from screenshots/current CSS.

---

### Task 4: Restore controlled landing snap/swipe

**Objective:** вернуть поведение лендинга: прокрутка/свайп идет по смысловым экранам.

**Modify:** `D:/~Pandora.co.ua/pandora-usen/index.html`

Candidate CSS:

```css
@media (max-width: 768px) {
  html,
  body {
    height: 100%;
    overflow-y: auto;
    scroll-snap-type: y mandatory;
    scroll-behavior: smooth;
    overscroll-behavior-y: contain;
  }

  #hero,
  #about,
  .about-project-landing,
  #signal,
  #contact {
    scroll-snap-align: start;
    scroll-snap-stop: always;
    min-height: 100svh;
    box-sizing: border-box;
  }
}
```

**Important:** do not apply blindly to every `section`; `О проекте` has carousel internals and must be mapped to actual section selectors after audit.

---

### Task 5: Normalize mobile sections as whole screens

**Objective:** секции должны занимать экран, но не резать важный контент.

**Modify:** `D:/~Pandora.co.ua/pandora-usen/index.html`

Candidate CSS:

```css
@media (max-width: 768px) {
  #hero,
  #about,
  .about-project-landing,
  #signal,
  #contact {
    width: 100%;
    padding-left: var(--pandora-mobile-section-pad-x) !important;
    padding-right: var(--pandora-mobile-section-pad-x) !important;
    padding-top: calc(var(--pandora-mobile-top-ui) + var(--pandora-mobile-section-pad-y)) !important;
    padding-bottom: var(--pandora-mobile-section-pad-y) !important;
    overflow: hidden;
  }
}
```

**Risk:** `overflow:hidden` can cut real content. It must be paired with compact/overflow JS classes, not used alone.

---

### Task 6: Add JS measurement pass

**Objective:** сайт сам должен понять, влезает ли секция на текущем телефоне.

**Modify:** `D:/~Pandora.co.ua/pandora-usen/index.html`

Add script near existing scripts, with marker:

```js
/* ВЕРСИЯ v2.00 — MOBILE FIT MEASURE */
(function () {
  function fitMobileSections() {
    if (!window.matchMedia('(max-width: 768px)').matches) return;

    const selectors = ['#hero', '#about', '.about-project-landing', '#signal', '#contact'];
    const sections = selectors
      .map((selector) => document.querySelector(selector))
      .filter(Boolean);

    sections.forEach((section) => {
      section.classList.remove('is-compact', 'is-overflow');
      const viewport = window.innerHeight;
      const limit = viewport * 0.98;

      if (section.scrollHeight > limit) {
        section.classList.add('is-compact');
      }
    });

    requestAnimationFrame(() => {
      sections.forEach((section) => {
        const viewport = window.innerHeight;
        const limit = viewport * 0.98;
        if (section.scrollHeight > limit) {
          section.classList.add('is-overflow');
        }
      });
    });
  }

  window.addEventListener('load', fitMobileSections);
  window.addEventListener('resize', fitMobileSections);
  window.addEventListener('orientationchange', fitMobileSections);
  document.addEventListener('DOMContentLoaded', fitMobileSections);
})();
/* END ВЕРСИЯ v2.00 — MOBILE FIT MEASURE */
```

**Important:** exact selectors must be confirmed from file before writing.

---

### Task 7: Add compact CSS rules

**Objective:** если секция не помещается, не показывать следующий экран, а ужимать текущий.

**Modify:** `D:/~Pandora.co.ua/pandora-usen/index.html`

Examples:

```css
@media (max-width: 768px) {
  .is-compact .section-title,
  #hero.is-compact .hero-title {
    font-size: clamp(26px, 7vw, 36px) !important;
    line-height: 1.04 !important;
    margin-bottom: 10px !important;
  }

  .is-compact .accent-copy-block,
  #signal.is-compact .accent-copy-block,
  #contact.is-compact .contact-form {
    padding-top: 14px !important;
    padding-bottom: 14px !important;
  }

  .is-compact p {
    line-height: 1.38 !important;
    margin-bottom: 8px !important;
  }

  .is-compact .final-actions,
  .is-compact .signal-actions {
    margin-top: 12px !important;
    gap: 8px !important;
  }
}
```

**Constraint:** do not touch `hero-title` unless specifically needed for home screen fit; current user warning says `hero-title` should generally not be touched. If needed, ask before changing hero title font.

---

### Task 8: Add universal contained-scroll fallback

**Objective:** если compact не помогает, не включать случайный переход к следующей секции и не резать текст; вместо этого текстовая зона получает внутреннюю прокрутку с видимым жёлтым индикатором справа.

**Modify:** `D:/~Pandora.co.ua/pandora-usen/index.html`

Model:
- each screen keeps fixed visual frame for mobile landing mode;
- the overflowing description block becomes `.mobile-contained-scroll`;
- right side shows a thin gold scrollbar/indicator;
- scroll happens inside the text/card area, similar to office apps/file manager behavior;
- CTA buttons stay outside the scrollable text zone and remain visible.

Candidate CSS:

```css
@media (max-width: 768px) {
  .is-overflow .mobile-contained-scroll {
    max-height: var(--pandora-mobile-scroll-area-h);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-right: 10px;
    scrollbar-width: thin;
    scrollbar-color: var(--accent) rgba(255,255,255,.08);
  }

  .is-overflow .mobile-contained-scroll::-webkit-scrollbar {
    width: 4px;
  }

  .is-overflow .mobile-contained-scroll::-webkit-scrollbar-track {
    background: rgba(255,255,255,.08);
  }

  .is-overflow .mobile-contained-scroll::-webkit-scrollbar-thumb {
    background: var(--accent);
    border-radius: 999px;
  }
}
```

Section mapping:
- `#hero`: long body/quote area, not logo/title unless approved;
- `#about`: existing text body area;
- `О проекте`: paragraph/FAQ text area, not carousel controls;
- `#signal`: `.accent-copy-block` text area; buttons stay visible;
- `#contact`: form fields compact first; avoid inner scroll for hCaptcha unless absolutely necessary.

**Decision:** read-more becomes optional secondary fallback only if the user later rejects inner scroll for a specific section.

---

### Task 9: Fix `#signal` within foundation

**Objective:** make `Участие` a full landing screen.

**Keep from v1.02:**
- hide `#signal .signal-note`;
- show `.final-actions`;
- buttons full width;
- `.share-menu` opens upward.

**Add:**
- prevent immediate visibility of `#contact` after menu navigation;
- compact heading/card/buttons for `393x873` and `390x844`.

**Verification:** screenshot at `#signal` shows no `Связаться` field at bottom in target viewports.

---

### Task 10: Fix `#contact` footer fit

**Objective:** `Связаться` screen should show footer fully when opened from menu.

**Actions:**
- reduce contact form gaps;
- reduce input heights slightly;
- reduce textarea rows/height on compact mobile;
- reduce captcha margins if possible without breaking widget;
- place footer as intentional part of contact screen or immediately below with predictable snap.

**Verification:** footer line and icons visible fully on `390x844`, `393x873`, `412x915`.

---

### Task 11: Fix `О проекте` without breaking carousel

**Objective:** no next section visible at bottom while preserving horizontal carousel/swipe.

**Actions:**
- keep existing `apl-*` structure;
- avoid global `overflow:hidden` on inner carousel if it breaks horizontal movement;
- compact text/question rows;
- preserve dots and tabs.

**Verification:** screenshot at `О проекте` shows no `Участие` headline at bottom.

---

### Task 12: Fix main/home screen

**Objective:** home screen should not show next section at bottom unless intentionally designed as a hint. User now says this is a defect, so remove the hint.

**Actions:**
- compact lower quote/paragraph spacing;
- ensure next heading is not visible at bottom;
- do not change `hero-title` unless unavoidable and approved.

**Verification:** screenshot home mobile shows no next section title at bottom.

---

### Task 13: Update visible footer marker

**Objective:** user can see that v2.00 is active.

**Modify:** footer marker near `© 2026 Pandora, coop.`:

```html
<!-- ВЕРСИЯ / VERSION MARKER v2.00
     Временно показывает, какая версия index.html реально попала на сайт.
     Чтобы отключить вручную: удалить этот комментарий и следующий span.footer-version-marker. -->
<span class="footer-version-marker" data-file-version="index.html v2.00">(v2.00)</span>
```

---

### Task 14: Static verification

Run from `D:/~Pandora.co.ua/pandora-usen`:

```bash
git diff --check -- index.html
```

Also verify:
- `<style>` count equals `</style>` count;
- `<script>` count equals `</script>` count;
- CSS brace delta is `0`;
- `scroll-margin-top: -25svh` absent;
- v2.00 marker present once in footer.

---

### Task 15: Browser screenshot verification

Use local server on a free port:

```bash
python -m http.server 8794
```

Use Playwright CLI screenshot path that previously worked:

```bash
npx -y playwright@latest screenshot --viewport-size=360,800 http://127.0.0.1:8794/ backups/mobile_v2_home_360x800.png
npx -y playwright@latest screenshot --viewport-size=390,844 http://127.0.0.1:8794/#signal backups/mobile_v2_signal_390x844.png
npx -y playwright@latest screenshot --viewport-size=393,873 http://127.0.0.1:8794/#signal backups/mobile_v2_signal_393x873.png
npx -y playwright@latest screenshot --viewport-size=412,915 http://127.0.0.1:8794/#contact backups/mobile_v2_contact_412x915.png
```

Additional screenshots required:
- home/main at all target viewports;
- `О проекте` at all target viewports;
- `Участие` at all target viewports;
- `Связаться` at all target viewports.

---

## Verification Matrix

Target viewports:

| Viewport | Purpose |
|---|---|
| `360x800` | small Android stress test |
| `390x844` | current common mobile baseline |
| `393x873` | Redmi Note 12 Pro-like CSS viewport |
| `412x915` | larger Android |
| `768x1024` | tablet sanity |
| `1366x768` | desktop/laptop regression |
| `1920x1080` | wide desktop regression |

For each menu section verify:
- no accidental next-section visible at bottom;
- no text clipped;
- no CTA hidden;
- no inner nested scroll unless intentional;
- no footer clipping on `Связаться`;
- share-menu opens upward and remains visible.

---

## Risks

1. Pure CSS cannot reliably know whether translated text fits every device. JS measurement is needed for robust compact/overflow classes.
2. Global `scroll-snap-type` can fight with horizontal carousel/swipe in `О проекте`; must scope carefully.
3. `overflow:hidden` can hide content if applied without compact fallback.
4. `100vh` is unreliable on mobile browser chrome; prefer `100svh`/`100dvh` with fallback.
5. hCaptcha has fixed internal size; contact screen may need special compact treatment and may still not fully fit on very small screens without reducing textarea height.
6. Existing old CSS layers may still override v2 unless the final layer is at the end and uses enough selector specificity.

---

## Open Questions Before Implementation

1. При маленьком экране, если текст физически не помещается, пользователь разрешает `читать далее`?
2. Главная должна быть строго один экран без намека на следующий блок, или допускается минимальный hint? По последнему скриншоту — считать hint дефектом.
3. `Связаться`: футер является частью contact-screen или отдельным snap-screen? По текущему запросу — футер должен влезать в экран `Связаться`.
4. Свайп должен быть нативный vertical scroll-snap или нужна JS-навигация по секциям? Начать с нативного CSS scroll-snap, JS только для fit classes.

---

## Implementation Rule

Do not start implementation until user explicitly says to proceed.

When implementation starts:
1. backup first;
2. one file only: `D:/~Pandora.co.ua/pandora-usen/index.html`;
3. no commit/push/deploy;
4. update footer marker to `(v2.00)`;
5. verify with real screenshots before reporting done.
