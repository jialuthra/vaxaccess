// Bundles the statistics Lambda (DESIGN.md §4.11, docs/deployment.md §3) into one ES module with
// no runtime dependencies, then zips it for upload:
//   server/dist/index.mjs          handler `index.handler`, runtime nodejs24.x (matches .nvmrc)
//   server/dist/stats-lambda.zip   the file to upload in the Lambda console
// Both outputs are git-ignored. No secrets are read or embedded: the token and contributor map
// come from the Lambda environment at runtime.

import { crc32, deflateRawSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { build } from 'vite';

const ENTRY = 'server/stats/handler.ts';
const OUT_DIR = 'server/dist';
const BUNDLE = 'index.mjs';
const ZIP = 'stats-lambda.zip';

await build({
  configFile: false,
  publicDir: false,
  logLevel: 'warn',
  build: {
    ssr: ENTRY,
    outDir: OUT_DIR,
    emptyOutDir: true,
    target: 'node24',
    minify: false,
    sourcemap: false,
    rolldownOptions: { output: { format: 'esm', entryFileNames: BUNDLE } },
  },
  // Inline everything so the zip runs without node_modules.
  ssr: { target: 'node', noExternal: true },
});

const code = readFileSync(`${OUT_DIR}/${BUNDLE}`);
writeFileSync(`${OUT_DIR}/${ZIP}`, zipSingleFile(BUNDLE, code));

console.log(`Built ${OUT_DIR}/${BUNDLE} (${(code.length / 1024).toFixed(1)} KiB) and ${OUT_DIR}/${ZIP}.`);
console.log('Lambda settings: runtime nodejs24.x, handler index.handler.');

/**
 * A minimal ZIP archive holding one deflated file. A fixed 1980-01-01 timestamp keeps the
 * archive byte-identical across builds of the same code.
 */
function zipSingleFile(name: string, data: Buffer): Buffer {
  const fileName = Buffer.from(name, 'utf8');
  const compressed = deflateRawSync(data, { level: 9 });
  const checksum = crc32(data);
  const dosTime = 0;
  const dosDate = (0 << 9) | (1 << 5) | 1;

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0x0800, 6); // UTF-8 file name
  local.writeUInt16LE(8, 8); // deflate
  local.writeUInt16LE(dosTime, 10);
  local.writeUInt16LE(dosDate, 12);
  local.writeUInt32LE(checksum, 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(fileName.length, 26);
  local.writeUInt16LE(0, 28);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(0x0314, 4); // made by Unix, spec 2.0, so the mode below applies
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt16LE(dosTime, 12);
  central.writeUInt16LE(dosDate, 14);
  central.writeUInt32LE(checksum, 16);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(fileName.length, 28);
  central.writeUInt16LE(0, 30); // extra length
  central.writeUInt16LE(0, 32); // comment length
  central.writeUInt16LE(0, 34); // disk number
  central.writeUInt16LE(0, 36); // internal attributes
  central.writeUInt32LE((0o100644 << 16) >>> 0, 38); // regular file, rw-r--r--
  central.writeUInt32LE(0, 42); // local header offset

  const localSize = local.length + fileName.length + compressed.length;
  const centralSize = central.length + fileName.length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(localSize, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([local, fileName, compressed, central, fileName, end]);
}
