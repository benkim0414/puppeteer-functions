const express = require('express');
const puppeteer = require('puppeteer');
const functions = require('firebase-functions');

const app = express();
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.all('*', async (req, res, next) => {
  res.locals.browser = await puppeteer.launch({args: ['--no-sandbox']});
  next();
});

app.get('/screenshot', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).send(
      'Please provide a URL. Example: ?url=https://example.com'
    );
  }

  const viewport = {
    width: 1280,
    height: 1024,
    deviceScaleFactor: 1
  };

  let fullPage = false;
  const size = req.query.size;
  if (size) {
    const [width, height] = size.split(',').map(item => Number(item));
    if (!(isFinite(width) && isFinite(height))) {
      return res.status(400).send('Malformed size parameter. Example: ?size=800,600');
    }
    viewport.width = width;
    viewport.height = height;
  } else {
    fullPage = true;
  }

  const browser = res.locals.browser;

  try {
    const page = await browser.newPage();
    await page.goto(url, {waitUntil: 'networkidle2'});

    const opts = {
      fullPage,
      clip: {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      },
    };
    if (fullPage) {
      delete opts.clip;
    }

    const buffer = await page.screenshot(opts);
    res.type('image/png').send(buffer);
  } catch (e) {
    res.status(500).send(e.toString());
  }

  await browser.close();
});

const runtimeOpts = {memory: '2GB', timeoutSeconds: 60};
exports.screenshot = functions.runWith(runtimeOpts).https.onRequest(app);