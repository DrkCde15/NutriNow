import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)));
const requestedRoot = process.argv[2] && !/^\d+$/.test(process.argv[2]) ? process.argv[2] : ".";
const portArg = process.argv[2] && /^\d+$/.test(process.argv[2]) ? process.argv[2] : process.argv[3];
const root = resolve(projectRoot, requestedRoot);
const port = Number(portArg || 5173);

const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function cacheControlFor(filePath) {
  const normalized = filePath.replaceAll("\\", "/");
  if (normalized.includes("/assets/")) return "public, max-age=31536000, immutable";
  if (/\.(css|js)$/.test(normalized)) return "public, max-age=3600, must-revalidate";
  return "no-cache";
}

function sendFile(res, filePath) {
  const headers = {
    "Content-Type": mime[extname(filePath).toLowerCase()] || "application/octet-stream",
    "Cache-Control": cacheControlFor(filePath),
  };
  res.writeHead(200, headers);
  createReadStream(filePath).pipe(res);
}

function isApiRequest(url) {
  const pathname = url.pathname;
  return pathname.startsWith("/api/") || pathname.startsWith("/auth/") || pathname.startsWith("/health");
}

function isStaticFile(pathname) {
  const ext = extname(pathname).toLowerCase();
  return [".css", ".js", ".jpg", ".jpeg", ".png", ".svg", ".webp", ".ico", ".json"].includes(ext);
}

function resolveFilePath(basePath, pathname) {
  // Try exact match first
  const exact = resolve(basePath, `.${pathname}`);
  return exact;
}

function tryFile(basePath, pathname) {
  const exact = resolveFilePath(basePath, pathname);
  if (exact.startsWith(basePath)) return exact;
  return null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const decodedPath = decodeURIComponent(url.pathname);
  const requestedPath = resolveFilePath(root, decodedPath);

  if (!requestedPath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  // API requests should be proxied — return 404 to let the backend handle
  if (isApiRequest(url)) {
    res.writeHead(404);
    res.end("API requests should be proxied to the backend");
    return;
  }

  // Try exact file match
  try {
    const info = await stat(requestedPath);
    if (info.isFile()) {
      sendFile(res, requestedPath);
      return;
    }
  } catch {
    // File not found, try alternatives
  }

  // SPA fallback: serve index.html
  sendFile(res, join(root, "index.html"));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`NutriNow static server: http://127.0.0.1:${port}`);
});
