/**
 * Generates PNG icons required by Chrome's PWA manifest parser.
 * Run once: node scripts/generate-icons.mjs
 */
import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '../public/icons')

mkdirSync(publicDir, { recursive: true })

// MediSync icon SVG — pill + ECG on dark navy background
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="100" fill="#0f172a"/>
  <rect x="140" y="212" width="232" height="88" rx="44" fill="#ffffff"/>
  <line x1="256" y1="212" x2="256" y2="300" stroke="#0f172a" stroke-width="8"/>
  <path d="M140 256 Q140 212 184 212 H256 V300 H184 Q140 300 140 256Z" fill="#38bdf8" opacity="0.85"/>
  <polyline points="128,180 168,180 184,144 200,208 216,160 232,180 256,180 272,180 288,144 304,208 320,160 336,180 384,180"
    fill="none" stroke="#38bdf8" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

// Maskable icon — full-bleed (no rounded corners, OS clips it)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#0f172a"/>
  <rect x="160" y="224" width="192" height="72" rx="36" fill="#ffffff"/>
  <line x1="256" y1="224" x2="256" y2="296" stroke="#0f172a" stroke-width="7"/>
  <path d="M160 260 Q160 224 196 224 H256 V296 H196 Q160 296 160 260Z" fill="#38bdf8" opacity="0.85"/>
  <polyline points="144,196 182,196 196,164 212,220 226,176 242,196 256,196 270,196 284,164 300,220 314,176 330,196 368,196"
    fill="none" stroke="#38bdf8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

const iconBuf     = Buffer.from(iconSvg)
const maskableBuf = Buffer.from(maskableSvg)

const jobs = [
  { input: iconBuf,     size: 192,  file: 'icon-192.png' },
  { input: iconBuf,     size: 512,  file: 'icon-512.png' },
  { input: maskableBuf, size: 512,  file: 'icon-maskable.png' },
  { input: iconBuf,     size: 180,  file: 'apple-touch-icon.png' },
]

for (const { input, size, file } of jobs) {
  const out = resolve(publicDir, file)
  await sharp(input).resize(size, size).png().toFile(out)
  console.log(`✓  ${file}  (${size}×${size})`)
}

console.log('\nDone. Update manifest.json to use .png extensions.')
