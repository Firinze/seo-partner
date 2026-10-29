import { execSync } from 'node:child_process';

export function isGitTreeClean(projectRoot: string): boolean {
  try {
    const status = execSync('git status --porcelain', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return status.length === 0;
  } catch {
    // If not a git repo or git fails, return false
    return false;
  }
}

export function getCurrentBranchName(projectRoot: string): string {
  try {
    return execSync('git branch --show-current', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || 'main';
  } catch {
    return 'main';
  }
}

export function createGitBranch(projectRoot: string, branchName: string): void {
  execSync(`git checkout -b "${branchName}"`, {
    cwd: projectRoot,
    stdio: 'ignore',
  });
}

export function commitChanges(projectRoot: string, message: string): string {
  execSync('git add .', { cwd: projectRoot, stdio: 'ignore' });
  execSync(`git commit -m "${message}"`, { cwd: projectRoot, stdio: 'ignore' });
  return execSync('git rev-parse HEAD', { cwd: projectRoot, encoding: 'utf-8' }).trim();
}

export function isGhCliAvailable(): boolean {
  try {
    const cmd = process.platform === 'win32' ? 'where gh' : 'which gh';
    execSync(cmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function invokeGhPrCreate(projectRoot: string, options: {
  baseBranch: string;
  headBranch: string;
  bodyFile: string;
  title: string;
}): string | null {
  if (!isGhCliAvailable()) {
    return null;
  }

  try {
    const output = execSync(
      `gh pr create --base "${options.baseBranch}" --head "${options.headBranch}" --title "${options.title}" --body-file "${options.bodyFile}"`,
      {
        cwd: projectRoot,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    ).trim();
    return output;
  } catch {
    return null;
  }
}

