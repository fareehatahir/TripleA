#!/usr/bin/env node
// Builds web-ready brand assets from public/brand/logo.png (your original artwork):
//   public/brand/logo-wide.webp  header/footer logo, cropped to the artwork and ~640px wide
//   app/icon.png, app/apple-icon.png   favicon + iOS icon
//   app/opengraph-image.png, app/twitter-image.png   1200×630 social preview
// Re-run after replacing logo.png:  node scripts/make-brand-assets.mjs
import sharp from "sharp";
import { copyFileSync } from "node:fs";

const src = "public/brand/logo.png";
const meta = await sharp(src).metadata();
const W = meta.width, H = meta.height;
// The artwork has a very slightly off-white background; sample it so backgrounds blend with no visible box.
const px = await sharp(src).extract({ left: 4, top: 4, width: 1, height: 1 }).raw().toBuffer();
const WHITE = { r: px[0], g: px[1], b: px[2], alpha: 1 };

// The artwork (car + AAA + wordmark) sits between ~16% and ~72% of the square canvas.
const top = Math.round(H * 0.16), height = Math.round(W * 720 / 1254);
const INSET = 12; // the source has a faint 1-2px edge line on its outer border; trim it
const wide = sharp(src).extract({ left: INSET, top: top + INSET, width: W - 2 * INSET, height: Math.min(height, H - top) - 2 * INSET });
await wide.clone().resize({ width: 640 }).webp({ quality: 88 }).toFile("public/brand/logo-wide.webp");

// Icon: tight square on the red centre "A" of the AAA mark (stays legible at 16px)
const icon = sharp(src).extract({ left: 432, top: 398, width: 296, height: 296 }).flatten({ background: WHITE });
await icon.clone().resize(256, 256).png({ compressionLevel: 9 }).toFile("app/icon.png");
await icon.clone().resize(180, 180).png({ compressionLevel: 9 }).toFile("app/apple-icon.png");

// Social preview: logo on white with a brand bar
const logo = await wide.clone().resize({ height: 420 }).png().toBuffer();
const bar = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="14"><rect width="1200" height="14" fill="#C8102E"/></svg>`);
await sharp({ create: { width: 1200, height: 630, channels: 4, background: WHITE } })
  .composite([{ input: await sharp(logo).flatten({ background: WHITE }).png().toBuffer(), gravity: "center" }, { input: bar, top: 616, left: 0 }])
  .png({ compressionLevel: 9 }).toFile("app/opengraph-image.png");
copyFileSync("app/opengraph-image.png", "app/twitter-image.png");
console.log("brand assets written");
