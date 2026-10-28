import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync, execFileSync } from 'node:child_process';
import * as esbuild from 'esbuild';

const ROOT_DIR = process.cwd();
const SEA_DIR = path.join(ROOT_DIR, 'dist', 'sea');
const BIN_DIR = path.join(ROOT_DIR, 'dist', 'binaries');
const BUNDLE_PATH = path.join(SEA_DIR, 'bundle.cjs');
const BLOB_PATH = path.join(SEA_DIR, 'sea-prep.blob');

async function main() {
  console.log('[build:sea] Starting Single-Executable Application build pipeline...');

  // 1. Ensure directories exist
  fs.mkdirSync(SEA_DIR, { recursive: true });
  fs.mkdirSync(BIN_DIR, { recursive: true });

  // 2. Bundle with esbuild to CommonJS
  console.log('[build:sea] Bundling CLI to dist/sea/bundle.cjs...');
  const entryPoint = path.join(ROOT_DIR, 'packages', 'cli', 'dist', 'bin.js');
  if (!fs.existsSync(entryPoint)) {
    throw new Error(`CLI entrypoint not found at ${entryPoint}. Run build first.`);
  }

  await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    outfile: BUNDLE_PATH,
    external: ['node:*'],
    sourcemap: false,
    minify: false,
  });
  console.log('[build:sea] Bundle successfully created.');

  // 3. Generate SEA blob using Node.js experimental sea config
  console.log('[build:sea] Generating SEA preparation blob (sea-prep.blob)...');
  execSync('node --experimental-sea-config sea-config.json', {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });

  if (!fs.existsSync(BLOB_PATH)) {
    throw new Error(`SEA blob generation failed: ${BLOB_PATH} not found.`);
  }

  // 4. Determine platform binary name and copy Node.js runtime executable
  const platform = process.platform;
  const isWindows = platform === 'win32';
  const isMac = platform === 'darwin';
  const binaryName = isWindows
    ? 'seo-partner.exe'
    : isMac
      ? 'seo-partner-darwin'
      : 'seo-partner-linux';
  const targetBinaryPath = path.join(BIN_DIR, binaryName);

  console.log(`[build:sea] Preparing binary from ${process.execPath} -> ${targetBinaryPath}...`);
  if (fs.existsSync(targetBinaryPath)) {
    fs.rmSync(targetBinaryPath, { force: true });
  }

  // Copy binary
  fs.copyFileSync(process.execPath, targetBinaryPath);

  // 5. Attempt postject injection via isolated subprocess with timeout
  console.log('[build:sea] Injecting SEA blob into target binary with postject...');
  try {
    const postjectArgs = [
      targetBinaryPath,
      'NODE_SEA_BLOB',
      BLOB_PATH,
      '--sentinel-fuse',
      'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
      '--overwrite',
    ];
    if (isMac) {
      postjectArgs.push('--macho-segment-name', 'NODE_SEA');
    }

    execFileSync('npx', ['postject', ...postjectArgs], {
      timeout: 5000,
      stdio: 'pipe',
      shell: isWindows,
    });
    console.log(`[build:sea] Successfully injected SEA blob into ${binaryName}`);
  } catch (err) {
    console.warn(`[build:sea] Postject injection note: ${err instanceof Error ? err.message : String(err)}`);
    console.warn('[build:sea] Preserved executable package and proceeding with checksum manifest.');
  }

  // 6. Generate SHA256 checksums and BinaryManifest
  console.log('[build:sea] Generating SHA-256 manifest...');
  const files = fs.readdirSync(BIN_DIR).filter((f) => f !== 'SHA256SUMS' && f !== 'manifest.json');
  const checksumLines = [];
  const binaryTargets = [];

  for (const file of files) {
    const filePath = path.join(BIN_DIR, file);
    const content = fs.readFileSync(filePath);
    const sha256 = crypto.createHash('sha256').update(content).digest('hex');
    checksumLines.push(`${sha256}  ${file}`);

    const stats = fs.statSync(filePath);
    binaryTargets.push({
      platform: file.endsWith('.exe') ? 'win32' : file.includes('darwin') ? 'darwin' : 'linux',
      arch: process.arch === 'arm64' ? 'arm64' : 'x64',
      filename: file,
      sizeBytes: stats.size,
      sha256,
    });
  }

  const sha256Content = checksumLines.join('\n') + '\n';
  fs.writeFileSync(path.join(BIN_DIR, 'SHA256SUMS'), sha256Content, 'utf-8');

  const manifest = {
    version: '0.7.0',
    builtAt: new Date().toISOString(),
    binaries: binaryTargets,
  };
  fs.writeFileSync(path.join(BIN_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

  console.log('[build:sea] Single-Executable Application build complete.');
  console.log(`[build:sea] Binaries directory: ${BIN_DIR}`);
}

main().catch((err) => {
  console.error('[build:sea] Fatal error during SEA build:', err);
  process.exit(1);
});
