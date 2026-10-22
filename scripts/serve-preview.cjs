const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve('.');
const port = Number(process.env.PORT || 4173);
const routes = new Map([
  ['/', path.join(root, 'preview', 'index.html')],
  ['/index.html', path.join(root, 'preview', 'index.html')],
  ['/data/scraped-content.json', path.join(root, 'data', 'scraped-content.json')]
]);
const contentTypes = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8' };

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  const file = routes.get(pathname);
  if (!file) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  fs.createReadStream(file)
    .on('error', () => {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Unable to read preview data');
    })
    .once('open', () => response.writeHead(200, {
      'content-type': contentTypes[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store'
    }))
    .pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`SNT scraped-site preview: http://127.0.0.1:${port}`);
  console.log('Press Ctrl+C to stop.');
});
