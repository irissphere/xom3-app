#!/usr/bin/env node
import QRCode from 'qrcode';
import sharp from 'sharp';
import { writeFileSync, readFileSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const logoPath = join(publicDir, 'spacebaddie-logo-full.png');
const logoDarkPath = join(publicDir, 'spacebaddie-logo-dark.png');

const URL = 'https://spacebaddie.com';
const SIZE = 800;
const DOT_RADIUS_RATIO = 0.38;
const MODULE_GAP = 0.15;

// ── 1. Get the raw QR matrix ────────────────────────────────────
const qrData = QRCode.create(URL, { errorCorrectionLevel: 'H' });
const modules = qrData.modules;
const moduleCount = modules.size;
const moduleData = modules.data;

function isSet(row, col) {
  if (row < 0 || col < 0 || row >= moduleCount || col >= moduleCount) return false;
  return moduleData[row * moduleCount + col] === 1;
}

function isFinderPattern(row, col) {
  return (
    (row < 7 && col < 7) ||
    (row < 7 && col >= moduleCount - 7) ||
    (row >= moduleCount - 7 && col < 7)
  );
}

// ── 2. Build SVG for one QR variant ─────────────────────────────
function buildQrSvg({ bgColor, dotColor, finderColor, finderInnerColor, dotStyle }) {
  const cellSize = SIZE / (moduleCount + 4);
  const offset = cellSize * 2;

  let svgParts = [];
  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">`);
  svgParts.push(`<rect width="${SIZE}" height="${SIZE}" fill="${bgColor}" rx="20" ry="20"/>`);

  // Draw finder patterns (the 3 big corner squares) with rounded style
  const finderPositions = [
    [0, 0],
    [0, moduleCount - 7],
    [moduleCount - 7, 0],
  ];

  for (const [fr, fc] of finderPositions) {
    const x = offset + fc * cellSize;
    const y = offset + fr * cellSize;
    const s7 = cellSize * 7;
    const s5 = cellSize * 5;
    const s3 = cellSize * 3;
    const r = cellSize * 0.7;

    // Outer ring
    svgParts.push(`<rect x="${x}" y="${y}" width="${s7}" height="${s7}" rx="${r}" ry="${r}" fill="${finderColor}"/>`);
    // White/bg gap
    svgParts.push(`<rect x="${x + cellSize}" y="${y + cellSize}" width="${s5}" height="${s5}" rx="${r * 0.6}" ry="${r * 0.6}" fill="${bgColor}"/>`);
    // Inner dot
    svgParts.push(`<rect x="${x + cellSize * 2}" y="${y + cellSize * 2}" width="${s3}" height="${s3}" rx="${r * 0.5}" ry="${r * 0.5}" fill="${finderInnerColor}"/>`);
  }

  // Draw data modules (skip finder pattern areas)
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (!isSet(row, col)) continue;
      if (isFinderPattern(row, col)) continue;

      const cx = offset + col * cellSize + cellSize / 2;
      const cy = offset + row * cellSize + cellSize / 2;

      if (dotStyle === 'circle') {
        const r = cellSize * DOT_RADIUS_RATIO;
        svgParts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${dotColor}"/>`);
      } else if (dotStyle === 'roundedSquare') {
        const s = cellSize * (1 - MODULE_GAP);
        const rr = s * 0.3;
        svgParts.push(`<rect x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" rx="${rr}" ry="${rr}" fill="${dotColor}"/>`);
      } else {
        // diamond
        const h = cellSize * 0.42;
        svgParts.push(`<polygon points="${cx},${cy - h} ${cx + h},${cy} ${cx},${cy + h} ${cx - h},${cy}" fill="${dotColor}"/>`);
      }
    }
  }

  svgParts.push('</svg>');
  return svgParts.join('\n');
}

// ── 3. Prepare logo overlay ─────────────────────────────────────
async function makeLogoOverlay(bgColor, borderColor, isDark) {
  const padSize = Math.floor(SIZE * 0.28);
  const logoBox = Math.floor(padSize * 0.82);
  const borderW = 4;
  const half = padSize / 2;

  const usePath = isDark ? logoDarkPath : logoPath;
  const logoBuffer = readFileSync(usePath);

  // Resize logo, keeping aspect, transparent fill
  const logoResized = await sharp(logoBuffer)
    .resize(logoBox, logoBox, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Create circular mask
  const circleMask = Buffer.from(
    `<svg width="${padSize}" height="${padSize}"><circle cx="${half}" cy="${half}" r="${half}" fill="white"/></svg>`
  );
  const maskPng = await sharp(circleMask).png().toBuffer();

  // Build background circle with border ring
  const bgSvg = Buffer.from(
    `<svg width="${padSize}" height="${padSize}">
       <circle cx="${half}" cy="${half}" r="${half}" fill="${borderColor}"/>
       <circle cx="${half}" cy="${half}" r="${half - borderW}" fill="${bgColor}"/>
     </svg>`
  );
  const bgPng = await sharp(bgSvg).png().toBuffer();

  // Composite logo onto bg circle
  const logoMeta = await sharp(logoResized).metadata();
  const logoW = logoMeta.width ?? logoBox;
  const logoH = logoMeta.height ?? logoBox;

  // For the dark/color version, flatten logo onto dark bg to kill white pixels
  let logoToUse = logoResized;
  if (isDark) {
    // Parse bg hex to RGB
    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);
    logoToUse = await sharp(logoResized)
      .flatten({ background: { r, g, b } })
      .png()
      .toBuffer();
  }

  const composited = await sharp(bgPng)
    .composite([{
      input: logoToUse,
      left: Math.floor((padSize - logoW) / 2),
      top: Math.floor((padSize - logoH) / 2),
    }])
    .png()
    .toBuffer();

  // Apply circular mask (clip to circle)
  const overlay = await sharp(composited)
    .composite([{ input: maskPng, blend: 'dest-in' }])
    .png()
    .toBuffer();

  return { overlay, padSize };
}

// ── 4. Render a full QR code PNG ────────────────────────────────
async function renderQr(svgString, logoBg, logoBorder, isDark, outFile) {
  const svgBuffer = Buffer.from(svgString);
  const qrPng = await sharp(svgBuffer).resize(SIZE, SIZE).png().toBuffer();

  const { overlay, padSize } = await makeLogoOverlay(logoBg, logoBorder, isDark);
  const left = Math.floor((SIZE - padSize) / 2);
  const top = Math.floor((SIZE - padSize) / 2);

  const final = await sharp(qrPng)
    .composite([{ input: overlay, left, top }])
    .png()
    .toBuffer();

  writeFileSync(outFile, final);
  console.log(`  ✓ ${outFile}`);
}

// ── 5. Generate both versions ───────────────────────────────────
console.log('\n🚀 Generating SpaceBaddie QR codes...\n');

// COLOR VERSION - dark space theme with pink/magenta accents
const colorSvg = buildQrSvg({
  bgColor: '#0c0e1a',
  dotColor: '#e23d80',
  finderColor: '#e23d80',
  finderInnerColor: '#ff6bab',
  dotStyle: 'circle',
});

await renderQr(
  colorSvg,
  '#0c0e1a',
  '#e23d80',
  true,
  join(publicDir, 'spacebaddie-qr-color.png')
);

// BLACK & WHITE VERSION - clean, high contrast
const bwSvg = buildQrSvg({
  bgColor: '#ffffff',
  dotColor: '#111111',
  finderColor: '#000000',
  finderInnerColor: '#000000',
  dotStyle: 'roundedSquare',
});

await renderQr(
  bwSvg,
  '#ffffff',
  '#000000',
  false,
  join(publicDir, 'spacebaddie-qr-bw.png')
);

console.log('\n✅ Done! Both QR codes link to https://spacebaddie.com\n');
