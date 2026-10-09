import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({ headless: true, args: ['--host-resolver-rules=MAP localhost 127.0.0.1'] });
try {
  const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
  await page.addInitScript(() => {
    window.musicCalls = { play: 0, pause: 0, destroy: 0 };
    window.YT = { Player: class {
      constructor(host, config) {
        this.events = config.events; this.frame = document.createElement('iframe'); this.frame.title = 'Test soundtrack'; host.replaceWith(this.frame);
        window.requestedSong = config.videoId;
        queueMicrotask(() => { this.events.onReady({ target: this }); this.events.onAutoplayBlocked(); });
      }
      playVideo() { window.musicCalls.play++; this.events.onStateChange({ data: 1 }); }
      pauseVideo() { window.musicCalls.pause++; this.events.onStateChange({ data: 2 }); }
      destroy() { window.musicCalls.destroy++; this.frame.remove(); }
    } };
  });
  await page.goto('http://localhost:5173');
  await page.evaluate(() => sessionStorage.setItem('rv-intro', '1'));
  await page.reload();
  await expect(page.getByRole('region', { name: 'Wedding soundtrack' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.musicCalls.play)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.requestedSong)).toBe('hghqd1eBTYQ');
  await page.getByRole('button', { name: 'Pause music', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.musicCalls.pause)).toBe(1);
  await page.getByRole('button', { name: 'Play music', exact: true }).click();
  await page.getByRole('button', { name: 'Close music player' }).click();
  await expect.poll(() => page.evaluate(() => window.musicCalls.destroy)).toBe(1);
  await page.getByRole('button', { name: 'Play music', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Wedding soundtrack' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.musicCalls.play)).toBeGreaterThan(0);
  console.log('PASS music integration with mocked YouTube API: requested song, autoplay attempt after refresh, pause/play, close cleanup, reopen and mobile overflow.');
} finally { await browser.close(); }