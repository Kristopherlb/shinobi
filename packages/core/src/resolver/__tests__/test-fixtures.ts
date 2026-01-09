export const TestFixtures = {
  manifestWithVpcBinding: () => ({
    service: 'test-service',
    owner: 'platform-team',
    complianceFramework: 'commercial',
    environment: 'test',
    components: [
      { name: 'rds', type: 'rds-postgres', config: { vpc: { enabled: true } }, binds: [{ to: 'vpc', capability: 'networking:vpc', access: 'read' }] },
      { name: 'vpc', type: 'vpc', config: {} }
    ]
  }),
  manifestWithCircularBindings: () => ({
    service: 'test-service',
    owner: 'platform-team',
    complianceFramework: 'commercial',
    environment: 'test',
    components: [
      { name: 'service-a', type: 'lambda-api', config: {}, binds: [{ to: 'service-b', capability: 'api:rest', access: 'read' }] },
      { name: 'service-b', type: 'lambda-api', config: {}, binds: [{ to: 'service-a', capability: 'api:rest', access: 'read' }] }
    ]
  }),
  manifestWithEnvVarConflict: () => ({
    service: 'test-service',
    owner: 'platform-team',
    complianceFramework: 'commercial',
    environment: 'test',
    components: [
      { name: 'vpc-a', type: 'vpc', config: {} },
      { name: 'vpc-b', type: 'vpc', config: {} },
      {
        name: 'lambda',
        type: 'lambda-api',
        config: {},
        binds: [
          { to: 'vpc-a', capability: 'networking:vpc', access: 'read' },
          { to: 'vpc-b', capability: 'networking:vpc', access: 'read' }
        ]
      }
    ]
  }),
  manifestWithPolicyConflict: () => ({
    service: 'test-service',
    owner: 'platform-team',
    complianceFramework: 'commercial',
    environment: 'test',
    components: [
      { name: 'bucket-a', type: 's3-bucket', config: {} },
      { name: 'bucket-b', type: 's3-bucket', config: {} },
      {
        name: 'lambda',
        type: 'lambda-api',
        config: {},
        binds: [
          { to: 'bucket-a', capability: 'storage:s3', access: 'read' },
          { to: 'bucket-b', capability: 'storage:s3', access: 'write' }
        ]
      }
    ]
  })
};
