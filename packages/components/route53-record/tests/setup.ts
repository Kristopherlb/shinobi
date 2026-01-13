/**
 * Vitest setup file for Route 53 Record component tests
 */
import { vi } from 'vitest';

// Mock only specific CDK modules that cause issues in tests
vi.mock('aws-cdk-lib/aws-route53', () => ({
  HostedZone: {
    fromLookup: vi.fn().mockImplementation(() => ({
      hostedZoneId: 'Z1234567890',
      zoneName: 'example.com.'
    }))
  },
  ARecord: vi.fn().mockImplementation(() => ({
    recordName: 'test.example.com',
    recordType: 'A'
  })),
  AaaaRecord: vi.fn().mockImplementation(() => ({
    recordName: 'test.example.com',
    recordType: 'AAAA'
  })),
  CnameRecord: vi.fn().mockImplementation(() => ({
    recordName: 'test.example.com',
    recordType: 'CNAME'
  })),
  MxRecord: vi.fn().mockImplementation(() => ({
    recordName: 'test.example.com',
    recordType: 'MX'
  })),
  TxtRecord: vi.fn().mockImplementation(() => ({
    recordName: 'test.example.com',
    recordType: 'TXT'
  })),
  NsRecord: vi.fn().mockImplementation(() => ({
    recordName: 'test.example.com',
    recordType: 'NS'
  })),
  SrvRecord: vi.fn().mockImplementation(() => ({
    recordName: 'test.example.com',
    recordType: 'SRV'
  })),
  RecordSet: vi.fn().mockImplementation(() => ({
    recordName: 'test.example.com',
    recordType: 'A'
  })),
  RecordTarget: {
    fromValues: vi.fn().mockImplementation((...values) => values)
  }
}));

// Mock CDK Duration and Stack
vi.mock('aws-cdk-lib', () => ({
  Duration: {
    seconds: vi.fn((seconds) => seconds)
  },
  Stack: vi.fn().mockImplementation(() => ({
    node: { 
      id: 'test-stack',
      addChild: vi.fn()
    }
  }))
}));
