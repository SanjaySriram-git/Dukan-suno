import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC = resolve(ROOT, "public");
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "127.0.0.1";
const API_KEY = String(process.env.GNANI_API_KEY || "").trim();
const MAX_BODY = 18 * 1024 * 1024;

function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

async function readBody(req, limit = MAX_BODY) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("File is too large. Keep audio under 18 MB.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function multipartParts(body, contentType) {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!match) throw new Error("Audio upload is missing its multipart boundary.");
  const marker = Buffer.from("--" + (match[1] || match[2]));
  const parts = [];
  let cursor = body.indexOf(marker);
  while (cursor >= 0) {
    let start = cursor + marker.length;
    if (body[start] === 45 && body[start + 1] === 45) break;
    if (body[start] === 13 && body[start + 1] === 10) start += 2;
    const headerEnd = body.indexOf(Buffer.from("\r\n\r\n"), start);
    if (headerEnd < 0) break;
    const next = body.indexOf(marker, headerEnd + 4);
    if (next < 0) break;
    const headerText = body.subarray(start, headerEnd).toString("latin1");
    const disposition = headerText.match(/content-disposition:\s*form-data;([^\r\n]+)/i);
    const nameMatch = disposition && disposition[1].match(/name="([^"]+)"/i);
    const filenameMatch = disposition && disposition[1].match(/filename="([^"]*)"/i);
    const dataEnd = next >= 2 && body[next - 2] === 13 && body[next - 1] === 10 ? next - 2 : next;
    if (nameMatch) {
      parts.push({
        name: nameMatch[1],
        filename: filenameMatch ? filenameMatch[1] : "",
        headers: headerText,
        data: body.subarray(headerEnd + 4, dataEnd)
      });
    }
    cursor = next;
  }
  return parts;
}

function mimeType(path) {
  return ({
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon"
  })[extname(path).toLowerCase()] || "application/octet-stream";
}

async function serveStatic(req, res) {
  const url = new URL(req.url, "http://localhost");
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const file = resolve(PUBLIC, "." + pathname);
  if (file !== PUBLIC && !file.startsWith(PUBLIC + sep)) {
    return json(res, 403, { error: "Not allowed." });
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": mimeType(file),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    });
    res.end(data);
  } catch {
    json(res, 404, { error: "Page not found." });
  }
}

async function transcribe(req, res) {
  if (!API_KEY) return json(res, 503, { error: "GNANI_API_KEY is not set on this server yet." });
  const body = await readBody(req);
  const parts = multipartParts(body, req.headers["content-type"] || "");
  const audio = parts.find((part) => part.name === "audio");
  if (!audio || !audio.data.length) return json(res, 400, { error: "Choose or record an audio clip first." });
  if (audio.data.length > 16 * 1024 * 1024) return json(res, 413, { error: "Audio is too large. Keep it under 16 MB." });

  const form = new FormData();
  const filename = audio.filename || "order.wav";
  const typeMatch = audio.headers.match(/content-type:\s*([^\r\n]+)/i);
  const audioType = typeMatch ? typeMatch[1].trim() : "audio/wav";
  form.append("audio_file", new Blob([audio.data], { type: audioType }), filename);
  form.append("model", "prisma-v3.0");
  form.append("language_code", "indic-auto");
  form.append("format", "transcribe");
  form.append("topic", "A short neighborhood grocery order in Hindi, Hinglish or English, including product names, quantities and delivery instructions.");
  form.append("keyterms", JSON.stringify([
    "atta", "आटा", "Amul butter", "butter", "मक्खन", "milk", "doodh", "दूध",
    "rice", "chawal", "चावल", "sugar", "चीनी", "eggs", "अंडे", "tea", "चाय",
    "Maggi", "oil", "तेल", "dal", "दाल", "delivery", "UPI"
  ]));

  let upstream;
  try {
    upstream = await fetch("https://api.vachana.ai/stt/v3", {
      method: "POST",
      headers: { "X-API-Key-ID": API_KEY },
      body: form,
      signal: AbortSignal.timeout(65000)
    });
  } catch (error) {
    return json(res, 502, { error: "Could not reach Gnani STT. Check the connection and try again.", detail: error.message });
  }
  const text = await upstream.text();
  let payload;
  try { payload = JSON.parse(text); } catch { payload = { message: text.slice(0, 500) }; }
  if (!upstream.ok) {
    const message = payload.detail?.message || payload.message || payload.error?.message || "Gnani could not transcribe this clip.";
    const code = payload.detail?.error_code || payload.error?.type || payload.error_code || "";
    return json(res, upstream.status, { error: message, status: upstream.status, code, gnani: payload });
  }
  return json(res, 200, {
    transcript: payload.transcript || "",
    model: payload.model || "prisma-v3.0",
    detected_language_code: payload.detected_language_code || "",
    request_id: payload.request_id || "",
    processing_time: payload.processing_time ?? null,
    end_to_end_latency: payload.end_to_end_latency ?? null
  });
}

async function speak(req, res) {
  if (!API_KEY) return json(res, 503, { error: "GNANI_API_KEY is not set on this server yet." });
  let input;
  try { input = JSON.parse((await readBody(req, 64 * 1024)).toString("utf8")); }
  catch { return json(res, 400, { error: "That confirmation text could not be read." }); }
  const text = String(input.text || "").trim();
  if (!text || text.length > 700) return json(res, 400, { error: "Confirmation text must be between 1 and 700 characters." });

  let upstream;
  try {
    upstream = await fetch("https://api.vachana.ai/api/v1/tts/inference", {
      method: "POST",
      headers: { "X-API-Key-ID": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model: "timbre-v2.5",
        voice: "Poorvi",
        language: "hi-en",
        speed: 1,
        audio_config: {
          encoding: "linear_pcm",
          container: "wav",
          num_channels: 1,
          sample_rate: 24000,
          sample_width: 2
        }
      }),
      signal: AbortSignal.timeout(65000)
    });
  } catch (error) {
    return json(res, 502, { error: "Could not reach Gnani TTS. Check the connection and try again.", detail: error.message });
  }
  if (!upstream.ok) {
    const detail = await upstream.text();
    return json(res, upstream.status, { error: "Gnani could not generate this voice confirmation.", detail: detail.slice(0, 500) });
  }
  res.writeHead(200, {
    "Content-Type": upstream.headers.get("content-type") || "audio/wav",
    "Cache-Control": "no-store"
  });
  res.end(Buffer.from(await upstream.arrayBuffer()));
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "GET" && url.pathname === "/api/status") {
      return json(res, 200, { apiReady: Boolean(API_KEY), stt: "Prisma v3.0", tts: "Timbre v2.5" });
    }
    if (req.method === "POST" && url.pathname === "/api/transcribe") return await transcribe(req, res);
    if (req.method === "POST" && url.pathname === "/api/speak") return await speak(req, res);
    if (req.method === "GET" || req.method === "HEAD") return await serveStatic(req, res);
    return json(res, 405, { error: "Method not allowed." });
  } catch (error) {
    return json(res, 400, { error: error.message || "The request could not be handled." });
  }
});

server.listen(PORT, HOST, () => {
  console.log("Dukaan Suno is ready at http://" + HOST + ":" + PORT);
  console.log(API_KEY ? "Gnani API key found on this server." : "Sample mode: set GNANI_API_KEY to enable live Gnani calls.");
});
