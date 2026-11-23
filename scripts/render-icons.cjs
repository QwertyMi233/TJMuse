const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assets = path.resolve(__dirname, '../assets');
(async () => {
  // The user-provided logo is the only artwork source; do not redraw it.
  const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(assets, 'logo.png')).toString('base64');
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
  try {
    for (const [target, size, transparent, scale] of [['icon.png',1024,false,1],['adaptive-icon.png',1024,true,.9],['favicon.png',64,false,1],['logo-mark.png',128,true,1]]) {
      const page = await browser.newPage({ viewport: { width:size,height:size },deviceScaleFactor:1 });
      await page.setContent(`<style>html,body{margin:0;padding:0;width:100%;height:100%;background:${transparent?'transparent':'#FFFFFF'}}body{display:flex;align-items:center;justify-content:center}img{display:block;width:${scale*100}%;height:${scale*100}%;object-fit:contain}</style><img alt="TJMuse" src="${logo}">`);
      await page.locator('img').evaluate(image => image.decode());
      await page.screenshot({path:path.join(assets,target),omitBackground:transparent});
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
