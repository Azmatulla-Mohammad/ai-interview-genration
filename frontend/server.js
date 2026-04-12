import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT || 3000);
const DEFAULT_API_PROXY_TARGET = "http://127.0.0.1:8000";
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

function normalizeApiProxyTarget(rawValue) {
  if (!rawValue) {
    return new URL(DEFAULT_API_PROXY_TARGET);
  }

  try {
    const url = new URL(rawValue);
    if (url.pathname === "/api" || url.pathname === "/api/") {
      url.pathname = "/";
    }
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return new URL(DEFAULT_API_PROXY_TARGET);
  }
}

const API_PROXY_TARGET = normalizeApiProxyTarget(
  process.env.API_PROXY_TARGET || process.env.VITE_API_BASE_URL,
);
const API_PROXY_TRANSPORT = API_PROXY_TARGET.protocol === "https:" ? https : http;
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

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

function buildProxyHeaders(request) {
  const headers = {};

  Object.entries(request.headers).forEach(([name, value]) => {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase()) && value !== undefined) {
      headers[name] = value;
    }
  });

  headers.host = API_PROXY_TARGET.host;
  headers["x-forwarded-host"] = request.headers.host || "";
  headers["x-forwarded-proto"] = request.socket.encrypted ? "https" : "http";
  headers["x-forwarded-for"] = request.socket.remoteAddress || "";

  return headers;
}

function proxyApiRequest(request, response) {
  const targetUrl = new URL(request.url || "/", API_PROXY_TARGET);
  const proxyRequest = API_PROXY_TRANSPORT.request(
    targetUrl,
    {
      method: request.method,
      headers: buildProxyHeaders(request),
    },
    (proxyResponse) => {
      response.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
      proxyResponse.pipe(response);
    },
  );

  proxyRequest.on("error", (error) => {
    sendJson(response, 502, {
      detail: `Cannot reach the backend API at ${API_PROXY_TARGET.origin}. Start the backend server or set API_PROXY_TARGET to the correct backend origin.`,
      error: error.message,
    });
  });

  request.pipe(proxyRequest);
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
    proxyApiRequest(request, response);
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

server.listen(PORT, HOST, () => {
  console.log(`Frontend server listening on http://${HOST}:${PORT}`);
});
