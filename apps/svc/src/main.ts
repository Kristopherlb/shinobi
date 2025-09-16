#!/usr/bin/env node

import { program } from 'commander';
import { validateCommand } from './cli/validate';
import { planCommand } from './cli/plan';
import { initCommand } from './cli/init';
import { upCommand } from './cli/up';
import { migrateCommand } from './cli/migrate';

program
  .name('svc')
  .description('Shinobi Platform CLI')
  .version('0.1.0');

program
  .command('validate')
  .description('Validate service manifest')
  .option('-e, --env <environment>', 'Environment to validate against')
  .option('--json', 'Output in JSON format')
  .action(validateCommand);

program
  .command('plan')
  .description('Generate deployment plan')
  .option('-e, --env <environment>', 'Environment to plan for')
  .option('--json', 'Output in JSON format')
  .action(planCommand);

program
  .command('init')
  .description('Initialize a new service')
  .option('-t, --template <template>', 'Template to use')
  .action(initCommand);

program
  .command('up')
  .description('Deploy service')
  .option('-e, --env <environment>', 'Environment to deploy to')
  .action(upCommand);

program
  .command('migrate')
  .description('Migrate existing infrastructure')
  .action(migrateCommand);

program.parse();
