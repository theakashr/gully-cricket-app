const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'public', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const sourceIcon = path.join(iconsDir, 'icon-512x512.png');

if (fs.existsSync(sourceIcon)) {
  sizes.forEach(size => {
    const dest = path.join(iconsDir, `icon-${size}x${size}.png`);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(sourceIcon, dest);
      console.log(`Created icon-${size}x${size}.png`);
    } else {
      console.log(`icon-${size}x${size}.png already exists`);
    }
  });

  // Create maskable icons
  [192, 512].forEach(size => {
    const dest = path.join(iconsDir, `icon-maskable-${size}x${size}.png`);
    fs.copyFileSync(sourceIcon, dest);
    console.log(`Created icon-maskable-${size}x${size}.png`);
  });

  console.log('\nAll icons created successfully!');
} else {
  console.error('Source icon not found at:', sourceIcon);
}
