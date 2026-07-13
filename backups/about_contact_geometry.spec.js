const { test } = require('@playwright/test');

test('about contact mobile geometry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:8791/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(800);
  const result = await page.evaluate(() => {
    function box(sel) {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        sel,
        top: Math.round(r.top),
        height: Math.round(r.height),
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        display: cs.display,
        justifyContent: cs.justifyContent,
        alignItems: cs.alignItems,
        alignContent: cs.alignContent,
        overflow: cs.overflow,
        minHeight: cs.minHeight,
        heightCss: cs.height,
        flex: cs.flex,
      };
    }
    function gap(sectionSel, childSel) {
      const s = document.querySelector(sectionSel);
      const c = document.querySelector(childSel);
      if (!s || !c) return null;
      return Math.round(c.getBoundingClientRect().top - s.getBoundingClientRect().top);
    }
    return {
      about: box('#about.about-landing'),
      aboutGrid: box('#about .about-reframe-grid'),
      aboutGapToGrid: gap('#about.about-landing', '#about .about-reframe-grid'),
      aboutGapToTitle: gap('#about.about-landing', '#about .about-reframe-title'),
      contact: box('#contact.contact-landing'),
      contactFrame: box('#contact .contact-frame'),
      contactGrid: box('#contact .contact-grid'),
      contactGapToFrame: gap('#contact.contact-landing', '#contact .contact-frame'),
      contactGapToGrid: gap('#contact.contact-landing', '#contact .contact-grid'),
    };
  });
  console.log('GEOMETRY ' + JSON.stringify(result));
});
