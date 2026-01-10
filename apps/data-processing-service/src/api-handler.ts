import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const sqsClient = new SQSClient({});
const s3Client = new S3Client({});

/**
 * Lambda handler for data processing API
 * Receives data, stores it in S3, and sends a message to the processing queue
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Get queue URL and bucket name from environment variables
    const queueUrl = process.env.PROCESSING_QUEUE_URL;
    const bucketName = process.env.DATA_BUCKET_NAME;

    if (!queueUrl || !bucketName) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Missing required environment variables',
        }),
      };
    }

    // Parse request body
    const body = event.body ? JSON.parse(event.body) : {};
    const data = body.data || '';

    // Generate a unique key for S3
    const timestamp = Date.now();
    const s3Key = `uploads/${timestamp}-${Math.random().toString(36).substring(7)}.json`;

    // Store data in S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: JSON.stringify({
          data,
          timestamp,
          source: 'api',
        }),
        ContentType: 'application/json',
      })
    );

    // Send message to processing queue
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({
          s3Key,
          bucketName,
          timestamp,
        }),
      })
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Data received and queued for processing',
        s3Key,
        timestamp,
      }),
    };
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

