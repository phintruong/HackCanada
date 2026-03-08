/**
 * Generates 3 mock hospital GLB files for the government blueprint picker.
 * Writes minimal glTF 2.0 binary (GLB) directly — no Three.js GLTFExporter needed.
 * Run once: node scripts/generate-mock-blueprints.mjs
 */
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'map-data', 'blueprints');

// Build a box mesh as glTF accessors + bufferView
function boxGeometry(w, h, d) {
  const hw = w / 2, hh = h / 2, hd = d / 2;
  // 8 unique corners, 36 indices (12 triangles)
  const positions = new Float32Array([
    -hw,-hh, hd,  hw,-hh, hd,  hw, hh, hd, -hw, hh, hd,  // front
    -hw,-hh,-hd, -hw, hh,-hd,  hw, hh,-hd,  hw,-hh,-hd,  // back
    -hw, hh,-hd, -hw, hh, hd,  hw, hh, hd,  hw, hh,-hd,  // top
    -hw,-hh,-hd,  hw,-hh,-hd,  hw,-hh, hd, -hw,-hh, hd,  // bottom
     hw,-hh,-hd,  hw, hh,-hd,  hw, hh, hd,  hw,-hh, hd,  // right
    -hw,-hh,-hd, -hw,-hh, hd, -hw, hh, hd, -hw, hh,-hd,  // left
  ]);
  const normals = new Float32Array([
    0,0,1, 0,0,1, 0,0,1, 0,0,1,
    0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
    0,1,0, 0,1,0, 0,1,0, 0,1,0,
    0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
    1,0,0, 1,0,0, 1,0,0, 1,0,0,
    -1,0,0, -1,0,0, -1,0,0, -1,0,0,
  ]);
  const indices = new Uint16Array([
    0,1,2, 0,2,3, 4,5,6, 4,6,7, 8,9,10, 8,10,11,
    12,13,14, 12,14,15, 16,17,18, 16,18,19, 20,21,22, 20,22,23,
  ]);
  return { positions, normals, indices };
}

function buildGLB(meshes) {
  // meshes: array of { w, h, d, tx, ty, tz, r, g, b }
  const allBins = [];
  const accessors = [];
  const bufferViews = [];
  const gltfMeshes = [];
  const nodes = [];
  const materials = [];
  let byteOffset = 0;

  for (let i = 0; i < meshes.length; i++) {
    const m = meshes[i];
    const { positions, normals, indices } = boxGeometry(m.w, m.h, m.d);

    // Indices
    const idxBuf = Buffer.from(indices.buffer);
    const idxPad = (4 - (idxBuf.length % 4)) % 4;
    const idxPadded = Buffer.concat([idxBuf, Buffer.alloc(idxPad)]);
    bufferViews.push({ buffer: 0, byteOffset, byteLength: idxBuf.length, target: 34963 });
    const idxAccessor = accessors.length;
    accessors.push({ bufferView: bufferViews.length - 1, componentType: 5123, count: indices.length, type: 'SCALAR', max: [23], min: [0] });
    allBins.push(idxPadded);
    byteOffset += idxPadded.length;

    // Positions
    const posBuf = Buffer.from(positions.buffer);
    const posPad = (4 - (posBuf.length % 4)) % 4;
    const posPadded = Buffer.concat([posBuf, Buffer.alloc(posPad)]);
    bufferViews.push({ buffer: 0, byteOffset, byteLength: posBuf.length, target: 34962 });
    const posMin = [-m.w/2, -m.h/2, -m.d/2];
    const posMax = [m.w/2, m.h/2, m.d/2];
    const posAccessor = accessors.length;
    accessors.push({ bufferView: bufferViews.length - 1, componentType: 5126, count: 24, type: 'VEC3', max: posMax, min: posMin });
    allBins.push(posPadded);
    byteOffset += posPadded.length;

    // Normals
    const normBuf = Buffer.from(normals.buffer);
    const normPad = (4 - (normBuf.length % 4)) % 4;
    const normPadded = Buffer.concat([normBuf, Buffer.alloc(normPad)]);
    bufferViews.push({ buffer: 0, byteOffset, byteLength: normBuf.length, target: 34962 });
    const normAccessor = accessors.length;
    accessors.push({ bufferView: bufferViews.length - 1, componentType: 5126, count: 24, type: 'VEC3', max: [1,1,1], min: [-1,-1,-1] });
    allBins.push(normPadded);
    byteOffset += normPadded.length;

    // Material
    materials.push({
      pbrMetallicRoughness: {
        baseColorFactor: [m.r, m.g, m.b, 1.0],
        metallicFactor: 0.1,
        roughnessFactor: 0.7,
      },
    });

    // Mesh
    gltfMeshes.push({
      primitives: [{
        attributes: { POSITION: posAccessor, NORMAL: normAccessor },
        indices: idxAccessor,
        material: i,
      }],
    });

    // Node with translation (center Y at half height so model sits on ground)
    nodes.push({
      mesh: i,
      translation: [m.tx, m.ty + m.h / 2, m.tz],
    });
  }

  const binBuffer = Buffer.concat(allBins);

  const gltf = {
    asset: { version: '2.0', generator: 'clearpath-mock' },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes: gltfMeshes,
    accessors,
    bufferViews,
    materials,
    buffers: [{ byteLength: binBuffer.length }],
  };

  const jsonStr = JSON.stringify(gltf);
  const jsonBuf = Buffer.from(jsonStr);
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
  const jsonPadded = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);

  const binPad = (4 - (binBuffer.length % 4)) % 4;
  const binPadded = Buffer.concat([binBuffer, Buffer.alloc(binPad)]);

  // GLB header: magic + version + length
  // Chunk 0: JSON, Chunk 1: BIN
  const totalLength = 12 + 8 + jsonPadded.length + 8 + binPadded.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546C67, 0); // glTF magic
  header.writeUInt32LE(2, 4);          // version
  header.writeUInt32LE(totalLength, 8);

  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(jsonPadded.length, 0);
  jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4); // JSON

  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(binPadded.length, 0);
  binChunkHeader.writeUInt32LE(0x004E4942, 4); // BIN

  return Buffer.concat([header, jsonChunkHeader, jsonPadded, binChunkHeader, binPadded]);
}

// Colors as 0-1 floats
const c = (hex) => [(hex >> 16 & 0xff)/255, (hex >> 8 & 0xff)/255, (hex & 0xff)/255];

const BLUEPRINTS = [
  {
    filename: 'small-er.glb',
    meshes: [
      { w: 12, h: 7, d: 8, tx: 0, ty: 0, tz: 0, ...spread(c(0xd4e6f1)) },
      { w: 12.4, h: 0.3, d: 8.4, tx: 0, ty: 7, tz: 0, ...spread(c(0x555555)) },
    ],
  },
  {
    filename: 'medium-hospital.glb',
    meshes: [
      { w: 20, h: 14, d: 12, tx: 0, ty: 0, tz: 0, ...spread(c(0xbfc9ca)) },
      { w: 20.4, h: 0.3, d: 12.4, tx: 0, ty: 14, tz: 0, ...spread(c(0x555555)) },
      { w: 10, h: 10.5, d: 8, tx: 15, ty: 0, tz: 0, ...spread(c(0xd5d8dc)) },
      { w: 10.4, h: 0.3, d: 8.4, tx: 15, ty: 10.5, tz: 0, ...spread(c(0x555555)) },
    ],
  },
  {
    filename: 'large-complex.glb',
    meshes: [
      { w: 18, h: 28, d: 18, tx: 0, ty: 0, tz: 0, ...spread(c(0xaeb6bf)) },
      { w: 18.4, h: 0.3, d: 18.4, tx: 0, ty: 28, tz: 0, ...spread(c(0x555555)) },
      { w: 14, h: 14, d: 10, tx: 16, ty: 0, tz: 0, ...spread(c(0xd5d8dc)) },
      { w: 14.4, h: 0.3, d: 10.4, tx: 16, ty: 14, tz: 0, ...spread(c(0x555555)) },
      { w: 14, h: 14, d: 10, tx: -16, ty: 0, tz: 0, ...spread(c(0xd5d8dc)) },
      { w: 14.4, h: 0.3, d: 10.4, tx: -16, ty: 14, tz: 0, ...spread(c(0x555555)) },
    ],
  },
];

function spread([r, g, b]) { return { r, g, b }; }

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const bp of BLUEPRINTS) {
    const buf = buildGLB(bp.meshes);
    await writeFile(path.join(OUT_DIR, bp.filename), buf);
    console.log(`Wrote ${bp.filename} (${(buf.length / 1024).toFixed(1)} KB)`);
  }
  console.log('Done.');
}

main().catch(console.error);
