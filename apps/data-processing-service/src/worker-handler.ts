import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const s3Client = new S3Client({});

/**
 * Lambda worker handler for processing messages from SQS
 * Reads data from S3, processes it, and stores the result back to S3
 */
export const handler = async (
  event: SQSEvent,
  context: Context
): Promise<void> => {
  const bucketName = process.env.DATA_BUCKET_NAME;

  if (!bucketName) {
    throw new Error('Missing DATA_BUCKET_NAME environment variable');
  }

  // Process each SQS record
  for (const record of event.Records) {
    try {
      await processRecord(record, bucketName);
    } catch (error) {
      console.error(`Error processing record ${record.messageId}:`, error);
      // Re-throw to trigger DLQ if configured
      throw error;
    }
  }
};

async function processRecord(record: SQSRecord, bucketName: string): Promise<void> {
  // Parse the message body
  const messageBody = JSON.parse(record.body);
  const { s3Key, timestamp } = messageBody;

  console.log(`Processing record: ${record.messageId}, S3 key: ${s3Key}`);

  // Read the original data from S3
  const getObjectResponse = await s3Client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    })
  );

  // Read the stream
  const stream = getObjectResponse.Body as Readable;
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  const data = JSON.parse(Buffer.concat(chunks).toString());

  // Process the data (example: add processing metadata)
  const processedData = {
    ...data,
    processed: true,
    processedAt: new Date().toISOString(),
    processor: 'lambda-worker',
    processingTime: Date.now() - timestamp,
  };

  // Store processed data back to S3
  const processedKey = `processed/${s3Key.split('/').pop()}`;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: processedKey,
      Body: JSON.stringify(processedData),
      ContentType: 'application/json',
    })
  );

  console.log(`Successfully processed and stored: ${processedKey}`);
}

