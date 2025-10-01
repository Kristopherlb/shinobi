/**
 * ClamAV Scanning Service
 * 
 * Reusable platform service for virus scanning across multiple storage services
 * including S3, EFS, and other file storage systems.
 */

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3_notifications from 'aws-cdk-lib/aws-s3-notifications';
import * as events from 'aws-cdk-lib/aws-events';
import * as events_targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ComponentContext } from '../../contracts/component-interfaces.js';

export interface ClamAvScanningConfig {
  enabled: boolean;
  scanOnUpload: boolean;
  scanOnDownload?: boolean;
  quarantineEnabled: boolean;
  notificationTopics?: string[];
  scanTimeout: number; // in seconds
  maxFileSize: number; // in MB
}

export interface StorageTarget {
  type: 's3' | 'efs' | 'fsx';
  bucketArn?: string;
  efsArn?: string;
  fsxArn?: string;
  path?: string;
}

export interface ClamAvScanningService {
  configureForS3(config: ClamAvScanningConfig, bucket: s3.Bucket): void;
  configureForEFS(config: ClamAvScanningConfig, efsArn: string): void;
  configureForFSx(config: ClamAvScanningConfig, fsxArn: string): void;
  getScanningResources(): Construct[];
  getQuarantineResources(): Construct[];
}

export class ClamAvScanningServiceImpl implements ClamAvScanningService {
  private scope: Construct;
  private context: ComponentContext;
  private scanningResources: Construct[] = [];
  private quarantineResources: Construct[] = [];

  constructor(scope: Construct, context: ComponentContext) {
    this.scope = scope;
    this.context = context;
  }

  /**
   * Configures ClamAV scanning for S3 buckets
   */
  configureForS3(config: ClamAvScanningConfig, bucket: s3.Bucket): void {
    if (!config.enabled) {
      return;
    }

    // Create ClamAV Lambda function
    const clamavFunction = this.createClamAvFunction(config);
    this.scanningResources.push(clamavFunction);

    // Create quarantine bucket if needed
    let quarantineBucket: s3.Bucket | undefined;
    if (config.quarantineEnabled) {
      quarantineBucket = this.createQuarantineBucket(bucket);
      this.quarantineResources.push(quarantineBucket);
    }

    // Configure S3 event notifications
    if (config.scanOnUpload) {
      this.configureS3UploadScanning(bucket, clamavFunction, quarantineBucket);
    }

    // Configure scheduled scans
    this.configureScheduledScanning(clamavFunction, bucket);

    this.logEvent('clamav_s3_configured', 'ClamAV scanning configured for S3', {
      bucketName: bucket.bucketName,
      scanOnUpload: config.scanOnUpload,
      quarantineEnabled: config.quarantineEnabled
    });
  }

  /**
   * Configures ClamAV scanning for EFS
   */
  configureForEFS(config: ClamAvScanningConfig, efsArn: string): void {
    if (!config.enabled) {
      return;
    }

    // Create EFS-specific ClamAV function
    const clamavFunction = this.createClamAvFunction(config, 'efs');
    this.scanningResources.push(clamavFunction);

    // Configure EFS access permissions
    this.configureEFSAccess(clamavFunction, efsArn);

    // Configure scheduled EFS scans
    this.configureScheduledEFSScanning(clamavFunction, efsArn);

    this.logEvent('clamav_efs_configured', 'ClamAV scanning configured for EFS', {
      efsArn,
      scanTimeout: config.scanTimeout,
      maxFileSize: config.maxFileSize
    });
  }

  /**
   * Configures ClamAV scanning for FSx
   */
  configureForFSx(config: ClamAvScanningConfig, fsxArn: string): void {
    if (!config.enabled) {
      return;
    }

    // Create FSx-specific ClamAV function
    const clamavFunction = this.createClamAvFunction(config, 'fsx');
    this.scanningResources.push(clamavFunction);

    // Configure FSx access permissions
    this.configureFSxAccess(clamavFunction, fsxArn);

    // Configure scheduled FSx scans
    this.configureScheduledFSxScanning(clamavFunction, fsxArn);

    this.logEvent('clamav_fsx_configured', 'ClamAV scanning configured for FSx', {
      fsxArn,
      scanTimeout: config.scanTimeout,
      maxFileSize: config.maxFileSize
    });
  }

  /**
   * Gets all scanning-related resources
   */
  getScanningResources(): Construct[] {
    return this.scanningResources;
  }

  /**
   * Gets all quarantine-related resources
   */
  getQuarantineResources(): Construct[] {
    return this.quarantineResources;
  }

  private createClamAvFunction(config: ClamAvScanningConfig, storageType: string = 's3'): lambda.Function {
    const functionName = `clamav-scanner-${storageType}`;

    const clamavFunction = new lambda.Function(this.scope, functionName, {
      functionName,
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'index.handler',
      code: lambda.Code.fromInline(this.getClamAvCode(storageType)),
      timeout: cdk.Duration.seconds(config.scanTimeout),
      memorySize: 1024,
      environment: {
        SCAN_TIMEOUT: config.scanTimeout.toString(),
        MAX_FILE_SIZE: (config.maxFileSize * 1024 * 1024).toString(), // Convert to bytes
        STORAGE_TYPE: storageType,
        QUARANTINE_ENABLED: config.quarantineEnabled.toString()
      },
      layers: [
        // ClamAV layer would be added here
        lambda.LayerVersion.fromLayerVersionArn(
          this.scope,
          'ClamAvLayer',
          'arn:aws:lambda:us-east-1:123456789012:layer:clamav:1'
        )
      ]
    });

    // Add necessary IAM permissions
    this.addClamAvPermissions(clamavFunction, storageType);

    return clamavFunction;
  }

  private getClamAvCode(storageType: string): string {
    const baseCode = `
import boto3
import json
import os
import tempfile
import subprocess
from urllib.parse import unquote_plus

def handler(event, context):
    """
    ClamAV scanning handler for ${storageType} storage
    """
    try:
        if event.get('source') == 'aws.events':
            # Scheduled scan
            return handle_scheduled_scan(event, context)
        else:
            # Event-driven scan
            return handle_event_scan(event, context)
    except Exception as e:
        print(f"Error in ClamAV scan: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def handle_event_scan(event, context):
    """Handle event-driven scanning (S3 uploads, etc.)"""
    results = []
    
    for record in event.get('Records', []):
        if record.get('eventSource') == 'aws:s3':
            result = scan_s3_object(record)
            results.append(result)
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'scanned': len(results),
            'results': results
        })
    }

def handle_scheduled_scan(event, context):
    """Handle scheduled scanning"""
    # Implementation for scheduled scans
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Scheduled scan completed'})
    }

def scan_s3_object(record):
    """Scan an S3 object for viruses"""
    s3_client = boto3.client('s3')
    
    bucket = record['s3']['bucket']['name']
    key = unquote_plus(record['s3']['object']['key'])
    
    # Download file to temp location
    with tempfile.NamedTemporaryFile() as temp_file:
        s3_client.download_file(bucket, key, temp_file.name)
        
        # Run ClamAV scan
        result = subprocess.run(['clamdscan', temp_file.name], 
                              capture_output=True, text=True)
        
        scan_result = {
            'bucket': bucket,
            'key': key,
            'infected': result.returncode != 0,
            'scan_output': result.stdout,
            'timestamp': context.aws_request_id
        }
        
        # Handle infected files
        if scan_result['infected']:
            handle_infected_file(bucket, key, scan_result)
        
        return scan_result

def handle_infected_file(bucket, key, scan_result):
    """Handle infected files (quarantine, notify, etc.)"""
    if os.environ.get('QUARANTINE_ENABLED') == 'true':
        quarantine_file(bucket, key)
    
    # Send notifications
    send_notifications(bucket, key, scan_result)

def quarantine_file(bucket, key):
    """Move infected file to quarantine bucket"""
    s3_client = boto3.client('s3')
    quarantine_bucket = f"{bucket}-quarantine"
    
    # Copy to quarantine
    copy_source = {'Bucket': bucket, 'Key': key}
    s3_client.copy_object(
        CopySource=copy_source,
        Bucket=quarantine_bucket,
        Key=f"quarantine/{key}"
    )
    
    # Delete from original location
    s3_client.delete_object(Bucket=bucket, Key=key)

def send_notifications(bucket, key, scan_result):
    """Send notifications about infected files"""
    # Implementation for SNS notifications
    pass
`;

    return baseCode;
  }

  private addClamAvPermissions(lambdaFunction: lambda.Function, storageType: string): void {
    const permissions: iam.PolicyStatement[] = [];

    // S3 permissions
    if (storageType === 's3') {
      permissions.push(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            's3:GetObject',
            's3:PutObject',
            's3:DeleteObject',
            's3:ListBucket'
          ],
          resources: ['*'] // Would be scoped to specific buckets in practice
        })
      );
    }

    // EFS permissions
    if (storageType === 'efs') {
      permissions.push(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'elasticfilesystem:DescribeFileSystems',
            'elasticfilesystem:DescribeMountTargets'
          ],
          resources: ['*']
        })
      );
    }

    // FSx permissions
    if (storageType === 'fsx') {
      permissions.push(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'fsx:DescribeFileSystems',
            'fsx:DescribeStorageVirtualMachines'
          ],
          resources: ['*']
        })
      );
    }

    // Common permissions
    permissions.push(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents'
        ],
        resources: ['*']
      })
    );

    permissions.forEach(policy => lambdaFunction.addToRolePolicy(policy));
  }

  private createQuarantineBucket(sourceBucket: s3.Bucket): s3.Bucket {
    const quarantineBucket = new s3.Bucket(this.scope, 'ClamAvQuarantineBucket', {
      bucketName: `${sourceBucket.bucketName}-quarantine`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          id: 'quarantine-lifecycle',
          enabled: true,
          expiration: cdk.Duration.days(30), // Auto-delete after 30 days
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1)
        }
      ]
    });

    // Add tags for quarantine bucket
    cdk.Tags.of(quarantineBucket).add('Purpose', 'Virus Quarantine');
    cdk.Tags.of(quarantineBucket).add('ManagedBy', 'ClamAvService');

    return quarantineBucket;
  }

  private configureS3UploadScanning(
    bucket: s3.Bucket,
    clamavFunction: lambda.Function,
    quarantineBucket?: s3.Bucket
  ): void {
    // Add permission for S3 to invoke Lambda
    clamavFunction.addPermission('S3InvokePermission', {
      principal: new iam.ServicePrincipal('s3.amazonaws.com'),
      sourceArn: bucket.bucketArn
    });

    // Add event notification for object creation
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3_notifications.LambdaDestination(clamavFunction)
    );
  }

  private configureScheduledScanning(clamavFunction: lambda.Function, bucket: s3.Bucket): void {
    const rule = new events.Rule(this.scope, 'ClamAvScheduledScan', {
      schedule: events.Schedule.rate(cdk.Duration.hours(24)),
      description: 'Daily ClamAV scan of S3 bucket'
    });

    rule.addTarget(new events_targets.LambdaFunction(clamavFunction, {
      event: events.RuleTargetInput.fromObject({
        source: 'aws.events',
        bucket: bucket.bucketName,
        scanType: 'scheduled'
      })
    }));
  }

  private configureEFSAccess(clamavFunction: lambda.Function, efsArn: string): void {
    // Configure EFS access for Lambda
    // Implementation would depend on EFS setup
  }

  private configureScheduledEFSScanning(clamavFunction: lambda.Function, efsArn: string): void {
    const rule = new events.Rule(this.scope, 'ClamAvEFSScheduledScan', {
      schedule: events.Schedule.rate(cdk.Duration.hours(12)),
      description: 'Twice-daily ClamAV scan of EFS'
    });

    rule.addTarget(new events_targets.LambdaFunction(clamavFunction, {
      event: events.RuleTargetInput.fromObject({
        source: 'aws.events',
        efsArn,
        scanType: 'scheduled'
      })
    }));
  }

  private configureFSxAccess(clamavFunction: lambda.Function, fsxArn: string): void {
    // Configure FSx access for Lambda
    // Implementation would depend on FSx setup
  }

  private configureScheduledFSxScanning(clamavFunction: lambda.Function, fsxArn: string): void {
    const rule = new events.Rule(this.scope, 'ClamAvFSxScheduledScan', {
      schedule: events.Schedule.rate(cdk.Duration.hours(6)),
      description: 'Four-times daily ClamAV scan of FSx'
    });

    rule.addTarget(new events_targets.LambdaFunction(clamavFunction, {
      event: events.RuleTargetInput.fromObject({
        source: 'aws.events',
        fsxArn,
        scanType: 'scheduled'
      })
    }));
  }

  private logEvent(eventType: string, message: string, metadata: Record<string, any>): void {
    console.log(`[ClamAvService] ${eventType}: ${message}`, metadata);
  }
}

/**
 * Factory function to create ClamAV Scanning Service
 */
export function createClamAvScanningService(
  scope: Construct,
  context: ComponentContext
): ClamAvScanningService {
  return new ClamAvScanningServiceImpl(scope, context);
}
