const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const distPath = path.resolve(__dirname, '../dist');
const outputPath = path.resolve(__dirname, '../package.zip');

// Create zip
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`✅ Package created: ${archive.pointer()} bytes`);
  console.log(`📦 Location: ${outputPath}`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
archive.directory(distPath, false);
archive.finalize();
