import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'us-west-2' });

/**
 * Lambda handler that sends messages to the SQS queue
 * 
 * Environment variables (set by bindings):
 * - QUEUE_URL: The SQS queue URL (from file-processing-queue binding)
 * - QUEUE_ARN: The SQS queue ARN (from file-processing-queue binding)
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const queueUrl = process.env.QUEUE_URL;
  const queueArn = process.env.QUEUE_ARN;

  // Validate environment variables
  if (!queueUrl) {
    console.error('QUEUE_URL environment variable is not set');
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Configuration error: QUEUE_URL not set',
        message: 'The Lambda function is not properly configured with SQS queue binding',
      }),
    };
  }

  try {
    // Parse request body
    let messageBody: any;
    try {
      messageBody = event.body ? JSON.parse(event.body) : {};
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Invalid JSON in request body',
          message: 'Request body must be valid JSON',
        }),
      };
    }

    // Extract message data from request
    const messageData = {
      timestamp: new Date().toISOString(),
      requestId: event.requestContext.requestId,
      httpMethod: event.httpMethod,
      path: event.path,
      queryStringParameters: event.queryStringParameters || {},
      body: messageBody,
      headers: {
        'user-agent': event.headers['User-Agent'] || event.headers['user-agent'],
        'content-type': event.headers['Content-Type'] || event.headers['content-type'],
      },
    };

    // Send message to SQS queue
    const sendMessageCommand = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(messageData),
      MessageAttributes: {
        RequestId: {
          DataType: 'String',
          StringValue: event.requestContext.requestId,
        },
        HttpMethod: {
          DataType: 'String',
          StringValue: event.httpMethod,
        },
        Path: {
          DataType: 'String',
          StringValue: event.path,
        },
        Timestamp: {
          DataType: 'String',
          StringValue: messageData.timestamp,
        },
      },
    });

    const response = await sqsClient.send(sendMessageCommand);

    console.log('Message sent to SQS queue', {
      queueUrl,
      queueArn,
      messageId: response.MessageId,
      requestId: event.requestContext.requestId,
      md5OfBody: response.MD5OfMessageBody,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        message: 'Message sent to SQS queue successfully',
        messageId: response.MessageId,
        queueUrl: queueUrl,
        timestamp: messageData.timestamp,
      }),
    };
  } catch (error) {
    console.error('Error sending message to SQS queue', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      queueUrl,
      requestId: event.requestContext.requestId,
    });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to send message to SQS queue',
        message: error instanceof Error ? error.message : String(error),
        requestId: event.requestContext.requestId,
      }),
    };
  }
};


