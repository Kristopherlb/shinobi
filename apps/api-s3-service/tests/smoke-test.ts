#!/usr/bin/env node
/**
 * End-to-End Smoke Test Suite for api-s3-service
 * 
 * Tests the complete flow:
 * 1. API Gateway → Lambda API → SQS Queue
 * 2. SQS Queue → Queue Processor Lambda → S3 Bucket
 * 
 * Usage:
 *   pnpm tsx tests/smoke-test.ts
 * 
 * Or after building:
 *   node tests/smoke-test.js
 */

import { CloudFormationClient, DescribeStacksCommand, DescribeStackResourcesCommand } from '@aws-sdk/client-cloudformation';
import { APIGatewayClient, GetRestApiCommand, GetResourcesCommand } from '@aws-sdk/client-api-gateway';
import { SQSClient, GetQueueAttributesCommand, GetQueueUrlCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

interface TestConfig {
  stackName: string;
  region: string;
  apiEndpoint?: string;
  queueUrl?: string;
  bucketName?: string;
  apiLambdaName?: string;
  queueProcessorLambdaName?: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

class SmokeTestSuite {
  private config: TestConfig;
  private cloudFormation: CloudFormationClient;
  private apiGateway: APIGatewayClient;
  private sqs: SQSClient;
  private s3: S3Client;
  private lambda: LambdaClient;
  private logs: CloudWatchLogsClient;
  private results: TestResult[] = [];

  constructor(config: TestConfig) {
    this.config = config;
    this.cloudFormation = new CloudFormationClient({ region: config.region });
    this.apiGateway = new APIGatewayClient({ region: config.region });
    this.sqs = new SQSClient({ region: config.region });
    this.s3 = new S3Client({ region: config.region });
    this.lambda = new LambdaClient({ region: config.region });
    this.logs = new CloudWatchLogsClient({ region: config.region });
  }

  /**
   * Run all smoke tests
   */
  async run(): Promise<boolean> {
    console.log('🚀 Starting Smoke Test Suite for api-s3-service\n');
    console.log(`Stack: ${this.config.stackName}`);
    console.log(`Region: ${this.config.region}\n`);

    try {
      // Step 1: Discover resources
      await this.test('Discover Stack Resources', () => this.discoverResources());

      // Step 2: Test API endpoint
      const testMessageId = await this.test('API Endpoint Health Check', () => this.testApiEndpoint());

      // Step 3: Verify message in SQS
      await this.test('SQS Message Received', () => this.verifySqsMessage(testMessageId));

      // Step 4: Wait for processing
      await this.test('Queue Processor Execution', () => this.waitForProcessing());

      // Step 5: Verify S3 file created
      await this.test('S3 File Created', () => this.verifyS3File(testMessageId));

      // Step 6: Verify Lambda logs
      await this.test('Lambda Logs Verification', () => this.verifyLambdaLogs());

      // Print summary
      this.printSummary();

      return this.results.every(r => r.passed);
    } catch (error) {
      console.error('\n❌ Smoke test suite failed:', error);
      return false;
    }
  }

  /**
   * Run a single test with error handling
   */
  private async test(name: string, testFn: () => Promise<any>): Promise<any> {
    process.stdout.write(`\n🧪 ${name}... `);
    try {
      const result = await testFn();
      console.log('✅ PASSED');
      this.results.push({ name, passed: true, details: result });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`❌ FAILED: ${errorMessage}`);
      this.results.push({ name, passed: false, error: errorMessage });
      throw error;
    }
  }

  /**
   * Discover stack resources
   */
  private async discoverResources(): Promise<void> {
    const stackResources = await this.cloudFormation.send(
      new DescribeStackResourcesCommand({
        StackName: this.config.stackName,
      })
    );

    // Find API Gateway
    const apiResource = stackResources.StackResources?.find(
      r => r.ResourceType === 'AWS::ApiGateway::RestApi'
    );
    if (apiResource?.PhysicalResourceId) {
      const api = await this.apiGateway.send(
        new GetRestApiCommand({ restApiId: apiResource.PhysicalResourceId })
      );
      this.config.apiEndpoint = `https://${apiResource.PhysicalResourceId}.execute-api.${this.config.region}.amazonaws.com/dev`;
    }

    // Find SQS Queue
    const queueResource = stackResources.StackResources?.find(
      r => r.ResourceType === 'AWS::SQS::Queue' && r.LogicalResourceId?.includes('MainQueue')
    );
    if (queueResource?.PhysicalResourceId) {
      const queueUrlResponse = await this.sqs.send(
        new GetQueueUrlCommand({ QueueName: queueResource.PhysicalResourceId })
      );
      this.config.queueUrl = queueUrlResponse.QueueUrl;
    }

    // Find S3 Bucket
    const bucketResource = stackResources.StackResources?.find(
      r => r.ResourceType === 'AWS::S3::Bucket'
    );
    if (bucketResource?.PhysicalResourceId) {
      this.config.bucketName = bucketResource.PhysicalResourceId;
    }

    // Find Lambda functions
    const apiLambda = stackResources.StackResources?.find(
      r => r.ResourceType === 'AWS::Lambda::Function' && r.LogicalResourceId?.includes('file-storage-api')
    );
    if (apiLambda?.PhysicalResourceId) {
      this.config.apiLambdaName = apiLambda.PhysicalResourceId;
    }

    const queueProcessorLambda = stackResources.StackResources?.find(
      r => r.ResourceType === 'AWS::Lambda::Function' && r.LogicalResourceId?.includes('queue-processor')
    );
    if (queueProcessorLambda?.PhysicalResourceId) {
      this.config.queueProcessorLambdaName = queueProcessorLambda.PhysicalResourceId;
    }

    if (!this.config.apiEndpoint) {
      throw new Error('API Gateway endpoint not found');
    }
    if (!this.config.queueUrl) {
      throw new Error('SQS queue URL not found');
    }
    if (!this.config.bucketName) {
      throw new Error('S3 bucket name not found');
    }

    return {
      apiEndpoint: this.config.apiEndpoint,
      queueUrl: this.config.queueUrl,
      bucketName: this.config.bucketName,
      apiLambdaName: this.config.apiLambdaName,
      queueProcessorLambdaName: this.config.queueProcessorLambdaName,
    };
  }

  /**
   * Test API endpoint by sending a request
   */
  private async testApiEndpoint(): Promise<string> {
    if (!this.config.apiEndpoint) {
      throw new Error('API endpoint not discovered');
    }

    const testPayload = {
      test: true,
      timestamp: new Date().toISOString(),
      smokeTest: true,
      message: 'Smoke test message from automated test suite',
    };

    const response = await fetch(this.config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const responseData = await response.json();
    
    if (!responseData.success || !responseData.messageId) {
      throw new Error(`Unexpected API response: ${JSON.stringify(responseData)}`);
    }

    return responseData.messageId;
  }

  /**
   * Verify message was received in SQS
   */
  private async verifySqsMessage(messageId: string): Promise<void> {
    if (!this.config.queueUrl) {
      throw new Error('Queue URL not discovered');
    }

    // Poll for the message (up to 30 seconds)
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const receiveResponse = await this.sqs.send(
        new ReceiveMessageCommand({
          QueueUrl: this.config.queueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 2,
          MessageAttributeNames: ['All'],
        })
      );

      if (receiveResponse.Messages && receiveResponse.Messages.length > 0) {
        // Check if any message matches our test
        const testMessage = receiveResponse.Messages.find(msg => {
          try {
            const body = JSON.parse(msg.Body || '{}');
            return body.smokeTest === true || body.test === true;
          } catch {
            return false;
          }
        });

        if (testMessage) {
          // Delete the message to clean up
          await this.sqs.send(
            new DeleteMessageCommand({
              QueueUrl: this.config.queueUrl,
              ReceiptHandle: testMessage.ReceiptHandle,
            })
          );
          return;
        }
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Message not found in SQS queue after 30 seconds');
  }

  /**
   * Wait for queue processor to process the message
   */
  private async waitForProcessing(): Promise<void> {
    // Wait up to 60 seconds for processing
    const maxWaitTime = 60000; // 60 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      // Check S3 for new files
      if (!this.config.bucketName) {
        throw new Error('Bucket name not discovered');
      }

      const listResponse = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: this.config.bucketName,
          Prefix: 'processed/',
          MaxKeys: 10,
        })
      );

      // Check if any file was created in the last minute
      const recentFiles = listResponse.Contents?.filter(obj => {
        if (!obj.LastModified) return false;
        const fileAge = Date.now() - obj.LastModified.getTime();
        return fileAge < 120000; // Last 2 minutes
      });

      if (recentFiles && recentFiles.length > 0) {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('No files created in S3 after 60 seconds');
  }

  /**
   * Verify S3 file was created and contains expected content
   */
  private async verifyS3File(messageId: string): Promise<void> {
    if (!this.config.bucketName) {
      throw new Error('Bucket name not discovered');
    }

    const listResponse = await this.s3.send(
      new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        Prefix: 'processed/',
        MaxKeys: 10,
      })
    );

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      throw new Error('No files found in S3 bucket');
    }

    // Get the most recent file
    const sortedFiles = listResponse.Contents.sort(
      (a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)
    );
    const latestFile = sortedFiles[0];

    if (!latestFile.Key) {
      throw new Error('File key not found');
    }

    // Download and verify file content
    const getResponse = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: latestFile.Key,
      })
    );

    const fileContent = await getResponse.Body?.transformToString();
    if (!fileContent) {
      throw new Error('File content is empty');
    }

    const parsedContent = JSON.parse(fileContent);
    
    // Verify it's from our smoke test
    if (!parsedContent.originalMessage?.smokeTest && !parsedContent.originalMessage?.test) {
      throw new Error('File does not contain smoke test data');
    }

    return {
      fileKey: latestFile.Key,
      fileSize: latestFile.Size,
      lastModified: latestFile.LastModified,
    };
  }

  /**
   * Verify Lambda logs for errors
   */
  private async verifyLambdaLogs(): Promise<void> {
    const logGroups = [
      `/aws/lambda/${this.config.apiLambdaName}`,
      `/aws/lambda/${this.config.queueProcessorLambdaName}`,
    ].filter(Boolean);

    const errors: string[] = [];

    for (const logGroup of logGroups) {
      try {
        const logResponse = await this.logs.send(
          new FilterLogEventsCommand({
            logGroupName: logGroup,
            startTime: Date.now() - 300000, // Last 5 minutes
            filterPattern: 'ERROR',
            limit: 10,
          })
        );

        if (logResponse.events && logResponse.events.length > 0) {
          const errorMessages = logResponse.events
            .map(e => e.message)
            .filter(Boolean) as string[];
          errors.push(...errorMessages);
        }
      } catch (error) {
        // Log group might not exist yet, that's okay
        console.warn(`Warning: Could not check logs for ${logGroup}`);
      }
    }

    if (errors.length > 0) {
      // Check if errors are critical or just warnings
      const criticalErrors = errors.filter(e => 
        !e.includes('WARNING') && 
        !e.includes('warning') &&
        !e.includes('Environment \'dev\' is not a standard')
      );

      if (criticalErrors.length > 0) {
        throw new Error(`Critical errors found in logs: ${criticalErrors.join('; ')}`);
      }
    }

    return { errorsFound: errors.length, criticalErrors: 0 };
  }

  /**
   * Print test summary
   */
  private printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    this.results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.name}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('\n' + '-'.repeat(60));
    console.log(`Total: ${this.results.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log('='.repeat(60) + '\n');

    if (failed > 0) {
      console.log('❌ SMOKE TESTS FAILED');
      console.log('\nNext steps:');
      console.log('1. Review the error messages above');
      console.log('2. Check CloudWatch logs for detailed errors');
      console.log('3. Fix the issues and redeploy:');
      console.log('   pnpm shinobi up -f apps/api-s3-service/service.yml');
      console.log('4. Run tests again:');
      console.log('   pnpm tsx tests/smoke-test.ts\n');
      process.exit(1);
    } else {
      console.log('✅ ALL SMOKE TESTS PASSED\n');
    }
  }
}

// Main execution
async function main() {
  const stackName = process.env.STACK_NAME || 'api-s3-service-dev';
  const region = process.env.AWS_REGION || 'us-west-2';

  const suite = new SmokeTestSuite({
    stackName,
    region,
  });

  const success = await suite.run();
  process.exit(success ? 0 : 1);
}

// Run if executed directly (tsx handles this automatically, but keep for compatibility)
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { SmokeTestSuite };

