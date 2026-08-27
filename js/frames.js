'use strict';

/**
 * Frames! Drawn in a 720 × 960 (3:4 portrait) coordinate space — the same
 * shape as the saved photo, so the live overlay and the download always match.
 *
 * Two kinds of entries in the FRAMES list at the bottom:
 *
 *   { name: 'BATTLE', draw: drawBattleFrame }   — drawn in code
 *   { name: 'PIKA', src: 'frames/pika.png' }    — transparent image overlay
 *
 * ✏️ TO ADD YOUR FRIEND'S ART:
 * 1. Export a transparent PNG in 3:4 portrait — 1200 × 1600 px recommended.
 *    Anything opaque covers the photo; the middle should stay transparent.
 * 2. Drop the file into the frames/ folder.
 * 3. Add { name: 'PIKA', src: 'frames/pika.png' } below. Names show as chips
 *    in the FRAME menu — keep them short and UPPERCASE for the retro look.
 * 4. For offline use: add 'frames/pika.png' to CORE_ASSETS in sw.js and bump
 *    CACHE_NAME there.
 */
const FRAME_W = 720;
const FRAME_H = 960;

// `sprite` is the little pixel sprite shown popping out of the pokéball in
// the FRAME menu — the frame itself still comes from `src`.
const FRAMES = [
  { name: 'NONE' },
  { name: 'GENGAR', src: 'frames/gengar.png', sprite: 'sprites/gengar.png' },
  { name: 'SPRIGATITO', src: 'frames/sprigatito.png', sprite: 'sprites/sprigatito.png' },
  { name: 'OSHAWOTT', src: 'frames/oshawott.png', sprite: 'sprites/oshawott.png' },
];

const FRAME_NAMES = FRAMES.map((frame) => frame.name);
