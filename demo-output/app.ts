#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';

class SimpleWebAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

        // Component: web-server (ec2-instance)
    const webserverVpc = new ec2.Vpc(this, 'web-server-vpc', {
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
    
    const webserverInstance = new ec2.Instance(this, 'web-server', {
      vpc: webserverVpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      userData: ec2.UserData.forLinux(),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      }
    });
    
    webserverInstance.addUserData(`#!/bin/bash
yum update -y
yum install -y httpd
systemctl start httpd
echo "<h1>Hello from CDK Platform</h1>" > /var/www/html/index.html
`);
    
    // Output the instance ID
    new cdk.CfnOutput(this, 'web-server-instance-id', {
      value: webserverInstance.instanceId,
      description: 'EC2 Instance ID for web-server'
    });
    
    // Component: app-storage (s3-bucket)
    const appstorageBucket = new s3.Bucket(this, 'app-storage', {
      bucketName: 'simple-web-app-storage-' + this.account,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes
      autoDeleteObjects: true // For demo purposes
    });
    
    // Output the bucket name
    new cdk.CfnOutput(this, 'app-storage-bucket-name', {
      value: appstorageBucket.bucketName,
      description: 'S3 Bucket Name for app-storage'
    });
    

  }
}

const app = new cdk.App();
new SimpleWebAppStack(app, 'simple-web-app-dev', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || process.env.CDK_DEPLOY_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || process.env.CDK_DEPLOY_REGION || 'us-east-1',
  },
  tags: {
    'service-name': 'simple-web-app',
    'environment': 'dev',
    'owner': 'dev-team',
    'compliance-framework': 'commercial'
  }
});
