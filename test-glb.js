const fs = require('fs');
const files = fs.readdirSync('public/map-data/buildings').filter(f => f.endsWith('.glb'));
if (files.length > 0) {
  const buf = fs.readFileSync('public/map-data/buildings/' + files[0]);
  // glTF binary format has a 12-byte header, then chunks.
  // Chunk 0 is the JSON chunk.
  const magic = buf.readUInt32LE(0);
  const version = buf.readUInt32LE(4);
  const length = buf.readUInt32LE(8);
  const chunk0Len = buf.readUInt32LE(12);
  const chunk0Type = buf.readUInt32LE(16);
  if (magic === 0x46546C67 && chunk0Type === 0x4E4F534A) {
    const jsonStr = buf.toString('utf8', 20, 20 + chunk0Len);
    console.log(JSON.stringify(JSON.parse(jsonStr), null, 2).substring(0, 1000));
  }
}
