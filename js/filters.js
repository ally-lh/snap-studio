'use strict';

/**
 * Live filters — applied to the video preview via CSS `filter`, and to the
 * captured photo via canvas `ctx.filter` (same string, so they match).
 */
const FILTERS = [
  { name: 'NORMAL', css: 'none' },
  { name: 'BEAUTY', css: 'brightness(1.07) contrast(0.94) saturate(1.15) blur(0.6px)' },
  { name: 'RETRO', css: 'sepia(0.45) contrast(1.12) saturate(1.25) brightness(1.02)' },
  { name: 'MONO', css: 'grayscale(1) contrast(1.15) brightness(1.05)' },
  { name: 'HANDHELD', css: 'grayscale(1) sepia(1) hue-rotate(55deg) saturate(3.5) contrast(1.05) brightness(0.95)' },
  { name: 'VIVID', css: 'saturate(1.6) contrast(1.12)' },
  // Instagram-style looks, adapted from CSSgram's presets (MIT license).
  { name: 'LOFI', css: 'saturate(1.1) contrast(1.5)' },
  { name: 'REYES', css: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)' },
  { name: 'WALDEN', css: 'brightness(1.1) hue-rotate(-10deg) sepia(0.3) saturate(1.6)' },
  { name: 'NASHVILLE', css: 'sepia(0.2) contrast(1.2) brightness(1.05) saturate(1.2)' },
];
