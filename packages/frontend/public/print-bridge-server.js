const http = require('http');
const net = require('net');
const zlib = require('zlib');

const PORT = 3001;
const HOST = '127.0.0.1';
const VERSION = '2026.02.21.0030';

// ─── PNG to ESC/POS raster converter ────────────────────────
/**
 * Minimal PNG parser: extracts raw pixel data from a PNG buffer.
 * Supports 8-bit grayscale, RGB, RGBA (most common for logos).
 * No external dependencies.
 */
function parsePNG(pngBuffer) {
  // Verify PNG signature
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (pngBuffer[i] !== sig[i]) throw new Error('Not a valid PNG');
  }

  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idatChunks = [];
  let offset = 8;

  while (offset < pngBuffer.length) {
    const len = pngBuffer.readUInt32BE(offset);
    const type = pngBuffer.slice(offset + 4, offset + 8).toString('ascii');
    const data = pngBuffer.slice(offset + 8, offset + 8 + len);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + len; // 4 len + 4 type + data + 4 crc
  }

  if (width === 0 || height === 0) throw new Error('Invalid PNG: no IHDR');

  // Decompress IDAT
  const compressed = Buffer.concat(idatChunks);
  const raw = zlib.inflateSync(compressed);

  // Bytes per pixel
  let bpp;
  switch (colorType) {
    case 0: bpp = 1; break;           // Grayscale
    case 2: bpp = 3; break;           // RGB
    case 4: bpp = 2; break;           // Grayscale + Alpha
    case 6: bpp = 4; break;           // RGBA
    default: throw new Error('Unsupported PNG color type: ' + colorType);
  }

  // Unfilter scanlines
  const stride = width * bpp;
  const pixels = Buffer.alloc(height * stride);
  let ri = 0; // raw index

  function paethPredictor(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  }

  for (let y = 0; y < height; y++) {
    const filterType = raw[ri++];
    const rowStart = y * stride;
    const prevRowStart = (y - 1) * stride;

    for (let x = 0; x < stride; x++) {
      const rawByte = raw[ri++];
      let a = x >= bpp ? pixels[rowStart + x - bpp] : 0;
      let b = y > 0 ? pixels[prevRowStart + x] : 0;
      let c = (x >= bpp && y > 0) ? pixels[prevRowStart + x - bpp] : 0;

      let val;
      switch (filterType) {
        case 0: val = rawByte; break;
        case 1: val = (rawByte + a) & 0xFF; break;
        case 2: val = (rawByte + b) & 0xFF; break;
        case 3: val = (rawByte + Math.floor((a + b) / 2)) & 0xFF; break;
        case 4: val = (rawByte + paethPredictor(a, b, c)) & 0xFF; break;
        default: val = rawByte;
      }
      pixels[rowStart + x] = val;
    }
  }

  return { width, height, bpp, colorType, pixels };
}

/**
 * Convert parsed PNG pixels to 1-bit monochrome raster data.
 * White background, black foreground (threshold-based).
 */
function toMonochrome(png) {
  const { width, height, bpp, colorType, pixels } = png;
  const bytesPerRow = Math.ceil(width / 8);
  const raster = Buffer.alloc(bytesPerRow * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pi = (y * width + x) * bpp;
      let luminance;
      let alpha = 255;

      switch (colorType) {
        case 0: // Grayscale
          luminance = pixels[pi];
          break;
        case 2: // RGB
          luminance = 0.299 * pixels[pi] + 0.587 * pixels[pi + 1] + 0.114 * pixels[pi + 2];
          break;
        case 4: // Grayscale + Alpha
          luminance = pixels[pi];
          alpha = pixels[pi + 1];
          break;
        case 6: // RGBA
          luminance = 0.299 * pixels[pi] + 0.587 * pixels[pi + 1] + 0.114 * pixels[pi + 2];
          alpha = pixels[pi + 3];
          break;
        default:
          luminance = 255;
      }

      // Transparent pixels = white (no print)
      if (alpha < 128) luminance = 255;

      // Threshold: dark pixels become black (bit = 1)
      const isDark = luminance < 128;
      if (isDark) {
        const byteIdx = y * bytesPerRow + Math.floor(x / 8);
        const bitIdx = 7 - (x % 8);
        raster[byteIdx] |= (1 << bitIdx);
      }
    }
  }

  return { raster, bytesPerRow, width, height };
}

/**
 * Generate ESC/POS raster command (GS v 0) from monochrome data.
 */
function toEscPosRaster(mono) {
  const { raster, bytesPerRow, height } = mono;
  // GS v 0 m xL xH yL yH [data]
  // m=0: normal density
  const xL = bytesPerRow & 0xFF;
  const xH = (bytesPerRow >> 8) & 0xFF;
  const yL = height & 0xFF;
  const yH = (height >> 8) & 0xFF;

  const header = Buffer.from([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
  return Buffer.concat([header, raster]);
}

/**
 * Process a buffer: find __BITMAP_B64:...:END__ markers and replace
 * them with ESC/POS raster commands for the embedded PNG image.
 */
function processBuffer(buffer) {
  const MARKER_START = '__BITMAP_B64:';
  const MARKER_END = ':END__';

  const str = buffer.toString('binary');
  const startIdx = str.indexOf(MARKER_START);
  if (startIdx === -1) return buffer; // No markers, return as-is

  const b64Start = startIdx + MARKER_START.length;
  const endIdx = str.indexOf(MARKER_END, b64Start);
  if (endIdx === -1) return buffer; // Malformed marker

  const b64Data = str.substring(b64Start, endIdx);
  const markerEnd = endIdx + MARKER_END.length;

  try {
    const pngBuffer = Buffer.from(b64Data, 'base64');
    const png = parsePNG(pngBuffer);
    const mono = toMonochrome(png);
    const rasterCmd = toEscPosRaster(mono);

    // Reconstruct: before marker + raster + after marker
    const before = buffer.slice(0, startIdx);
    const after = buffer.slice(markerEnd);

    // Recursively process remaining buffer for additional markers
    const processed = Buffer.concat([before, rasterCmd, processBuffer(after)]);
    return processed;
  } catch (err) {
    console.error('Bitmap processing error:', err.message);
    // On error, strip the marker and continue (fallback)
    const before = buffer.slice(0, startIdx);
    const after = buffer.slice(markerEnd);
    return Buffer.concat([before, after]);
  }
}

// ─── HTTP Server ────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', version: VERSION, bitmap: true }));
    return;
  }

  if (req.method === 'POST' && req.url === '/print') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { ip, port, data } = JSON.parse(body);
        let buffer = Buffer.from(data, 'base64');

        // Process bitmap markers before sending to printer
        buffer = processBuffer(buffer);

        const socket = new net.Socket();
        const timeout = setTimeout(() => {
          socket.destroy();
          res.writeHead(504, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Timeout: la impresora no respondio en 5 segundos' }));
        }, 5000);

        socket.connect(port || 9100, ip, () => {
          socket.write(buffer, () => {
            clearTimeout(timeout);
            socket.end();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          });
        });

        socket.on('error', (err) => {
          clearTimeout(timeout);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: `No se pudo conectar a ${ip}:${port || 9100} - ${err.message}`
          }));
        });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Datos invalidos: ' + err.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/test') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { ip, port } = JSON.parse(body);
        const start = Date.now();
        const socket = new net.Socket();
        const timeout = setTimeout(() => {
          socket.destroy();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ reachable: false, error: 'Timeout' }));
        }, 3000);

        socket.connect(port || 9100, ip, () => {
          clearTimeout(timeout);
          const latency = Date.now() - start;
          socket.end();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ reachable: true, latencyMs: latency }));
        });

        socket.on('error', (err) => {
          clearTimeout(timeout);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ reachable: false, error: err.message }));
        });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reachable: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, HOST, () => {
  console.log(`Hoppiness Print Bridge v${VERSION}`);
  console.log(`Escuchando en http://${HOST}:${PORT}`);
  console.log(`Soporte bitmap: SI`);
  console.log(`Listo para imprimir.`);
});
