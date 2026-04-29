import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT || 4173);
const ROOT = process.cwd();

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

function resolvePath(urlPath) {
  const cleanPath = urlPath === "/" ? "/index.html" : urlPath;
  const normalized = normalize(cleanPath).replace(/^(\.\.[/\\])+/, "");
  return join(ROOT, normalized);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const filePath = resolvePath(url.pathname);
    const data = await readFile(filePath);
    const extension = extname(filePath);

    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream"
    });
    response.end(data);
  } catch (error) {
    response.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8"
    });
    response.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`Hypertrophy planner running at http://localhost:${PORT}`);
});
