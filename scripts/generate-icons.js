/**
 * Generates icon-192.png and icon-512.png for the Outlet FC PWA.
 * Requires the 'canvas' npm package. Install temporarily with:
 *   npm install canvas --save-dev
 * Then run:
 *   node scripts/generate-icons.js
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const BG = '#0A0F1E';
const MINT = '#00FF9D';
const WHITE = '#FFFFFF';

function drawIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const cx = size / 2;
    const cy = size / 2;

    // --- Background ---
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, size, size);

    // --- Subtle radial glow behind ball ---
    const glow = ctx.createRadialGradient(cx, cy + size * 0.08, 0, cx, cy + size * 0.08, size * 0.42);
    glow.addColorStop(0, 'rgba(0,255,157,0.12)');
    glow.addColorStop(1, 'rgba(0,255,157,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // --- Soccer Ball ---
    const ballR = size * 0.28;
    const ballCY = cy + size * 0.1;

    // Ball base circle
    ctx.beginPath();
    ctx.arc(cx, ballCY, ballR, 0, Math.PI * 2);
    ctx.fillStyle = BG;
    ctx.fill();
    ctx.strokeStyle = MINT;
    ctx.lineWidth = size * 0.022;
    ctx.stroke();

    // Pentagon center
    const pentR = ballR * 0.32;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const x = cx + pentR * Math.cos(angle);
        const y = ballCY + pentR * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = MINT;
    ctx.fill();

    // Hexagon stitching lines (5 lines from pentagon vertices to ball edge)
    ctx.strokeStyle = MINT;
    ctx.lineWidth = size * 0.018;
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const x1 = cx + pentR * Math.cos(angle);
        const y1 = ballCY + pentR * Math.sin(angle);
        const x2 = cx + ballR * 0.82 * Math.cos(angle);
        const y2 = ballCY + ballR * 0.82 * Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // --- "OFC" Text ---
    const fontSize = size * 0.22;
    ctx.font = `900 ${fontSize}px Arial Black, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = WHITE;
    const textY = cy - size * 0.27;
    ctx.fillText('OFC', cx, textY);

    // --- Mint accent line under text ---
    const lineW = size * 0.3;
    const lineH = size * 0.018;
    const lineY = textY + fontSize * 0.55;
    ctx.fillStyle = MINT;
    ctx.fillRect(cx - lineW / 2, lineY, lineW, lineH);

    return canvas;
}

// Ensure output directory
const outDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

[192, 512].forEach(size => {
    const canvas = drawIcon(size);
    const outPath = path.join(outDir, `icon-${size}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outPath, buffer);
    console.log(`✅  Generated ${outPath}`);
});
