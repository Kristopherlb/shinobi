import path from 'path';

// Ensure process.cwd() during tests points at the repo root so shared configuration files resolve
const repoRoot = path.resolve(__dirname, '../../../..');
if (process.cwd() !== repoRoot) {
  process.chdir(repoRoot);
}
