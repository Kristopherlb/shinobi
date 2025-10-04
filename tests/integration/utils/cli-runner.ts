import path from 'node:path';
import { exec, type ExecOptions } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const repoRoot = path.resolve(__dirname, '../../..');
const tsNodeProject = path.join(repoRoot, 'apps/svc/tsconfig.app.json');
const cliEntry = path.join(repoRoot, 'apps/svc/src/main.ts');
const nodeBinary = process.execPath;
const baseCommand = `${JSON.stringify(nodeBinary)} --no-warnings --loader ts-node/esm ${JSON.stringify(cliEntry)}`;

export const execCli = async (args: string, options: ExecOptions = {}) => {
  const mergedEnv = {
    ...process.env,
    ...options.env,
    TS_NODE_PROJECT: tsNodeProject,
    PLATFORM_LOG_LEVEL: 'ERROR',
    SHINOBI_STRICT_SCHEMA_VALIDATION: 'false'
  };

  return execAsync(`${baseCommand} ${args}`, {
    ...options,
    env: mergedEnv
  });
};

export const cliBaseCommand = baseCommand;
