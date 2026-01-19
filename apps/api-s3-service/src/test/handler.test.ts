import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock AWS SDK
const hoisted = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock('@aws-sdk/client-sqs', async () => {
  const actual = await vi.importActual<typeof import('@aws-sdk/client-sqs')>('@aws-sdk/client-sqs');
  return {
    ...actual,
    SQSClient: vi.fn(() => ({
      send: hoisted.mockSend,
    })),
    SendMessageCommand: vi.fn((params) => params),
  };
});

describe('Lambda Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.QUEUE_URL = 'https://sqs.us-west-2.amazonaws.com/123456789012/test-queue';
    process.env.QUEUE_ARN = 'arn:aws:sqs:us-west-2:123456789012:test-queue';
    process.env.AWS_REGION = 'us-west-2';
  });

  it('should return error if QUEUE_URL is not set', async () => {
    delete process.env.QUEUE_URL;
    const { handler } = await import('../handler.js');

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

