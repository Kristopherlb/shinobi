#!/usr/bin/env node

/**
 * Standalone Deploy Script
 * This is a temporary solution to test deployment functionality
 * without the complex CLI infrastructure
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('yaml');

function log(message) {
  console.log(`🚀 ${message}`);
}

function error(message) {
  console.error(`❌ ${message}`);
}

function warn(message) {
  console.warn(`⚠️ ${message}`);
}

async function deploy(manifestPath, env = 'dev', target = 'aws') {
  try {
    log(`Deploying to ${target} (${env} environment)`);
    log(`Using manifest: ${manifestPath}`);

    if (target === 'localstack') {
      log('📡 Using LocalStack endpoint: http://localhost:4566');
      warn('Make sure LocalStack is running: svc local up');
    }

    // Read and parse manifest
    log('Reading service manifest...');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = yaml.parse(manifestContent);
    
    // Simple validation
    if (!manifest.service || !manifest.components) {
      throw new Error('Invalid manifest: missing required fields (service, components)');
    }
    
    log('Manifest loaded successfully');
    const synthesisResult = {
      serviceName: manifest.service,
      owner: manifest.owner || 'unknown',
      complianceFramework: manifest.complianceFramework || 'commercial',
      components: manifest.components
    };
    
    // Generate CDK app and deploy
    log('Generating CDK application...');
    const deploymentResult = await deployInfrastructure(synthesisResult, env, target);
    
    log('Deployment completed successfully');
    
    // Display deployment outputs if available
    if (deploymentResult.outputs) {
      log('\n--- Deployment Outputs ---');
      Object.entries(deploymentResult.outputs).forEach(([key, value]) => {
        log(`  ${key}: ${value}`);
      });
    }

    return {
      success: true,
      data: {
        resolvedManifest: manifest,
        synthesisResult: synthesisResult,
        deploymentOutputs: deploymentResult.outputs
      }
    };

  } catch (err) {
    error(`Deployment failed: ${err.message}`);
    return {
      success: false,
      error: err.message
    };
  }
}

async function deployInfrastructure(synthesisResult, env, target) {
  // Create a temporary directory for the CDK app
  const tempDir = path.join(process.cwd(), '.cdk-deploy-temp');
  
  try {
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate CDK app.ts file
    const appContent = generateCdkApp(synthesisResult, env);
    fs.writeFileSync(path.join(tempDir, 'app.ts'), appContent);

    // Generate package.json
    const packageJson = generatePackageJson(synthesisResult.serviceName);
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    // Generate cdk.json with modern CDK v2 settings
    const cdkJson = {
      app: 'npx ts-node app.ts',
      context: {
        '@aws-cdk/aws-lambda:recognizeLayerVersion': true,
        '@aws-cdk/core:checkSecretUsage': true,
        '@aws-cdk/core:target-partitions': ['aws', 'aws-cn'],
        '@aws-cdk/aws-ec2:uniqueImdsv2TemplateName': true,
        '@aws-cdk/core:validateSnapshotRemovalPolicy': true,
        '@aws-cdk/aws-s3:createDefaultLoggingPolicy': true,
        '@aws-cdk/aws-apigateway:disableCloudWatchRole': false,
        'aws-cdk:enableDiffNoFail': true
      }
    };
    fs.writeFileSync(path.join(tempDir, 'cdk.json'), JSON.stringify(cdkJson, null, 2));

    // Install dependencies
    log('Installing CDK dependencies...');
    execSync('npm install', { 
      cwd: tempDir, 
      stdio: 'inherit',
      timeout: 120000 // 2 minute timeout
    });

    // Set up environment for deployment
    const cdkEnv = { ...process.env };
    if (target === 'localstack') {
      cdkEnv.CDK_DEFAULT_ACCOUNT = '000000000000';
      cdkEnv.CDK_DEFAULT_REGION = 'us-east-1';
      cdkEnv.AWS_ACCESS_KEY_ID = 'test';
      cdkEnv.AWS_SECRET_ACCESS_KEY = 'test';
      cdkEnv.AWS_DEFAULT_REGION = 'us-east-1';
      cdkEnv.AWS_ENDPOINT_URL = 'http://localhost:4566';
    }

    // Bootstrap CDK (if needed)
    log('Bootstrapping CDK environment...');
    try {
      const bootstrapCmd = target === 'localstack' 
        ? `npx cdk bootstrap aws://000000000000/us-east-1 --require-approval never`
        : `npx cdk bootstrap --require-approval never`;
      
      execSync(bootstrapCmd, {
        cwd: tempDir,
        env: cdkEnv,
        stdio: 'inherit',
        timeout: 300000 // 5 minute timeout
      });
    } catch (bootstrapError) {
      warn('CDK bootstrap may have failed, continuing with deployment...');
    }

    // Deploy the stack
    log('Deploying CDK stack...');
    const deployCmd = target === 'localstack'
      ? `npx cdk deploy --require-approval never --outputs-file outputs.json`
      : `npx cdk deploy --require-approval never --outputs-file outputs.json`;
    
    const deployOutput = execSync(deployCmd, {
      cwd: tempDir,
      env: cdkEnv,
      encoding: 'utf8',
      timeout: 900000 // 15 minute timeout
    });

    log('CDK Deploy Output:');
    console.log(deployOutput);

    // Read outputs if they exist
    let outputs;
    const outputsPath = path.join(tempDir, 'outputs.json');
    if (fs.existsSync(outputsPath)) {
      outputs = JSON.parse(fs.readFileSync(outputsPath, 'utf8'));
    }

    return { outputs };

  } finally {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

function generateCdkApp(synthesisResult, env) {
  const stackName = `${synthesisResult.serviceName}-${env}`;
  
  return `#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';

class ${toPascalCase(synthesisResult.serviceName)}Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Add synthesized constructs
    ${generateConstructCode(synthesisResult)}
  }
}

const app = new cdk.App();
new ${toPascalCase(synthesisResult.serviceName)}Stack(app, '${stackName}', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || process.env.CDK_DEPLOY_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || process.env.CDK_DEPLOY_REGION || 'us-east-1',
  },
  tags: {
    'service-name': '${synthesisResult.serviceName}',
    'environment': '${env}',
    'owner': '${synthesisResult.owner}',
    'compliance-framework': '${synthesisResult.complianceFramework}'
  }
});
`;
}

function generateConstructCode(synthesisResult) {
  let code = '';
  
  if (synthesisResult.components) {
    synthesisResult.components.forEach((component, index) => {
      code += `    // Component: ${component.name} (${component.type})\n`;
      
      if (component.type === 'ec2-instance') {
        code += `    const ${component.name.replace(/-/g, '')}Vpc = new ec2.Vpc(this, '${component.name}-vpc', {
      maxAzs: 2,
      natGateways: 1
    });
    
    const ${component.name.replace(/-/g, '')}Instance = new ec2.Instance(this, '${component.name}', {
      vpc: ${component.name.replace(/-/g, '')}Vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      userData: ec2.UserData.forLinux(),
    });
    
    // Add user data if provided
    ${component.config?.userData?.script ? `${component.name.replace(/-/g, '')}Instance.addUserData(\`${component.config.userData.script.replace(/`/g, '\\`')}\`);` : ''}
    \n`;
      } else if (component.type === 's3-bucket') {
        code += `    const ${component.name.replace(/-/g, '')}Bucket = new s3.Bucket(this, '${component.name}', {
      bucketName: '${component.config?.bucketName || component.name}-' + this.account,
      versioned: ${component.config?.versioning || false},
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes
      autoDeleteObjects: true // For demo purposes
    });
    \n`;
      } else {
        code += `    // TODO: Implement ${component.type} construct\n\n`;
      }
    });
  }
  
  return code;
}

function generatePackageJson(serviceName) {
  return {
    name: `${serviceName}-cdk-deploy`,
    version: '0.1.0',
    private: true,
    scripts: {
      build: 'tsc',
      watch: 'tsc -w',
      test: 'jest',
      cdk: 'cdk'
    },
    devDependencies: {
      '@types/jest': '^29.4.0',
      '@types/node': '18.14.6',
      jest: '^29.5.0',
      'ts-jest': '^29.0.5',
      'aws-cdk': '2.87.0',
      typescript: '~4.9.5',
      'ts-node': '^10.9.1',
      'source-map-support': '^0.5.21'
    },
    dependencies: {
      'aws-cdk-lib': '2.87.0',
      constructs: '^10.0.0'
    }
  };
}

function toPascalCase(str) {
  return str.replace(/(^\w|-\w)/g, (match) => match.replace('-', '').toUpperCase());
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const manifestPath = args[0] || 'service.yml';
  const env = args[1] || 'dev';
  const target = args[2] || 'aws';
  
  deploy(manifestPath, env, target)
    .then(result => {
      if (result.success) {
        log('✅ Deployment completed successfully!');
        process.exit(0);
      } else {
        error('❌ Deployment failed!');
        process.exit(1);
      }
    })
    .catch(err => {
      error(`❌ Deployment failed: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { deploy };
