const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve('.');
const port = Number(process.env.PORT || 4173);
const dist = path.join(root, 'dist');
const contentTypes = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/markdown; charset=utf-8' };

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  const requested = path.resolve(dist, `.${pathname}`);
  const candidate = requested.startsWith(dist) && fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(dist, 'index.html');
  const file = candidate;
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
  console.log(`SNT rebuilt-site preview: http://127.0.0.1:${port}`);
  console.log('Press Ctrl+C to stop.');
});
