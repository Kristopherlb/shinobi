import { IBinderStrategy } from '../binder-strategy.ts';
import { BindingContext } from '../../binding-context.ts';
import { ComponentBinding } from '../../component-binding.ts';

interface CognitoClientSummary {
  clientId: string;
  clientName?: string;
}

interface CognitoUserPoolCapability {
  userPoolId?: string;
  userPoolArn?: string;
  userPoolProviderName?: string;
  userPoolProviderUrl?: string;
  domainBaseUrl?: string;
  clients?: CognitoClientSummary[];
}

export class CognitoUserPoolBinderStrategy implements IBinderStrategy {
  readonly supportedCapabilities = ['auth:user-pool', 'auth:identity-provider'];

  async bind(
    sourceComponent: any,
    targetComponent: CognitoUserPoolCapability,
    binding: ComponentBinding,
    _context: BindingContext
  ): Promise<void> {
    if (!targetComponent) {
      throw new Error('Target component payload is required for Cognito bindings');
    }

    if (!binding?.capability) {
      throw new Error('Binding capability is required for Cognito bindings');
    }

    const access = this.ensureAccessArray(binding);
    this.validateAccess(access);

    switch (binding.capability) {
      case 'auth:user-pool':
        this.bindToUserPool(sourceComponent, targetComponent, binding, access);
        break;
      case 'auth:identity-provider':
        this.bindToIdentityProvider(sourceComponent, targetComponent, binding, access);
        break;
      default:
        throw new Error(`Unsupported Cognito binding capability: ${binding.capability}`);
    }
  }

  private ensureAccessArray(binding: ComponentBinding): string[] {
    if (!binding.access || binding.access.length === 0) {
      return ['authenticate'];
    }
    if (!Array.isArray(binding.access)) {
      throw new Error('Binding access must be an array for Cognito bindings');
    }
    return binding.access;
  }

  private validateAccess(access: string[]): void {
    const validAccessTypes = ['authenticate', 'read', 'manage'];
    const invalid = access.filter(type => !validAccessTypes.includes(type));
    if (invalid.length > 0) {
      throw new Error(`Invalid access types for Cognito binding: ${invalid.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
  }

  private bindToUserPool(
    sourceComponent: any,
    targetComponent: CognitoUserPoolCapability,
    binding: ComponentBinding,
    access: string[]
  ): void {
    const { userPoolId, userPoolArn, userPoolProviderName, userPoolProviderUrl, domainBaseUrl } = targetComponent;

    if (!userPoolId || !userPoolArn) {
      throw new Error('auth:user-pool capability must expose userPoolId and userPoolArn');
    }

    this.addEnvironment(sourceComponent, 'COGNITO_USER_POOL_ID', userPoolId);
    this.addEnvironment(sourceComponent, 'COGNITO_USER_POOL_ARN', userPoolArn);
    if (userPoolProviderName) {
      this.addEnvironment(sourceComponent, 'COGNITO_USER_POOL_PROVIDER_NAME', userPoolProviderName);
    }
    if (userPoolProviderUrl) {
      this.addEnvironment(sourceComponent, 'COGNITO_USER_POOL_PROVIDER_URL', userPoolProviderUrl);
    }
    if (domainBaseUrl) {
      this.addEnvironment(sourceComponent, 'COGNITO_USER_POOL_DOMAIN', domainBaseUrl);
    }

    const selectedClient = this.selectClient(binding, targetComponent.clients ?? []);
    if (selectedClient) {
      this.addEnvironment(sourceComponent, 'COGNITO_USER_POOL_CLIENT_ID', selectedClient.clientId);
      if (selectedClient.clientName) {
        this.addEnvironment(sourceComponent, 'COGNITO_USER_POOL_CLIENT_NAME', selectedClient.clientName);
      }
    }

    this.applyAccessPolicies(sourceComponent, userPoolArn, access);
    this.applyCustomEnvOverrides(sourceComponent, binding);
  }

  private bindToIdentityProvider(
    sourceComponent: any,
    targetComponent: CognitoUserPoolCapability,
    binding: ComponentBinding,
    access: string[]
  ): void {
    const { userPoolProviderName, userPoolProviderUrl } = targetComponent;
    if (!userPoolProviderName || !userPoolProviderUrl) {
      throw new Error('auth:identity-provider capability must expose providerName and providerUrl');
    }

    this.addEnvironment(sourceComponent, 'COGNITO_IDP_NAME', userPoolProviderName);
    this.addEnvironment(sourceComponent, 'COGNITO_IDP_URL', userPoolProviderUrl);

    // Identity provider bindings utilise the same policy surface.
    if (targetComponent.userPoolArn) {
      this.applyAccessPolicies(sourceComponent, targetComponent.userPoolArn, access);
    }

    this.applyCustomEnvOverrides(sourceComponent, binding);
  }

  private selectClient(binding: ComponentBinding, clients: CognitoClientSummary[]): CognitoClientSummary | undefined {
    if (!clients || clients.length === 0) {
      return undefined;
    }

    const requestedClientName = binding.options?.clientName || binding.options?.appClientName;
    if (requestedClientName) {
      return clients.find(client => client.clientName === requestedClientName);
    }

    if (clients.length === 1) {
      return clients[0];
    }

    return undefined;
  }

  private applyAccessPolicies(sourceComponent: any, userPoolArn: string, access: string[]): void {
    if (typeof sourceComponent.addToRolePolicy !== 'function') {
      return;
    }

    if (access.includes('authenticate')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'cognito-idp:InitiateAuth',
          'cognito-idp:RespondToAuthChallenge',
          'cognito-idp:GlobalSignOut',
          'cognito-idp:RevokeToken'
        ],
        Resource: userPoolArn
      });
    }

    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'cognito-idp:DescribeUserPool',
          'cognito-idp:ListUsers',
          'cognito-idp:AdminGetUser'
        ],
        Resource: userPoolArn
      });
    }

    if (access.includes('manage')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'cognito-idp:AdminCreateUser',
          'cognito-idp:AdminDeleteUser',
          'cognito-idp:AdminUpdateUserAttributes',
          'cognito-idp:AdminAddUserToGroup',
          'cognito-idp:AdminRemoveUserFromGroup'
        ],
        Resource: userPoolArn
      });
    }
  }

  private applyCustomEnvOverrides(sourceComponent: any, binding: ComponentBinding): void {
    if (!binding.env || typeof sourceComponent.addEnvironment !== 'function') {
      return;
    }

    for (const [key, value] of Object.entries(binding.env)) {
      if (value !== undefined && value !== null) {
        this.addEnvironment(sourceComponent, key, String(value));
      }
    }
  }

  private addEnvironment(sourceComponent: any, key: string, value: string): void {
    if (typeof sourceComponent.addEnvironment === 'function') {
      sourceComponent.addEnvironment(key, value);
    }
  }
}
