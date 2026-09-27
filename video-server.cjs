const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(".");
const videoPath = path.join(root, "activity-reference.mp4");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mp4": "video/mp4",
};

function sendStatic(request, response) {
  const requestedPath = request.url === "/" ? "/index.html" : request.url;
  const filePath = path.normalize(path.join(root, requestedPath));

  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const stats = fs.statSync(filePath);
  const contentType = mimeTypes[path.extname(filePath)] || "application/octet-stream";
  const range = request.headers.range;

  if (path.extname(filePath) === ".mp4" && range) {
    const [startValue, endValue] = range.replace("bytes=", "").split("-");
    const start = Number.parseInt(startValue, 10);
    const end = endValue ? Number.parseInt(endValue, 10) : stats.size - 1;
    response.writeHead(206, {
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Range": `bytes ${start}-${end}/${stats.size}`,
      "Content-Type": contentType,
    });
    fs.createReadStream(filePath, { start, end }).pipe(response);
    return;
  }

  response.writeHead(200, {
    "Accept-Ranges": "bytes",
    "Content-Length": stats.size,
    "Content-Type": contentType,
  });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(sendStatic);

server.listen(4390, "127.0.0.1", () => {
  console.log("site preview ready at http://127.0.0.1:4390/");
});
