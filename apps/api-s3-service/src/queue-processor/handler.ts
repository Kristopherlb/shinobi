import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-west-2' });

/**
 * Lambda handler that processes messages from SQS queue and uploads files to S3
 * 
 * Environment variables (set by bindings):
 * - BUCKET_NAME: The S3 bucket name (from file-bucket binding)
 * - BUCKET_ARN: The S3 bucket ARN (from file-bucket binding)
 */
export const handler = async (
  event: SQSEvent,
  context: Context
): Promise<void> => {
  const bucketName = process.env.BUCKET_NAME;

  if (!bucketName) {
    console.error('BUCKET_NAME environment variable is not set');
    throw new Error('Configuration error: BUCKET_NAME not set');
  }

  // Process each message in the batch
  const results = await Promise.allSettled(
    event.Records.map(async (record: SQSRecord) => {
      try {
        // Parse the message body
        const messageBody = JSON.parse(record.body);
        
        console.log('Processing SQS message', {
          messageId: record.messageId,
          receiptHandle: record.receiptHandle,
          requestId: context.requestId,
          messageBody: messageBody,
        });

        // Generate file content based on the message
        const fileContent = generateFileContent(messageBody, record);
        
        // Generate a unique file key
        const fileKey = generateFileKey(messageBody, record);
        
        // Upload to S3
        const putCommand = new PutObjectCommand({
          Bucket: bucketName,
          Key: fileKey,
          Body: fileContent,
          ContentType: 'application/json',
          Metadata: {
            'source': 'sqs-queue-processor',
            'message-id': record.messageId,
            'request-id': context.requestId,
            'processed-at': new Date().toISOString(),
          },
        });

        const response = await s3Client.send(putCommand);

        console.log('File uploaded to S3 successfully', {
          bucketName,
          fileKey,
          messageId: record.messageId,
          etag: response.ETag,
          requestId: context.requestId,
        });

        return {
          success: true,
          messageId: record.messageId,
          fileKey,
          etag: response.ETag,
        };
      } catch (error) {
        console.error('Error processing SQS message', {
          messageId: record.messageId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          requestId: context.requestId,
        });
        
        // Re-throw to trigger SQS retry/DLQ
        throw error;
      }
    })
  );

  // Log batch processing results
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log('Batch processing complete', {
    total: event.Records.length,
    successful,
    failed,
    requestId: context.requestId,
  });

  // If any messages failed, throw to trigger partial batch failure handling
  if (failed > 0) {
    const failedIndices = results
      .map((r, i) => r.status === 'rejected' ? i : -1)
      .filter(i => i !== -1);
    
    throw new Error(`Failed to process ${failed} message(s) at indices: ${failedIndices.join(', ')}`);
  }
};

/**
 * Generates file content based on the SQS message
 */
function generateFileContent(messageBody: any, record: SQSRecord): string {
  const processedData = {
    originalMessage: messageBody,
    processingMetadata: {
      processedAt: new Date().toISOString(),
      messageId: record.messageId,
      messageAttributes: record.messageAttributes || {},
      receiptHandle: record.receiptHandle,
      approximateReceiveCount: record.attributes?.ApproximateReceiveCount || '0',
    },
    generatedContent: {
      summary: `Processed message from ${messageBody.path || 'unknown'}`,
      timestamp: messageBody.timestamp || new Date().toISOString(),
      requestId: messageBody.requestId,
      data: messageBody.body || messageBody,
    },
  };

  return JSON.stringify(processedData, null, 2);
}

/**
 * Generates a unique file key for S3 upload
 */
function generateFileKey(messageBody: any, record: SQSRecord): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const messageId = record.messageId.replace(/[^a-zA-Z0-9]/g, '-');
  const prefix = messageBody.path?.replace(/[^a-zA-Z0-9]/g, '-') || 'processed';
  
  return `processed/${prefix}/${timestamp}-${messageId}.json`;
}


