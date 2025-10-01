import * as path from 'path';
import inquirer from 'inquirer';
import { CloudFormationClient, DeleteStackCommand } from '@aws-sdk/client-cloudformation';
import { waitUntilStackDeleteComplete } from '@aws-sdk/client-cloudformation';
import { readManifest } from './utils/service-synthesizer.js';
const isStackMissing = (error) => {
    if (!error || typeof error !== 'object') {
        return false;
    }
    const err = error;
    return err.name === 'ValidationError' && !!err.message?.includes('does not exist');
};
export class DestroyCommand {
    dependencies;
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    async execute(options) {
        const logger = this.dependencies.logger;
        try {
            const manifestPath = options.file
                ? path.resolve(options.file)
                : await this.dependencies.fileDiscovery.findManifest('.');
            if (!manifestPath) {
                return {
                    success: false,
                    exitCode: 2,
                    error: 'No service.yml found in this directory or any parent directories.'
                };
            }
            const manifest = await readManifest({ manifestPath });
            const environment = options.env ?? manifest.environment ?? 'dev';
            const region = String(options.region ?? manifest.region ?? process.env.CDK_DEFAULT_REGION ?? 'us-east-1');
            const accountId = String(options.account ?? manifest.accountId ?? process.env.CDK_DEFAULT_ACCOUNT ?? '123456789012');
            const stackName = options.stack ?? `${manifest.service}-${environment}`;
            if (options.profile) {
                process.env.AWS_PROFILE = options.profile;
                logger.info(`Using AWS profile: ${options.profile}`);
            }
            if (!options.yes) {
                if (options.json) {
                    return {
                        success: false,
                        exitCode: 2,
                        error: 'Confirmation required: re-run with --yes to skip interactive prompt.'
                    };
                }
                const answer = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        default: false,
                        message: `Delete stack ${stackName} in ${region}?`
                    }
                ]);
                if (!answer.confirm) {
                    logger.warn('Destroy cancelled by user.');
                    return {
                        success: false,
                        exitCode: 1,
                        error: 'Operation cancelled'
                    };
                }
            }
            const client = new CloudFormationClient({ region });
            try {
                await client.send(new DeleteStackCommand({ StackName: stackName }));
            }
            catch (error) {
                if (isStackMissing(error)) {
                    logger.info(`Stack ${stackName} does not exist. Nothing to delete.`);
                    return {
                        success: true,
                        exitCode: 0,
                        data: {
                            stackName,
                            region,
                            accountId,
                            deleted: false
                        }
                    };
                }
                throw error;
            }
            logger.info(`Waiting for stack ${stackName} to be deleted...`);
            await waitUntilStackDeleteComplete({
                client,
                maxWaitTime: 900,
                maxDelay: 15,
                minDelay: 3
            }, { StackName: stackName });
            logger.success(`Stack ${stackName} deleted.`);
            return {
                success: true,
                exitCode: 0,
                data: {
                    stackName,
                    region,
                    accountId,
                    deleted: true
                }
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            this.dependencies.logger.error('Destroy failed', error);
            return {
                success: false,
                exitCode: 2,
                error: message
            };
        }
    }
}
