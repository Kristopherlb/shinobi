import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({});

/**
 * Lambda worker handler for processing messages from SQS
 * Processes messages and stores the results in S3
 */
export const handler = async (
  event: SQSEvent,
  context: Context
): Promise<void> => {
  // Get bucket name from environment variable (injected by binder)
  // The binder sets S3_BUCKET_NAME by default
  const bucketName = process.env.S3_BUCKET_NAME;

  if (!bucketName) {
    throw new Error('Missing S3_BUCKET_NAME environment variable');
  }

  // Process each SQS record
  for (const record of event.Records) {
    try {
      await processRecord(record, bucketName, context);
    } catch (error) {
      console.error(`Error processing record ${record.messageId}:`, error);
      // Re-throw to trigger DLQ if configured
      throw error;
    }
  }
};

async function processRecord(
  record: SQSRecord,
  bucketName: string,
  context: Context
): Promise<void> {
  // Parse the message body
  const messageBody = JSON.parse(record.body);
  const { data, timestamp, source, requestId } = messageBody;

  console.log(`Processing record: ${record.messageId}, requestId: ${requestId}`);

  // Process the data (example processing: add metadata and transform)
  const processedData = {
    original: data,
    processed: true,
    processedAt: new Date().toISOString(),
    processor: 'lambda-worker',
    processingTime: Date.now() - timestamp,
    messageId: record.messageId,
    receiptHandle: record.receiptHandle,
    requestId,
    source,
    awsRequestId: context.awsRequestId,
    // Example transformation: add a processing indicator
    result: {
      status: 'success',
      processedData: typeof data === 'string' ? data.toUpperCase() : data,
    },
  };

  // Generate S3 key with timestamp for organization
  const date = new Date();
  const datePath = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  const s3Key = `processed/${datePath}/${timestamp}-${record.messageId}.json`;

  // Store processed data in S3
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: JSON.stringify(processedData, null, 2),
      ContentType: 'application/json',
      Metadata: {
        messageId: record.messageId,
        processedAt: processedData.processedAt,
        source: source || 'unknown',
      },
    })
  );

  console.log(`Successfully processed and stored: ${s3Key}`);
}

