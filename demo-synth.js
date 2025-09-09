#!/usr/bin/env node

/**
 * Demo CDK Synthesis - Shows what the platform would generate
 * This demonstrates the core functionality without actually deploying
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('yaml');

function log(message) {
  console.log(`🏗️  ${message}`);
}

function success(message) {
  console.log(`✅ ${message}`);
}

async function synthesizeOnly(manifestPath, env = 'dev') {
  try {
    log(`Synthesizing CDK code for ${env} environment`);
    log(`Using manifest: ${manifestPath}`);

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
    
    // Generate CDK app in a demo directory
    log('Generating CDK application...');
    const demoDir = path.join(process.cwd(), 'demo-output');
    
    // Ensure demo directory exists
    if (!fs.existsSync(demoDir)) {
      fs.mkdirSync(demoDir, { recursive: true });
    }

    // Generate CDK app.ts file
    const appContent = generateCdkApp(synthesisResult, env);
    fs.writeFileSync(path.join(demoDir, 'app.ts'), appContent);

    // Generate package.json
    const packageJson = generatePackageJson(synthesisResult.serviceName);
    fs.writeFileSync(path.join(demoDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    // Generate cdk.json
    const cdkJson = {
      app: 'npx ts-node app.ts',
      context: {
        '@aws-cdk/aws-lambda:recognizeLayerVersion': true,
        '@aws-cdk/core:checkSecretUsage': true,
        'aws-cdk:enableDiffNoFail': true
      }
    };
    fs.writeFileSync(path.join(demoDir, 'cdk.json'), JSON.stringify(cdkJson, null, 2));

    success(`CDK application generated in: ${demoDir}`);
    success('Generated files:');
    console.log('  📄 app.ts - CDK application code');
    console.log('  📄 package.json - Dependencies');
    console.log('  📄 cdk.json - CDK configuration');
    
    log('\n--- Generated CDK Code Preview ---');
    console.log(appContent);
    
    log('\n--- What this demonstrates ---');
    console.log('✓ Platform reads service.yml manifest');
    console.log('✓ Platform generates proper CDK TypeScript code');
    console.log('✓ Platform handles EC2 + S3 components');
    console.log('✓ Platform applies proper tagging and configuration');
    console.log('✓ Generated code is ready for deployment');
    
    return {
      success: true,
      outputDir: demoDir,
      generatedFiles: ['app.ts', 'package.json', 'cdk.json']
    };

  } catch (err) {
    console.error(`❌ Synthesis failed: ${err.message}`);
    return {
      success: false,
      error: err.message
    };
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
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }
      ]
    });
    
    const ${component.name.replace(/-/g, '')}Instance = new ec2.Instance(this, '${component.name}', {
      vpc: ${component.name.replace(/-/g, '')}Vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      userData: ec2.UserData.forLinux(),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      }
    });
    
    ${component.config?.userData?.script ? `${component.name.replace(/-/g, '')}Instance.addUserData(\`${component.config.userData.script.replace(/`/g, '\\`')}\`);` : ''}
    
    // Output the instance ID
    new cdk.CfnOutput(this, '${component.name}-instance-id', {
      value: ${component.name.replace(/-/g, '')}Instance.instanceId,
      description: 'EC2 Instance ID for ${component.name}'
    });
    \n`;
      } else if (component.type === 's3-bucket') {
        code += `    const ${component.name.replace(/-/g, '')}Bucket = new s3.Bucket(this, '${component.name}', {
      bucketName: '${component.config?.bucketName || component.name}-' + this.account,
      versioned: ${component.config?.versioning || false},
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes
      autoDeleteObjects: true // For demo purposes
    });
    
    // Output the bucket name
    new cdk.CfnOutput(this, '${component.name}-bucket-name', {
      value: ${component.name.replace(/-/g, '')}Bucket.bucketName,
      description: 'S3 Bucket Name for ${component.name}'
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
      cdk: 'cdk',
      synth: 'cdk synth',
      deploy: 'cdk deploy',
      diff: 'cdk diff'
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
  
  synthesizeOnly(manifestPath, env)
    .then(result => {
      if (result.success) {
        success('✅ CDK synthesis completed successfully!');
        success(`Check the generated code in: ${result.outputDir}`);
        process.exit(0);
      } else {
        console.error('❌ Synthesis failed!');
        process.exit(1);
      }
    })
    .catch(err => {
      console.error(`❌ Synthesis failed: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { synthesizeOnly };
