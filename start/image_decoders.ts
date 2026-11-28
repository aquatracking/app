/*
|--------------------------------------------------------------------------
| Image decoders
|--------------------------------------------------------------------------
|
| sharp only decodes the formats accepted for an image (JPEG, PNG, WebP,
| docs/features/04-vivariums.md). The other loaders of libvips (SVG with
| librsvg, GIF, TIFF, HEIF…) are blocked, so that no content sent by a
| user reaches their parsers.
|
*/

import sharp from 'sharp'

sharp.block({ operation: ['VipsForeignLoad'] })
sharp.unblock({ operation: ['VipsForeignLoadJpeg', 'VipsForeignLoadPng', 'VipsForeignLoadWebp'] })
