/**
 * ─────────────────────────────────────────────────────────────────────────────
 * IMAGE CONFIGURATION
 * ─────────────────────────────────────────────────────────────────────────────
 * This is the single file to edit when swapping placeholder images for a
 * client's real photos. Astro will automatically optimize every local image
 * at build time (WebP/AVIF conversion, srcset generation, CLS-safe dimensions).
 *
 * HOW TO ADD YOUR OWN IMAGES
 * ──────────────────────────
 * 1. Drop your image file into the correct folder under src/assets/images/
 * 2. Uncomment the matching import below and update the filename
 * 3. Export it — the component picks it up automatically
 *
 * Supported formats: .jpg  .jpeg  .png  .webp  .avif
 *
 * FOLDER STRUCTURE
 * ────────────────
 *   src/assets/images/
 *     logo/      ← the brand logo used in the site header
 *     hero/      ← one image used in the homepage Hero section
 *     about/     ← one image used in the About section and About page
 *     gallery/   ← all project photos (drop any number of files here)
 *
 * Until you add local files the components fall back to placeholder URLs
 * served from Unsplash. Those are fine for development/demo but are NOT
 * optimized by Astro. Swap them for local files before going live.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ImageMetadata } from 'astro';

// ── Logo ──────────────────────────────────────────────────────────────────
// The brand logo in the site header. Transparent PNG, 618 × 143 (4.32:1),
// black artwork, so it suits the light header only. The dark footer keeps its
// text wordmark by choice — that is settled, not pending. Do not reuse this
// file there: black artwork on the dark footer would be close to invisible.
//
import logoImageSrc from '../assets/images/logo/pittman-industrial-marketing.png';
export const logoImage: ImageMetadata = logoImageSrc;

// ── Hero ──────────────────────────────────────────────────────────────────────
// Recommended: landscape image, at least 1600 × 1200 px
//
// To use your own:
//   1. Drop your file into src/assets/images/hero/
//   2. Uncomment and update the line below
//   3. Replace the heroImage export at the bottom of this section
//
import heroImageSrc from '../assets/images/hero/5-axis-machining.jpg';
export const heroImage: ImageMetadata | undefined = heroImageSrc;

// ── About ─────────────────────────────────────────────────────────────────────
// Recommended: portrait or square image of your team/job site, at least 900 × 700 px
//
// To use your own:
//   1. Drop your file into src/assets/images/about/
//   2. Uncomment and update the line below
//   3. Replace the aboutImage export at the bottom of this section
//
// import aboutImage from '../assets/images/about/team.jpg';
export const aboutImage: ImageMetadata | undefined = undefined;

// ── Gallery — auto-discovered ─────────────────────────────────────────────────
// Drop any number of image files into src/assets/images/gallery/ and they will
// appear in the gallery automatically — no code changes needed.
//
// The file name becomes the alt text:
//   kitchen-remodel.jpg    → "Kitchen Remodel"
//   deck-installation.jpg  → "Deck Installation"
//
// Recommended: landscape images, at least 800 × 600 px each.
// Aim for consistent proportions (4:3 works best with the gallery grid).

export interface GalleryImage {
  src: ImageMetadata | string;
  alt: string;
}

const discovered = Object.entries(
  import.meta.glob<{ default: ImageMetadata }>(
    '../assets/images/gallery/*.{jpg,jpeg,png,webp,avif}',
    { eager: true },
  ),
).map(([path, mod]): GalleryImage => ({
  src: mod.default,
  alt: path
    .split('/').pop()!
    .replace(/\.[^.]+$/, '')        // strip extension
    .replace(/[-_]/g, ' ')          // hyphens/underscores → spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()), // Title Case
}));

// No stock placeholders: the gallery renders only real project photos.
// Drop files into src/assets/images/gallery/ and they appear automatically;
// while the folder is empty the Gallery section hides itself entirely.
export const galleryImages: GalleryImage[] = discovered;
