const express = require('express');
const cache = require('memory-cache');
const { URL } = require('url');
const http = require('http');
const https = require('https');

const router = express.Router();

const TTL = parseInt(process.env.IMAGE_PROXY_TTL_MS || '3600000', 10); // 1 hour
const MAX_BYTES = parseInt(process.env.IMAGE_PROXY_MAX_BYTES || '5242880', 10); // 5 MB
const ALLOWLIST = (process.env.IMAGE_PROXY_ALLOWLIST || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function isAllowed(urlStr) {
  try {
    const u = new URL(urlStr);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    if (ALLOWLIST.length === 0) return true; // allow all if not configured
    // Exact match or subdomain of allowlisted host
    return ALLOWLIST.some(host => host && (u.hostname === host || u.hostname.endsWith(`.${host}`)));
  } catch {
    return false;
  }
}

function fetchBinary(urlStr, redirects = 0) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.get(
      u,
      { headers: { 'User-Agent': 'TimingAPI-ImageProxy/1.0' } },
      (res) => {
        const status = res.statusCode || 0;
        if ([301, 302, 303, 307, 308].includes(status) && res.headers.location && redirects < 3) {
          const next = new URL(res.headers.location, urlStr).toString();
          res.resume(); // discard body
          return fetchBinary(next, redirects + 1).then(resolve).catch(reject);
        }
        if (status !== 200) {
          res.resume();
          return reject(new Error(`Upstream status ${status}`));
        }
        const contentType = res.headers['content-type'] || 'application/octet-stream';
        let length = 0;
        const chunks = [];
        res.on('data', (chunk) => {
          length += chunk.length;
          if (length > MAX_BYTES) {
            req.destroy(new Error('Image too large'));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType }));
      }
    );
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('Upstream timeout')));
  });
}

router.get('/', async (req, res) => {
  const { url } = req.query;
  if (!url || !isAllowed(url)) {
    return res.status(400).json({ error: 'Invalid or disallowed url' });
  }
  const key = `img:${url}`;
  const cached = cache.get(key);
  if (cached) {
    res.set('Content-Type', cached.contentType);
    res.set('Cache-Control', `public, max-age=${Math.floor(TTL / 1000)}, stale-while-revalidate=59`);
    return res.end(cached.buffer);
  }
  try {
    const { buffer, contentType } = await fetchBinary(url);
    cache.put(key, { buffer, contentType }, TTL);
    res.set('Content-Type', contentType);
    res.set('Cache-Control', `public, max-age=${Math.floor(TTL / 1000)}, stale-while-revalidate=59`);
    return res.end(buffer);
  } catch (err) {
    return res.status(502).json({ error: 'Failed to fetch image' });
  }
});

module.exports = router;

