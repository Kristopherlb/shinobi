import { describe, it, expect, beforeEach, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  mockS3Send: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', async () => {
  const actual = await vi.importActual<typeof import('@aws-sdk/client-s3')>('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: vi.fn(() => ({ send: hoisted.mockS3Send })),
    PutObjectCommand: vi.fn((params) => params),
  };
});

describe('queue-processor handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.BUCKET_NAME;
    process.env.AWS_REGION = 'us-west-2';
  });

  it('Handler__MissingBucketName__ThrowsConfigError', async () => {
    const { handler } = await import('../handler.js');

    await expect(
      handler(
        { Records: [] } as any,
        { requestId: 'req-1' } as any
      )
    ).rejects.toThrow(/BUCKET_NAME not set/);

    expect(hoisted.mockS3Send).not.toHaveBeenCalled();
  });
});


