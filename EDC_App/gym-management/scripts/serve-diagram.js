const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT || 4173);
const root = path.join(__dirname, "..", "docs");
const svgPath = path.join(root, "gym-class-diagram.svg");

const server = http.createServer((req, res) => {
  const urlPath = new URL(req.url, `http://127.0.0.1:${port}`).pathname;

  if (urlPath === "/" || urlPath === "/index.html") {
    const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Gym UML Diagram</title>
  <style>
    body { margin: 0; background: #0f172a; }
    .frame { width: 100vw; height: 100vh; overflow: auto; display: flex; justify-content: center; align-items: flex-start; padding: 16px; box-sizing: border-box; }
    img { max-width: 100%; height: auto; box-shadow: 0 10px 40px rgba(0,0,0,.35); background: white; }
  </style>
</head>
<body>
  <div class="frame">
    <img src="/gym-class-diagram.svg" alt="Gym UML Diagram" />
  </div>
</body>
</html>`;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  if (urlPath === "/gym-class-diagram.svg") {
    if (!fs.existsSync(svgPath)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("SVG not found");
      return;
    }
    res.writeHead(200, { "Content-Type": "image/svg+xml; charset=utf-8" });
    fs.createReadStream(svgPath).pipe(res);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Gym UML server running on http://127.0.0.1:${port}`);
});
