import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 3000);
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "http://127.0.0.1:8000";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, "dist");
const INDEX_FILE = path.join(DIST_DIR, "index.html");

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function contentTypeFor(filePath) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

function stripHopByHopHeaders(headers) {
  const nextHeaders = new Headers(headers);
  [
    "connection",
    "content-length",
    "host",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
  ].forEach((header) => nextHeaders.delete(header));
  return nextHeaders;
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

async function proxyApiRequest(request, response) {
  const targetUrl = new URL(request.url, BACKEND_ORIGIN);
  const headers = stripHopByHopHeaders(request.headers);
  headers.set("x-forwarded-host", request.headers.host || "");
  headers.set("x-forwarded-proto", "https");

  const init = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (!["GET", "HEAD"].includes(request.method || "GET")) {
    init.body = await readRequestBody(request);
  }

  let upstream;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (error) {
    sendJson(response, 502, {
      detail: "Cannot reach the backend service from the frontend proxy.",
      backend_origin: BACKEND_ORIGIN,
    });
    return;
  }

  const responseHeaders = {};
  upstream.headers.forEach((value, key) => {
    if (!["content-length", "connection", "transfer-encoding"].includes(key.toLowerCase())) {
      responseHeaders[key] = value;
    }
  });

  response.writeHead(upstream.status, responseHeaders);
  const body = Buffer.from(await upstream.arrayBuffer());
  response.end(body);
}

function safeStaticPath(requestPath) {
  const normalizedPath = path.normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[\\/])+/, "");
  const trimmedPath = normalizedPath.replace(/^[/\\]+/, "");
  return path.join(DIST_DIR, trimmedPath);
}

async function sendStaticFile(filePath, response) {
  if (!existsSync(filePath)) {
    return false;
  }

  const fileStats = await stat(filePath);
  if (!fileStats.isFile()) {
    return false;
  }

  response.writeHead(200, {
    "Content-Type": contentTypeFor(filePath),
    "Content-Length": fileStats.size,
    "Cache-Control": filePath.endsWith(".html") ? "no-cache" : "public, max-age=31536000, immutable",
  });
  createReadStream(filePath).pipe(response);
  return true;
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (requestUrl.pathname.startsWith("/api")) {
    await proxyApiRequest(request, response);
    return;
  }

  const requestedFile = safeStaticPath(requestUrl.pathname);
  if (await sendStaticFile(requestedFile, response)) {
    return;
  }

  if (await sendStaticFile(INDEX_FILE, response)) {
    return;
  }

  sendJson(response, 500, {
    detail: "Frontend build output is missing. Run `npm run build` before starting the server.",
  });
});

server.listen(PORT, () => {
  console.log(`Frontend server listening on http://0.0.0.0:${PORT}`);
  console.log(`Proxying /api requests to ${BACKEND_ORIGIN}`);
});
