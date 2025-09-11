"use strict";
/**
 * Jest setup file for Route 53 Record component tests
 */
// Mock only specific CDK modules that cause issues in tests
jest.mock('aws-cdk-lib/aws-route53', () => ({
    HostedZone: {
        fromLookup: jest.fn().mockImplementation(() => ({
            hostedZoneId: 'Z1234567890',
            zoneName: 'example.com.'
        }))
    },
    ARecord: jest.fn().mockImplementation(() => ({
        recordName: 'test.example.com',
        recordType: 'A'
    })),
    AaaaRecord: jest.fn().mockImplementation(() => ({
        recordName: 'test.example.com',
        recordType: 'AAAA'
    })),
    CnameRecord: jest.fn().mockImplementation(() => ({
        recordName: 'test.example.com',
        recordType: 'CNAME'
    })),
    MxRecord: jest.fn().mockImplementation(() => ({
        recordName: 'test.example.com',
        recordType: 'MX'
    })),
    TxtRecord: jest.fn().mockImplementation(() => ({
        recordName: 'test.example.com',
        recordType: 'TXT'
    })),
    NsRecord: jest.fn().mockImplementation(() => ({
        recordName: 'test.example.com',
        recordType: 'NS'
    })),
    SrvRecord: jest.fn().mockImplementation(() => ({
        recordName: 'test.example.com',
        recordType: 'SRV'
    })),
    RecordSet: jest.fn().mockImplementation(() => ({
        recordName: 'test.example.com',
        recordType: 'A'
    })),
    RecordTarget: {
        fromValues: jest.fn().mockImplementation((...values) => values)
    }
}));
// Mock CDK Duration and Stack
jest.mock('aws-cdk-lib', () => ({
    Duration: {
        seconds: jest.fn((seconds) => seconds)
    },
    Stack: jest.fn().mockImplementation(() => ({
        node: {
            id: 'test-stack',
            addChild: jest.fn()
        }
    }))
}));
