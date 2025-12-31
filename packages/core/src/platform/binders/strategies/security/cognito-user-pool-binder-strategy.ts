/**
 * Cognito User Pool Binder Strategy (Unified)
 * Handles Cognito User Pool bindings for AWS Cognito with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase } from '../../../contracts/unified-binder-strategy-base.js';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '../../../contracts/platform-binding-trigger-spec.js';
import type { IamPolicy } from '../../../contracts/bindings.js';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

interface CognitoClientSummary {
  clientId: string;
  clientName?: string;
}

interface CognitoUserPoolCapabilityData {
  userPoolId?: string;
  userPoolArn?: string;
  userPoolProviderName?: string;
  userPoolProviderUrl?: string;
  domainBaseUrl?: string;
  clients?: CognitoClientSummary[];
}

export class CognitoUserPoolBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['auth:user-pool', 'auth:identity-provider'];

  getStrategyName(): string {
    return 'Cognito User Pool Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'auth:user-pool',
        capability: 'auth:user-pool',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to Cognito User Pool for authentication and user management. Maps: read=authenticate, write=manage, readwrite/admin=authenticate+read+manage',
        examples: ['lambda-api -> auth:user-pool (read)', 'api-gateway -> auth:user-pool (read)']
      },
      {
        sourceType: '*',
        targetType: 'auth:identity-provider',
        capability: 'auth:identity-provider',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to Cognito Identity Provider for federated authentication. Maps: read=authenticate, write=manage, readwrite/admin=authenticate+read+manage',
        examples: ['lambda-api -> auth:identity-provider (read)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for Cognito binding');
    }
    if (!capability) {
      throw new Error('Binding capability is required');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability] as CognitoUserPoolCapabilityData | undefined;
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Map standard AccessLevel to Cognito-specific access levels
    // read -> authenticate, write -> manage, readwrite/admin -> authenticate+read+manage
    const cognitoAccess: string[] = [];
    const standardAccess = directive.access || 'read';
    
    if (standardAccess === 'read' || standardAccess === 'readwrite' || standardAccess === 'admin') {
      cognitoAccess.push('authenticate');
    }
    if (standardAccess === 'readwrite' || standardAccess === 'admin') {
      cognitoAccess.push('read');
    }
    if (standardAccess === 'write' || standardAccess === 'readwrite' || standardAccess === 'admin') {
      cognitoAccess.push('manage');
    }
    
    const access = cognitoAccess;

    // Route to appropriate binding method
    switch (capability) {
      case 'auth:user-pool':
        return await this.bindToUserPool(context, targetCapabilityData, access);
      case 'auth:identity-provider':
        return await this.bindToIdentityProvider(context, targetCapabilityData, access);
      default:
        throw new Error(`Unsupported Cognito binding capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  /**
   * Bind to Cognito User Pool
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - userPoolId (required): string - Cognito User Pool ID (e.g., 'us-east-1_AbCdEfGh')
   *   - userPoolArn (required): string - Cognito User Pool ARN (e.g., 'arn:aws:cognito-idp:region:account:userpool/pool-id')
   *   - userPoolProviderName?: string - Identity provider name (e.g., 'Google', 'Facebook')
   *   - userPoolProviderUrl?: string - Identity provider URL
   *   - domainBaseUrl?: string - Cognito domain base URL (e.g., 'https://your-domain.auth.region.amazoncognito.com')
   *   - clients?: Array<{ clientId: string, clientName?: string }> - App client configurations
   * @param access - Array of access levels:
   *   - 'authenticate': Sign in, sign out, token refresh
   *   - 'read': Read user pool and user information
   *   - 'manage': Create, update, delete users and groups
   */
  private async bindToUserPool(
    context: BindingContext,
    targetData: CognitoUserPoolCapabilityData,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { userPoolId, userPoolArn, userPoolProviderName, userPoolProviderUrl, domainBaseUrl, clients } = targetData;

    if (!userPoolId || !userPoolArn) {
      throw new Error('auth:user-pool capability must expose userPoolId and userPoolArn');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Set user pool environment variables
    environmentVariables['COGNITO_USER_POOL_ID'] = userPoolId;
    environmentVariables['COGNITO_USER_POOL_ARN'] = userPoolArn;

    if (userPoolProviderName) {
      environmentVariables['COGNITO_USER_POOL_PROVIDER_NAME'] = userPoolProviderName;
    }
    if (userPoolProviderUrl) {
      environmentVariables['COGNITO_USER_POOL_PROVIDER_URL'] = userPoolProviderUrl;
    }
    if (domainBaseUrl) {
      environmentVariables['COGNITO_USER_POOL_DOMAIN'] = domainBaseUrl;
    }

    // Select client based on options (clientName or appClientName)
    const selectedClient = this.selectClient(context.directive, clients || []);
    if (selectedClient) {
      environmentVariables['COGNITO_USER_POOL_CLIENT_ID'] = selectedClient.clientId;
      if (selectedClient.clientName) {
        environmentVariables['COGNITO_USER_POOL_CLIENT_NAME'] = selectedClient.clientName;
      }
    }

    // Apply access policies
    const accessPolicies = this.buildAccessPolicies(userPoolArn, access);
    iamPolicies.push(...accessPolicies);

    // Apply custom environment variable overrides from directive
    if (context.directive.env) {
      for (const [key, value] of Object.entries(context.directive.env)) {
        if (value !== undefined && value !== null) {
          environmentVariables[key] = String(value);
        }
      }
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Cognito Identity Provider
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - userPoolProviderName (required): string - Identity provider name (e.g., 'Google', 'Facebook', 'SAML')
   *   - userPoolProviderUrl (required): string - Identity provider URL or endpoint
   *   - userPoolArn?: string - User Pool ARN (for applying access policies)
   * @param access - Array of access levels (authenticate, read, manage) - Same permissions as user pool binding
   */
  private async bindToIdentityProvider(
    context: BindingContext,
    targetData: CognitoUserPoolCapabilityData,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { userPoolProviderName, userPoolProviderUrl, userPoolArn } = targetData;

    if (!userPoolProviderName || !userPoolProviderUrl) {
      throw new Error('auth:identity-provider capability must expose providerName and providerUrl');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Set identity provider environment variables
    environmentVariables['COGNITO_IDP_NAME'] = userPoolProviderName;
    environmentVariables['COGNITO_IDP_URL'] = userPoolProviderUrl;

    // Identity provider bindings utilize the same policy surface as user pool
    if (userPoolArn) {
      const accessPolicies = this.buildAccessPolicies(userPoolArn, access);
      iamPolicies.push(...accessPolicies);
    }

    // Apply custom environment variable overrides from directive
    if (context.directive.env) {
      for (const [key, value] of Object.entries(context.directive.env)) {
        if (value !== undefined && value !== null) {
          environmentVariables[key] = String(value);
        }
      }
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Select client from available clients based on directive options
   * 
   * @param directive - Binding directive
   * @param clients - Available clients
   * @returns Selected client or undefined
   */
  private selectClient(directive: BindingContext['directive'], clients: CognitoClientSummary[]): CognitoClientSummary | undefined {
    if (!clients || clients.length === 0) {
      return undefined;
    }

    const requestedClientName = directive.options?.clientName || directive.options?.appClientName;
    if (requestedClientName) {
      const client = clients.find(client => client.clientName === requestedClientName);
      if (!client) {
        console.warn(
          `Requested Cognito client '${requestedClientName}' not found. ` +
          `Available clients: ${clients.map(c => c.clientName || c.clientId).join(', ')}. ` +
          `Proceeding without client selection.`
        );
      }
      return client;
    }

    // If only one client, select it by default
    if (clients.length === 1) {
      return clients[0];
    }

    return undefined;
  }

  /**
   * Build IAM policies for Cognito access based on access levels
   * 
   * @param userPoolArn - User Pool ARN
   * @param access - Array of access levels
   * @returns Array of IAM policies
   */
  private buildAccessPolicies(userPoolArn: string, access: string[]): IamPolicy[] {
    const policies: IamPolicy[] = [];

    if (access.includes('authenticate')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'cognito-idp:InitiateAuth',
          'cognito-idp:RespondToAuthChallenge',
          'cognito-idp:GlobalSignOut',
          'cognito-idp:RevokeToken',
          'cognito-idp:SignUp'
        ],
        resources: [userPoolArn]
      });
      policies.push({
        statement,
        description: 'Cognito User Pool authentication and sign-up permissions',
        complianceRequirement: 'Authentication and authorization'
      });
    }

    if (access.includes('read')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'cognito-idp:DescribeUserPool',
          'cognito-idp:ListUsers',
          'cognito-idp:AdminGetUser',
          'cognito-idp:ListUserPoolClients'
        ],
        resources: [userPoolArn]
      });
      policies.push({
        statement,
        description: 'Cognito User Pool read permissions including client discovery',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    if (access.includes('manage')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'cognito-idp:AdminCreateUser',
          'cognito-idp:AdminDeleteUser',
          'cognito-idp:AdminUpdateUserAttributes',
          'cognito-idp:AdminAddUserToGroup',
          'cognito-idp:AdminRemoveUserFromGroup'
        ],
        resources: [userPoolArn]
      });
      policies.push({
        statement,
        description: 'Cognito User Pool user management permissions',
        complianceRequirement: 'User lifecycle management'
      });
    }

    return policies;
  }
}