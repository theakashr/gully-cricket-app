const sharp = require('sharp');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const img = 'public/11shots-logo.png';

Promise.all([
  ...sizes.map(s => sharp(img).resize(s, s).toFile(`public/icons/icon-${s}x${s}.png`)),
  sharp(img).resize(192, 192).toFile(`public/icons/icon-maskable-192x192.png`),
  sharp(img).resize(512, 512).toFile(`public/icons/icon-maskable-512x512.png`)
]).then(() => console.log('Icons generated!')).catch(e => console.error(e));
