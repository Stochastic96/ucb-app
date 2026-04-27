const http = require('http');
const https = require('https');

const PORT = Number(process.env.STUDIP_PROXY_PORT || 3001);
const TARGET_HOST = 'studip.hochschule-trier.de';
const TARGET_ORIGIN = `https://${TARGET_HOST}`;

function sanitizeHeaders(headers) {
  const next = { ...headers };
  delete next.host;
  delete next.connection;
  delete next['accept-encoding'];
  delete next['content-length'];
  return next;
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, target: TARGET_ORIGIN }));
    return;
  }

  const targetUrl = new URL(req.url, TARGET_ORIGIN);
  const proxyReq = https.request(
    targetUrl,
    {
      method: req.method,
      headers: sanitizeHeaders(req.headers),
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (error) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'proxy_request_failed', message: error.message }));
  });

  req.pipe(proxyReq);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Stud.IP proxy listening on http://0.0.0.0:${PORT}`);
  console.log(`Forwarding requests to ${TARGET_ORIGIN}`);
});
