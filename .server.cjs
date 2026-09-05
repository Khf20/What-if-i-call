// Static server with proper HTTP Range support (required for audio/video seeking).
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = 8741;
const mime = {
	".html": "text/html; charset=utf-8",
	".mp3": "audio/mpeg",
	".mp4": "video/mp4",
	".png": "image/png",
	".ico": "image/x-icon",
};

http.createServer((req, res) => {
	const rel = decodeURIComponent(
		req.url === "/" ? "index.html" : req.url.split("?")[0],
	);
	const file = path.join(
		ROOT,
		path.normalize(rel).replace(/^(\.\.[/\\])+/, ""),
	);
	let stat;
	try {
		stat = fs.statSync(file);
	} catch {
		res.writeHead(404);
		res.end("not found");
		return;
	}
	const type =
		mime[path.extname(file).toLowerCase()] || "application/octet-stream";
	const range = req.headers.range;
	if (range) {
		const m = /^bytes=(\d*)-(\d*)$/.exec(range);
		let start = m && m[1] ? parseInt(m[1], 10) : 0;
		let end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
		if (isNaN(start) || start > end || end >= stat.size) {
			res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
			res.end();
			return;
		}
		res.writeHead(206, {
			"Content-Type": type,
			"Accept-Ranges": "bytes",
			"Content-Range": `bytes ${start}-${end}/${stat.size}`,
			"Content-Length": end - start + 1,
		});
		fs.createReadStream(file, { start, end }).pipe(res);
	} else {
		res.writeHead(200, {
			"Content-Type": type,
			"Accept-Ranges": "bytes",
			"Content-Length": stat.size,
		});
		fs.createReadStream(file).pipe(res);
	}
}).listen(PORT, () => console.log("up on " + PORT));
