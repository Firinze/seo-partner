import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const srcSkills = path.join(rootDir, 'skills');
const destSkills = path.join(rootDir, 'packages', 'cli', 'skills');

if (fs.existsSync(srcSkills)) {
  fs.cpSync(srcSkills, destSkills, { recursive: true, force: true });
  console.log('Successfully synchronized skills into packages/cli/skills');
}

