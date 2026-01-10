// Simple test file for the Lambda handler
// This can be expanded with a proper test framework later

import { handler } from '../handler.js';

// Mock AWS SDK
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: jest.fn(() => ({
    send: mockSend,
  })),
  SendMessageCommand: jest.fn((params) => params),
}));

describe('Lambda Handler', () => {
  beforeEach(() => {
    process.env.QUEUE_URL = 'https://sqs.us-west-2.amazonaws.com/123456789012/test-queue';
    process.env.QUEUE_ARN = 'arn:aws:sqs:us-west-2:123456789012:test-queue';
    process.env.AWS_REGION = 'us-west-2';
    mockSend.mockClear();
  });

  it('should send message to SQS queue successfully', async () => {
    mockSend.mockResolvedValue({
      MessageId: 'test-message-id',
      MD5OfMessageBody: 'test-md5',
    });

    const event = {
      httpMethod: 'POST',
      path: '/',
      requestContext: {
        requestId: 'test-request-id',
      },
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'test-agent',
      },
      body: JSON.stringify({
        action: 'test',
        message: 'Hello',
      }),
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).success).toBe(true);
    expect(mockSend).toHaveBeenCalled();
  });

  it('should return error if QUEUE_URL is not set', async () => {
    delete process.env.QUEUE_URL;

    const event = {
      httpMethod: 'POST',
      path: '/',
      requestContext: {
        requestId: 'test-request-id',
      },
      headers: {},
      body: null,
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toContain('QUEUE_URL not set');
  });
});


