const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const source = path.join(publicDir, 'RentNova.png');
const dest = path.join(publicDir, 'favicon.ico');

function main() {
  if (!fs.existsSync(publicDir)) {
    console.error('Public directory not found:', publicDir);
    process.exit(1);
  }

  if (!fs.existsSync(source)) {
    console.error('Source image not found:', source);
    console.error('Place your RentNova.png image inside the `public/` folder and run `npm run generate-favicon`.');
    process.exit(1);
  }

  try {
    fs.copyFileSync(source, dest);
    console.log('Copied', source, '→', dest);
    console.log('Note: This copies the PNG to favicon.ico. For best compatibility you may want a true .ico file; consider converting with an image tool if needed.');
  } catch (err) {
    console.error('Failed to copy file:', err);
    process.exit(1);
  }
}

main();
