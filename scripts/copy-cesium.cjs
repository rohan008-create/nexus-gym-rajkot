const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../node_modules/cesium/Build/Cesium');
const destDir = path.resolve(__dirname, '../public/cesium');

const folders = ['Assets', 'ThirdParty', 'Widgets', 'Workers'];

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const files = ['Cesium.js'];

folders.forEach(folder => {
  const src = path.join(srcDir, folder);
  const dest = path.join(destDir, folder);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`Copied ${folder} to public/cesium/${folder}`);
  } else {
    console.warn(`Source folder ${src} does not exist`);
  }
});

files.forEach(file => {
  const src = path.join(srcDir, file);
  const dest = path.join(destDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} to public/cesium/${file}`);
  }
});
console.log('Cesium assets copied successfully.');
