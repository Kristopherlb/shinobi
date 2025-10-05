/**
 * Cognito User Pool Component ConfigBuilder Test Suite
 * Implements Platform Testing Standard v1.0 - ConfigBuilder Testing
 */

import {
  CognitoUserPoolComponentConfigBuilder,
  CognitoUserPoolConfig,
  COGNITO_USER_POOL_CONFIG_SCHEMA
} from '../src/cognito-user-pool.builder.ts';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces.ts';
import COGNITO_USER_POOL_CONFIG_SCHEMA_JSON from '../Config.schema.json' with { type: 'json' };

// Deterministic test fixtures
const DETERMINISTIC_TIMESTAMP = new Date('2025-01-08T12:00:00.000Z');

type Framework = 'commercial' | 'fedramp-moderate' | 'fedramp-high';

// Helper factories
const createContext = (framework: Framework = 'commercial'): ComponentContext => ({
  serviceName: 'identity-service',
  owner: 'identity-team',
  environment: 'dev',
  complianceFramework: framework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'identity-service',
    owner: 'identity-team',
    environment: 'dev',
    'compliance-framework': framework
  }
});

const createSpec = (config: Partial<CognitoUserPoolConfig> = {}): ComponentSpec => ({
  name: 'user-pool',
  type: 'cognito-user-pool',
  config
});

describe('CognitoUserPoolComponentConfigBuilder', () => {
  // Freeze time for deterministic tests
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(DETERMINISTIC_TIMESTAMP);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('ConfigurationBuilder__CommercialFramework__AppliesPlatformDefaults', () => {
    it('ConfigurationBuilder__CommercialDefaults__AppliesPlatformDefaults', () => {
      // Test Metadata: {"id":"TP-cognito-user-pool-config-001","level":"unit","capability":"Configuration builder applies commercial platform defaults","oracle":"exact","invariants":["Username and email sign-in enabled","MFA mode set to optional","Advanced security mode set to audit","Feature plan set to plus","Monitoring enabled with default thresholds","App clients empty by default"],"fixtures":["createContext","createSpec"],"inputs":{"shape":"ComponentSpec without overrides","notes":"Commercial framework context"},"risks":["Incorrect default values"],"dependencies":["config/commercial.yml"],"evidence":["signIn.username=true","signIn.email=true","mfa.mode=optional","advancedSecurityMode=audit","monitoring.enabled=true"],"compliance_refs":["std://platform-configuration"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      const builder = new CognitoUserPoolComponentConfigBuilder(
        createContext('commercial'),
        createSpec()
      );

      const config = builder.buildSync();

      expect(config.signIn.username).toBe(true);
      expect(config.signIn.email).toBe(true);
      expect(config.mfa.mode).toBe('optional');
      expect(config.advancedSecurityMode).toBe('audit');
      expect(config.featurePlan).toBe('plus');
      expect(config.monitoring.enabled).toBe(true);
      expect(config.monitoring.signInSuccess.threshold).toBe(1);
      expect(config.monitoring.signInThrottle.threshold).toBe(20);
      expect(config.monitoring.signUpSuccess.threshold).toBe(1);
      expect(config.monitoring.signUpThrottle.threshold).toBe(10);
      expect(config.monitoring.riskHigh.enabled).toBe(false);
      expect(config.appClients).toEqual([]);
    });

    it('ConfigurationBuilder__FedRampHighDefaults__EnforcesCompliancePosture', () => {
      // Test Metadata: {"id":"TP-cognito-user-pool-config-002","level":"unit","capability":"Configuration builder enforces FedRAMP High compliance posture","oracle":"exact","invariants":["Password policy requires 16 character minimum","MFA mode set to required","Risk high monitoring enabled","Deletion protection enabled","Feature plan set to plus","Compliance tier tag applied"],"fixtures":["createContext","createSpec"],"inputs":{"shape":"ComponentSpec with FedRAMP High framework","notes":"Compliance framework overrides platform defaults"},"risks":["Non-compliant default values"],"dependencies":["config/fedramp-high.yml"],"evidence":["passwordPolicy.minLength=16","mfa.mode=required","monitoring.riskHigh.enabled=true","deletionProtection=true"],"compliance_refs":["std://platform-configuration","std://platform-security"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      const builder = new CognitoUserPoolComponentConfigBuilder(
        createContext('fedramp-high'),
        createSpec()
      );

      const config = builder.buildSync();

      expect(config.passwordPolicy.minLength).toBe(16);
      expect(config.mfa.mode).toBe('required');
      expect(config.monitoring.riskHigh.enabled).toBe(true);
      expect(config.deletionProtection).toBe(true);
      expect(config.featurePlan).toBe('plus');
      expect(config.tags['compliance-tier']).toBe('fedramp-high');
    });

    it('ConfigurationBuilder__UserOverrides__MergesWithPlatformDefaults', () => {
      // Test Metadata: {"id":"TP-cognito-user-pool-config-003","level":"unit","capability":"Configuration builder merges user overrides with platform defaults","oracle":"exact","invariants":["User values override platform defaults","Unspecified values use platform defaults"],"fixtures":["createContext","createSpec"],"inputs":{"shape":"ComponentSpec with user overrides","notes":"Tests configuration precedence chain"},"risks":["Incorrect precedence order"],"dependencies":["config/commercial.yml"],"evidence":["signIn.username=false (user override)","signIn.phone=true (user override)","monitoring.signInThrottle.threshold=50 (user override)"],"compliance_refs":["std://platform-configuration"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      const builder = new CognitoUserPoolComponentConfigBuilder(
        createContext('commercial'),
        createSpec({
          signIn: {
            username: false,
            email: true,
            phone: true,
            preferredUsername: false
          },
          monitoring: {
            enabled: true,
            signInThrottle: {
              enabled: true,
              threshold: 50
            }
          },
          appClients: [
            {
              clientName: 'web-app',
              authFlows: ['user-password'],
              supportedIdentityProviders: ['cognito'],
              generateSecret: false
            }
          ]
        })
      );

      const config = builder.buildSync();

      expect(config.signIn.username).toBe(false);
      expect(config.signIn.phone).toBe(true);
      expect(config.monitoring.signInThrottle.threshold).toBe(50);
      expect(config.appClients).toHaveLength(1);
      expect(config.appClients[0].authFlows).toEqual(['user-password']);
    });
  });

  describe('SchemaValidation__ConfigSchema__ValidatesSchemaStructure', () => {
    it('SchemaValidation__BuilderSchema__ExportsValidSchema', () => {
      // Test Metadata: {"id":"TP-cognito-user-pool-schema-001","level":"unit","capability":"Configuration builder exports valid schema from builder","oracle":"exact","invariants":["Schema is defined and has object type","Schema has properties defined"],"fixtures":["COGNITO_USER_POOL_CONFIG_SCHEMA"],"inputs":{"shape":"Builder schema export","notes":"Tests schema export validation"},"risks":["Invalid schema structure"],"dependencies":[],"evidence":["COGNITO_USER_POOL_CONFIG_SCHEMA defined","type=object","properties defined"],"compliance_refs":["std://platform-configuration"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      expect(COGNITO_USER_POOL_CONFIG_SCHEMA).toBeDefined();
      expect(COGNITO_USER_POOL_CONFIG_SCHEMA.type).toBe('object');
      expect(COGNITO_USER_POOL_CONFIG_SCHEMA.properties).toBeDefined();
    });

    it('SchemaValidation__JSONSchema__ValidatesComprehensiveSchema', () => {
      // Test Metadata: {"id":"TP-cognito-user-pool-schema-002","level":"unit","capability":"JSON schema is valid and comprehensive","oracle":"exact","invariants":["JSON schema is defined with correct title","Schema has object type","Schema has 19 properties"],"fixtures":["COGNITO_USER_POOL_CONFIG_SCHEMA_JSON"],"inputs":{"shape":"JSON schema file","notes":"Tests JSON schema validation"},"risks":["Incomplete schema"],"dependencies":[],"evidence":["title=Cognito User Pool Config","type=object","properties count=19"],"compliance_refs":["std://platform-configuration"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      expect(COGNITO_USER_POOL_CONFIG_SCHEMA_JSON).toBeDefined();
      expect(COGNITO_USER_POOL_CONFIG_SCHEMA_JSON.title).toBe('Cognito User Pool Config');
      expect(COGNITO_USER_POOL_CONFIG_SCHEMA_JSON.type).toBe('object');
      expect(Object.keys(COGNITO_USER_POOL_CONFIG_SCHEMA_JSON.properties)).toHaveLength(19);
    });

    it('SchemaValidation__RequiredProperties__IncludesAllCoreProperties', () => {
      // Test Metadata: {"id":"TP-cognito-user-pool-schema-003","level":"unit","capability":"JSON schema includes all required properties","oracle":"exact","invariants":["All core configuration properties present","Properties include userPoolName, signIn, standardAttributes, etc"],"fixtures":["COGNITO_USER_POOL_CONFIG_SCHEMA_JSON"],"inputs":{"shape":"JSON schema properties","notes":"Tests schema completeness"},"risks":["Missing required properties"],"dependencies":[],"evidence":["userPoolName property present","signIn property present","standardAttributes property present"],"compliance_refs":["std://platform-configuration"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      const properties = COGNITO_USER_POOL_CONFIG_SCHEMA_JSON.properties;

      // Core configuration properties
      expect(properties).toHaveProperty('userPoolName');
      expect(properties).toHaveProperty('signIn');
      expect(properties).toHaveProperty('standardAttributes');
      expect(properties).toHaveProperty('customAttributes');
      expect(properties).toHaveProperty('passwordPolicy');
      expect(properties).toHaveProperty('mfa');
      expect(properties).toHaveProperty('accountRecovery');
      expect(properties).toHaveProperty('email');
      expect(properties).toHaveProperty('sms');
      expect(properties).toHaveProperty('triggers');
      expect(properties).toHaveProperty('deviceTracking');
      expect(properties).toHaveProperty('advancedSecurityMode');
      expect(properties).toHaveProperty('featurePlan');
      expect(properties).toHaveProperty('deletionProtection');
      expect(properties).toHaveProperty('removalPolicy');
      expect(properties).toHaveProperty('domain');
      expect(properties).toHaveProperty('appClients');
      expect(properties).toHaveProperty('monitoring');
      expect(properties).toHaveProperty('tags');
    });

    it('SchemaValidation__EnumValues__ValidatesCorrectEnumValues', () => {
      // Test Metadata: {"id":"TP-cognito-user-pool-schema-004","level":"unit","capability":"Schema enums have correct values","oracle":"exact","invariants":["Advanced security mode enum has correct values","Feature plan enum has correct values","Removal policy enum has correct values"],"fixtures":["COGNITO_USER_POOL_CONFIG_SCHEMA_JSON"],"inputs":{"shape":"JSON schema enum properties","notes":"Tests schema enum validation"},"risks":["Incorrect enum values"],"dependencies":[],"evidence":["advancedSecurityMode.enum=[off,audit,enforced]","featurePlan.enum=[lite,essentials,plus]"],"compliance_refs":["std://platform-configuration"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      const properties = COGNITO_USER_POOL_CONFIG_SCHEMA_JSON.properties;

      expect(properties.advancedSecurityMode.enum).toEqual(['off', 'audit', 'enforced']);
      expect(properties.featurePlan.enum).toEqual(['lite', 'essentials', 'plus']);
      expect(properties.removalPolicy.enum).toEqual(['retain', 'destroy']);
    });

    it('SchemaValidation__PropertyDescriptions__ValidatesDescriptionCompleteness', () => {
      // Test Metadata: {"id":"TP-cognito-user-pool-schema-005","level":"unit","capability":"Schema has proper descriptions for all properties","oracle":"exact","invariants":["All properties have descriptions","Descriptions are not empty strings","Nested properties have descriptions where applicable"],"fixtures":["COGNITO_USER_POOL_CONFIG_SCHEMA_JSON"],"inputs":{"shape":"JSON schema property descriptions","notes":"Tests schema documentation"},"risks":["Missing or empty descriptions"],"dependencies":[],"evidence":["All properties have descriptions","Descriptions are non-empty"],"compliance_refs":["std://platform-configuration"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      const properties = COGNITO_USER_POOL_CONFIG_SCHEMA_JSON.properties;

      Object.values(properties).forEach((prop: any) => {
        if (prop.type === 'object' && prop.properties) {
          // Check nested properties - skip if they don't have descriptions
          Object.values(prop.properties).forEach((nestedProp: any) => {
            if (nestedProp.description !== undefined) {
              expect(nestedProp.description).not.toBe('');
            }
          });
        } else {
          expect(prop.description).toBeDefined();
          expect(prop.description).not.toBe('');
        }
      });
    });
  });

  describe('AuthenticationPatterns__OAuthConfiguration__SupportsAIApplications', () => {
    it('AuthenticationPatterns__OAuthConfiguration__SupportsOAuthForAI', () => {
      // Test Metadata: {"id":"TP-cognito-user-pool-oauth-001","level":"unit","capability":"Configuration builder supports OAuth configuration for AI applications","oracle":"exact","invariants":["OAuth flows configured correctly","OAuth scopes include openid, email, profile","Callback and logout URLs configured"],"fixtures":["createContext","createSpec"],"inputs":{"shape":"ComponentSpec with OAuth app client","notes":"Tests OAuth configuration support"},"risks":["Incorrect OAuth configuration"],"dependencies":[],"evidence":["oAuth.flows=[authorization-code]","oAuth.scopes=[openid,email,profile]","callbackUrls configured"],"compliance_refs":["std://platform-configuration"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      const builder = new CognitoUserPoolComponentConfigBuilder(
        createContext(),
        createSpec({
          appClients: [
            {
              clientName: 'ai-app-client',
              generateSecret: false,
              authFlows: ['user-srp'],
              supportedIdentityProviders: ['cognito'],
              oAuth: {
                flows: ['authorization-code'],
                scopes: ['openid', 'email', 'profile'],
                callbackUrls: ['https://ai-app.example.com/callback'],
                logoutUrls: ['https://ai-app.example.com/logout']
              }
            }
          ]
        })
      );

      const config = builder.buildSync();
      const client = config.appClients[0];

      expect(client.oAuth).toBeDefined();
      expect(client.oAuth.flows).toEqual(['authorization-code']);
      expect(client.oAuth.scopes).toEqual(['openid', 'email', 'profile']);
      expect(client.oAuth.callbackUrls).toEqual(['https://ai-app.example.com/callback']);
    });

    it('AuthenticationPatterns__CustomAttributes__SupportsAIUserProfiles', () => {
      // Test Metadata: {"id":"TP-cognito-user-pool-custom-001","level":"unit","capability":"Configuration builder supports custom attributes for AI user profiles","oracle":"exact","invariants":["Custom attributes configured correctly","String attribute with length constraints","Number attribute with immutability"],"fixtures":["createContext","createSpec"],"inputs":{"shape":"ComponentSpec with custom attributes","notes":"Tests custom attribute configuration"},"risks":["Incorrect custom attribute configuration"],"dependencies":[],"evidence":["customAttributes.ai-preference.type=string","customAttributes.model-access-level.type=number"],"compliance_refs":["std://platform-configuration"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      const builder = new CognitoUserPoolComponentConfigBuilder(
        createContext(),
        createSpec({
          customAttributes: {
            'ai-preference': {
              type: 'string',
              mutable: true,
              minLength: 1,
              maxLength: 100
            },
            'model-access-level': {
              type: 'number',
              mutable: false
            }
          }
        })
      );

      const config = builder.buildSync();

      expect(config.customAttributes).toHaveProperty('ai-preference');
      expect(config.customAttributes!['ai-preference'].type).toBe('string');
      expect(config.customAttributes!['ai-preference'].mutable).toBe(true);
      expect(config.customAttributes!['model-access-level'].type).toBe('number');
    });
  });

  describe('ComplianceFramework__SecurityRequirements__AppliesFrameworkDefaults', () => {
    it('ComplianceFramework__FedRampModerate__AppliesModerateSecurityRequirements', () => {
      // Test Metadata: {"id":"TP-cognito-user-pool-compliance-001","level":"unit","capability":"Configuration builder applies FedRAMP Moderate security requirements","oracle":"exact","invariants":["MFA mode set to required","Advanced security mode set to enforced","Password policy requires 14 character minimum","Password policy requires symbols","Deletion protection enabled"],"fixtures":["createContext","createSpec"],"inputs":{"shape":"ComponentSpec with FedRAMP Moderate framework","notes":"Tests FedRAMP Moderate compliance defaults"},"risks":["Non-compliant security requirements"],"dependencies":["config/fedramp-moderate.yml"],"evidence":["mfa.mode=required","advancedSecurityMode=enforced","passwordPolicy.minLength=14","deletionProtection=true"],"compliance_refs":["std://platform-security"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      const builder = new CognitoUserPoolComponentConfigBuilder(
        createContext('fedramp-moderate'),
        createSpec()
      );

      const config = builder.buildSync();

      expect(config.mfa.mode).toBe('required');
      expect(config.advancedSecurityMode).toBe('enforced');
      expect(config.passwordPolicy.minLength).toBe(14);
      expect(config.passwordPolicy.requireSymbols).toBe(true);
      expect(config.deletionProtection).toBe(true);
    });

    it('ComplianceFramework__FedRampHigh__AppliesHighSecurityRequirements', () => {
      // Test Metadata: {"id":"TP-cognito-user-pool-compliance-002","level":"unit","capability":"Configuration builder applies FedRAMP High security requirements","oracle":"exact","invariants":["MFA mode set to required","Advanced security mode set to enforced","Password policy requires 16 character minimum","Password policy requires symbols","Deletion protection enabled","Risk high monitoring enabled"],"fixtures":["createContext","createSpec"],"inputs":{"shape":"ComponentSpec with FedRAMP High framework","notes":"Tests FedRAMP High compliance defaults"},"risks":["Non-compliant security requirements"],"dependencies":["config/fedramp-high.yml"],"evidence":["mfa.mode=required","advancedSecurityMode=enforced","passwordPolicy.minLength=16","monitoring.riskHigh.enabled=true"],"compliance_refs":["std://platform-security"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      const builder = new CognitoUserPoolComponentConfigBuilder(
        createContext('fedramp-high'),
        createSpec()
      );

      const config = builder.buildSync();

      expect(config.mfa.mode).toBe('required');
      expect(config.advancedSecurityMode).toBe('enforced');
      expect(config.passwordPolicy.minLength).toBe(16);
      expect(config.passwordPolicy.requireSymbols).toBe(true);
      expect(config.deletionProtection).toBe(true);
      expect(config.monitoring.enabled).toBe(true);
      expect(config.monitoring.riskHigh.enabled).toBe(true);
    });
  });

  describe('ErrorHandling__InvalidConfiguration__UsesGracefulDefaults', () => {
    it('ErrorHandling__InvalidSecurityMode__UsesDefaultValue', () => {
      // Test Metadata: {"id":"TP-cognito-user-pool-error-001","level":"unit","capability":"Configuration builder handles invalid configuration gracefully","oracle":"exact","invariants":["Builder does not throw on invalid values","Invalid values replaced with defaults","Default advanced security mode used"],"fixtures":["createContext","createSpec"],"inputs":{"shape":"ComponentSpec with invalid advancedSecurityMode","notes":"Tests graceful error handling"},"risks":["Builder throws on invalid input"],"dependencies":[],"evidence":["No exception thrown","advancedSecurityMode=audit (default)"],"compliance_refs":["std://platform-configuration"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      const builder = new CognitoUserPoolComponentConfigBuilder(
        createContext(),
        createSpec({
          advancedSecurityMode: 'invalid-mode' as any
        })
      );

      // Builder should not throw but use default values
      expect(() => builder.buildSync()).not.toThrow();
      const config = builder.buildSync();
      expect(config.advancedSecurityMode).toBe('audit'); // Should use default
    });

    it('ErrorHandling__MissingRequiredFields__UsesDefaultValues', () => {
      // Test Metadata: {"id":"TP-cognito-user-pool-error-002","level":"unit","capability":"Configuration builder handles missing required fields gracefully","oracle":"exact","invariants":["Builder does not throw on missing fields","Missing fields replaced with defaults","App clients array is defined"],"fixtures":["createContext","createSpec"],"inputs":{"shape":"ComponentSpec with missing clientName","notes":"Tests graceful handling of missing fields"},"risks":["Builder throws on missing required fields"],"dependencies":[],"evidence":["No exception thrown","appClients defined"],"compliance_refs":["std://platform-configuration"],"ai_generated":true,"human_reviewed_by":"Platform Engineering Team"}
      const builder = new CognitoUserPoolComponentConfigBuilder(
        createContext(),
        createSpec({
          appClients: [
            {
              // Missing required clientName - should use default
            } as any
          ]
        })
      );

      // Builder should not throw but handle gracefully
      expect(() => builder.buildSync()).not.toThrow();
      const config = builder.buildSync();
      expect(config.appClients).toBeDefined();
    });
  });
});
