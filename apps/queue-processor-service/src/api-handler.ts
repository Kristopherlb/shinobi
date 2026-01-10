import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({});

/**
 * Lambda handler for queue processor API
 * Receives API requests and sends messages to SQS queue for processing
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Get queue URL from environment variable (injected by binder)
    // The binder sets SQS_QUEUE_URL by default
    const queueUrl = process.env.SQS_QUEUE_URL;

    if (!queueUrl) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Missing required environment variable: SQS_QUEUE_URL',
        }),
      };
    }

    // Parse request body
    const body = event.body ? JSON.parse(event.body) : {};
    const data = body.data || body;

    // Create message payload
    const messagePayload = {
      data,
      timestamp: Date.now(),
      source: 'api',
      requestId: event.requestContext?.requestId || 'unknown',
      httpMethod: event.httpMethod,
      path: event.path,
    };

    // Send message to SQS queue
    const response = await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(messagePayload),
        MessageAttributes: {
          Source: {
            DataType: 'String',
            StringValue: 'api',
          },
          Timestamp: {
            DataType: 'Number',
            StringValue: messagePayload.timestamp.toString(),
          },
        },
      })
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Message queued for processing',
        messageId: response.MessageId,
        timestamp: messagePayload.timestamp,
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

