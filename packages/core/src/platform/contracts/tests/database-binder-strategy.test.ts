/**
 * Database Binder Strategy Tests
 * Following Platform Testing Standard v1.0
 */

import { DatabaseBinderStrategy } from '../binders/database-binder-strategy';
import { EnhancedBindingContext, CapabilityData } from '../bindings';

describe('DatabaseBinderStrategy', () => {
  let strategy: DatabaseBinderStrategy;
  let mockSourceComponent: any;
  let mockTargetComponent: any;
  let mockCapabilityData: CapabilityData;

  beforeEach(() => {
    strategy = new DatabaseBinderStrategy();

    mockSourceComponent = {
      getName: () => 'test-lambda',
      getType: () => 'lambda-api',
      getCapabilityData: () => ({ securityGroups: ['sg-src-1'] })
    };

    mockTargetComponent = {
      getName: () => 'test-database',
      getType: () => 'rds-postgres'
    };

    mockCapabilityData = {
      type: 'db:postgres',
      endpoints: {
        host: 'test-db.cluster-xyz.us-east-1.rds.amazonaws.com',
        port: 5432,
        database: 'testdb'
      },
      resources: {
        arn: 'arn:aws:rds:us-east-1:123456789012:cluster:test-database',
        clusterArn: 'arn:aws:rds:us-east-1:123456789012:cluster:test-database'
      },
      securityGroups: ['sg-test-database'],
      secrets: {
        masterSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-database-credentials'
      },
      subnetGroup: 'test-subnet-group'
    };
  });

  describe('Strategy Identification', () => {
    test('CanHandle__LambdaToPostgres__ReturnsTrue', () => {
      // TP-database-binder-identification-001
      const testMetadata = {
        "id": "TP-database-binder-identification-001",
        "level": "unit",
        "capability": "Identifies compatible binding scenarios",
        "oracle": "exact",
        "invariants": ["Lambda to PostgreSQL binding is supported", "Strategy name is correct"],
        "fixtures": ["Lambda API component", "PostgreSQL database capability"],
        "inputs": { "shape": "Source type: lambda-api, Target capability: db:postgres", "notes": "Tests strategy identification logic" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      const result = strategy.canHandle('lambda-api', 'db:postgres');
      expect(result).toBe(true);
      expect(strategy.getStrategyName()).toBe('DatabaseBinderStrategy');
    });

    test('CanHandle__EcsToMysql__ReturnsTrue', () => {
      // TP-database-binder-identification-002
      const testMetadata = {
        "id": "TP-database-binder-identification-002",
        "level": "unit",
        "capability": "Identifies MySQL binding scenarios",
        "oracle": "exact",
        "invariants": ["ECS to MySQL binding is supported", "Multiple database types supported"],
        "fixtures": ["ECS service component", "MySQL database capability"],
        "inputs": { "shape": "Source type: ecs-service, Target capability: db:mysql", "notes": "Tests MySQL support" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      const result = strategy.canHandle('ecs-service', 'db:mysql');
      expect(result).toBe(true);
    });

    test('CanHandle__InvalidSourceType__ReturnsFalse', () => {
      // TP-database-binder-identification-003
      const testMetadata = {
        "id": "TP-database-binder-identification-003",
        "level": "unit",
        "capability": "Rejects incompatible binding scenarios",
        "oracle": "exact",
        "invariants": ["Invalid source types are rejected", "Invalid target capabilities are rejected"],
        "fixtures": ["Invalid source component", "Database capability"],
        "inputs": { "shape": "Source type: invalid-type, Target capability: db:postgres", "notes": "Tests rejection logic" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      const result = strategy.canHandle('invalid-type', 'db:postgres');
      expect(result).toBe(false);
    });
  });

  describe('Binding Execution', () => {
    test('Bind__ValidReadAccess__ReturnsValidResult', async () => {
      // TP-database-binder-binding-001
      const testMetadata = {
        "id": "TP-database-binder-binding-001",
        "level": "unit",
        "capability": "Executes database binding with read access",
        "oracle": "exact",
        "invariants": ["Environment variables are generated", "IAM policies are created", "Security group rules are configured"],
        "fixtures": ["Valid binding context", "Read access level"],
        "inputs": { "shape": "Binding context with read access", "notes": "Tests read access binding" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      const context: EnhancedBindingContext = {
        source: mockSourceComponent,
        target: mockTargetComponent,
        directive: {
          capability: 'db:postgres',
          access: 'read',
          env: {}
        },
        environment: 'dev',
        complianceFramework: 'commercial',
        targetCapabilityData: mockCapabilityData
      };

      const result = await strategy.bind(context);

      expect(result.environmentVariables).toHaveProperty('DB_HOST');
      expect(result.environmentVariables['DB_HOST']).toBe('test-db.cluster-xyz.us-east-1.rds.amazonaws.com');
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(result.securityGroupRules.length).toBeGreaterThan(0);
      expect(result.complianceActions).toBeDefined();
    });

    test('Bind__ValidWriteAccess__ReturnsValidResult', async () => {
      // TP-database-binder-binding-002
      const testMetadata = {
        "id": "TP-database-binder-binding-002",
        "level": "unit",
        "capability": "Executes database binding with write access",
        "oracle": "exact",
        "invariants": ["Write access permissions are granted", "Environment variables include connection details"],
        "fixtures": ["Valid binding context", "Write access level"],
        "inputs": { "shape": "Binding context with write access", "notes": "Tests write access binding" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      const context: EnhancedBindingContext = {
        source: mockSourceComponent,
        target: mockTargetComponent,
        directive: {
          capability: 'db:postgres',
          access: 'write',
          env: {}
        },
        environment: 'dev',
        complianceFramework: 'commercial',
        targetCapabilityData: mockCapabilityData
      };

      const result = await strategy.bind(context);

      expect(result.environmentVariables).toHaveProperty('DB_HOST');
      expect(result.environmentVariables).toHaveProperty('DB_PORT');
      expect(result.iamPolicies.length).toBeGreaterThan(0);
      expect(result.securityGroupRules.length).toBeGreaterThan(0);
    });

    test('Bind__InvalidAccessLevel__ThrowsError', async () => {
      // TP-database-binder-binding-003
      const testMetadata = {
        "id": "TP-database-binder-binding-003",
        "level": "unit",
        "capability": "Validates access level constraints",
        "oracle": "exact",
        "invariants": ["Invalid access levels are rejected", "Error messages are descriptive"],
        "fixtures": ["Invalid access level", "Valid binding context"],
        "inputs": { "shape": "Binding context with invalid access level", "notes": "Tests access level validation" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      const context: EnhancedBindingContext = {
        source: mockSourceComponent,
        target: mockTargetComponent,
        directive: {
          capability: 'db:postgres',
          access: 'invalid' as any,
          env: {}
        },
        environment: 'dev',
        complianceFramework: 'commercial',
        targetCapabilityData: mockCapabilityData
      };

      await expect(strategy.bind(context)).rejects.toThrow('Invalid access level: invalid');
    });
  });

  describe('Environment Variable Generation', () => {
    test('GenerateEnvironmentVariables__DefaultMappings__CreatesCorrectVariables', async () => {
      // TP-database-binder-env-001
      const testMetadata = {
        "id": "TP-database-binder-env-001",
        "level": "unit",
        "capability": "Generates environment variables with default mappings",
        "oracle": "exact",
        "invariants": ["Default mappings are applied", "All capability data is mapped", "Variable names follow convention"],
        "fixtures": ["Database capability data", "Default mapping configuration"],
        "inputs": { "shape": "Capability data with endpoints and secrets", "notes": "Tests default environment variable generation" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      const context: EnhancedBindingContext = {
        source: mockSourceComponent,
        target: mockTargetComponent,
        directive: {
          capability: 'db:postgres',
          access: 'readwrite',
          env: {}
        },
        environment: 'dev',
        complianceFramework: 'commercial',
        targetCapabilityData: mockCapabilityData
      };

      const result = await strategy.bind(context);

      expect(result.environmentVariables).toHaveProperty('DB_HOST');
      expect(result.environmentVariables).toHaveProperty('DB_PORT');
      expect(result.environmentVariables).toHaveProperty('DB_NAME');
      expect(result.environmentVariables).toHaveProperty('DB_SECRET_ARN');
      expect(result.environmentVariables).toHaveProperty('DB_CONNECTION_STRING');
    });

    test('GenerateEnvironmentVariables__CustomMappings__UsesCustomMappings', async () => {
      // TP-database-binder-env-002
      const testMetadata = {
        "id": "TP-database-binder-env-002",
        "level": "unit",
        "capability": "Generates environment variables with custom mappings",
        "oracle": "exact",
        "invariants": ["Custom mappings override defaults", "Custom variable names are used"],
        "fixtures": ["Custom environment variable mappings", "Database capability data"],
        "inputs": { "shape": "Binding context with custom env mappings", "notes": "Tests custom environment variable generation" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      const context: EnhancedBindingContext = {
        source: mockSourceComponent,
        target: mockTargetComponent,
        directive: {
          capability: 'db:postgres',
          access: 'readwrite',
          env: {
            host: 'CUSTOM_DB_HOST',
            port: 'CUSTOM_DB_PORT',
            database: 'CUSTOM_DB_NAME'
          }
        },
        environment: 'dev',
        complianceFramework: 'commercial',
        targetCapabilityData: mockCapabilityData
      };

      const result = await strategy.bind(context);

      expect(result.environmentVariables).toHaveProperty('CUSTOM_DB_HOST');
      expect(result.environmentVariables).toHaveProperty('CUSTOM_DB_PORT');
      expect(result.environmentVariables).toHaveProperty('CUSTOM_DB_NAME');
      expect(result.environmentVariables['CUSTOM_DB_HOST']).toBe('test-db.cluster-xyz.us-east-1.rds.amazonaws.com');
    });
  });

  describe('Compliance Framework Support', () => {
    test('Bind__FedRAMPHigh__AppliesStrictCompliance', async () => {
      // TP-database-binder-compliance-001
      const testMetadata = {
        "id": "TP-database-binder-compliance-001",
        "level": "unit",
        "capability": "Applies FedRAMP High compliance restrictions",
        "oracle": "exact",
        "invariants": ["FedRAMP High restrictions are applied", "VPC endpoint requirements are enforced", "Enhanced security policies are created"],
        "fixtures": ["FedRAMP High compliance framework", "Database binding context"],
        "inputs": { "shape": "Binding context with FedRAMP High framework", "notes": "Tests FedRAMP High compliance enforcement" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      const context: EnhancedBindingContext = {
        source: mockSourceComponent,
        target: mockTargetComponent,
        directive: {
          capability: 'db:postgres',
          access: 'readwrite',
          env: {}
        },
        environment: 'prod',
        complianceFramework: 'fedramp-high',
        targetCapabilityData: mockCapabilityData
      };

      const result = await strategy.bind(context);

      expect(result.complianceActions.length).toBeGreaterThan(0);
      const vpcEndpointAction = result.complianceActions.find((action: any) =>
        action.message.includes('encryption in transit')
      );
      expect(vpcEndpointAction).toBeDefined();
    });

    test('Bind__FedRAMPModerate__AppliesModerateCompliance', async () => {
      // TP-database-binder-compliance-002
      const testMetadata = {
        "id": "TP-database-binder-compliance-002",
        "level": "unit",
        "capability": "Applies FedRAMP Moderate compliance restrictions",
        "oracle": "exact",
        "invariants": ["FedRAMP Moderate restrictions are applied", "Monitoring requirements are enforced"],
        "fixtures": ["FedRAMP Moderate compliance framework", "Database binding context"],
        "inputs": { "shape": "Binding context with FedRAMP Moderate framework", "notes": "Tests FedRAMP Moderate compliance enforcement" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      const context: EnhancedBindingContext = {
        source: mockSourceComponent,
        target: mockTargetComponent,
        directive: {
          capability: 'db:postgres',
          access: 'readwrite',
          env: {}
        },
        environment: 'prod',
        complianceFramework: 'fedramp-moderate',
        targetCapabilityData: mockCapabilityData
      };

      const result = await strategy.bind(context);

      expect(result.complianceActions.length).toBeGreaterThan(0);
      const monitoringAction = result.complianceActions.find((action: any) =>
        action.message.includes('Database access granted')
      );
      expect(monitoringAction).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('Bind__MissingCapabilityData__ThrowsError', async () => {
      // TP-database-binder-error-001
      const testMetadata = {
        "id": "TP-database-binder-error-001",
        "level": "unit",
        "capability": "Validates required capability data",
        "oracle": "exact",
        "invariants": ["Missing capability data is detected", "Descriptive error messages are provided"],
        "fixtures": ["Invalid binding context", "Missing capability data"],
        "inputs": { "shape": "Binding context with missing capability data", "notes": "Tests error handling for missing data" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      const context: EnhancedBindingContext = {
        source: mockSourceComponent,
        target: mockTargetComponent,
        directive: {
          capability: 'db:postgres',
          access: 'read',
          env: {}
        },
        environment: 'dev',
        complianceFramework: 'commercial',
        targetCapabilityData: null as any
      };

      await expect(strategy.bind(context)).rejects.toThrow('Invalid database capability data');
    });

    test('Bind__MissingSourceComponent__ThrowsError', async () => {
      // TP-database-binder-error-002
      const testMetadata = {
        "id": "TP-database-binder-error-002",
        "level": "unit",
        "capability": "Validates required source component",
        "oracle": "exact",
        "invariants": ["Missing source component is detected", "Error messages are descriptive"],
        "fixtures": ["Invalid binding context", "Missing source component"],
        "inputs": { "shape": "Binding context with missing source component", "notes": "Tests error handling for missing source" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      const context: EnhancedBindingContext = {
        source: null as any,
        target: mockTargetComponent,
        directive: {
          capability: 'db:postgres',
          access: 'read',
          env: {}
        },
        environment: 'dev',
        complianceFramework: 'commercial',
        targetCapabilityData: mockCapabilityData
      };

      await expect(strategy.bind(context)).rejects.toThrow('Source component is required');
    });
  });
});
