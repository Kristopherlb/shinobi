/**
 * Typed Binding Options per capability
 */

export interface BaseBindingOptions {
  requireSecureAccess?: boolean;
  requireSecureNetworking?: boolean;
}

export interface ApiGatewayBindingOptions extends BaseBindingOptions {
  enableVpcEndpoint?: boolean;
  stageName?: string;
}

export interface LambdaBindingOptions extends BaseBindingOptions {
  reservedConcurrentExecutions?: number;
}

export type BindingOptionsByCapability = {
  'api:rest': ApiGatewayBindingOptions;
  'api:http': ApiGatewayBindingOptions;
  'lambda:function': LambdaBindingOptions;
  'eventbridge:event-bus': BaseBindingOptions & { enableVpcEndpoint?: boolean; enableEventFiltering?: boolean };
  'states:state-machine': BaseBindingOptions & { enableEncryption?: boolean };
  'secretsmanager:secret': BaseBindingOptions & { enableAutoRotation?: boolean };
  'dynamodb:table': BaseBindingOptions & { enableVpcEndpoint?: boolean; backupRetentionDays?: number };
  'queue:sqs': BaseBindingOptions & { enableDeadLetterQueue?: boolean };
  'topic:sns': BaseBindingOptions & { fifo?: boolean };
  'db:postgres': BaseBindingOptions & { preferredSslMode?: 'require' | 'verify-full' };
  'db:mysql': BaseBindingOptions & { preferredSslMode?: 'REQUIRED' | 'VERIFY_CA' | 'VERIFY_IDENTITY' };
  // extend as needed
};

export function validateOptions<T extends keyof BindingOptionsByCapability>(
  capability: T,
  options: unknown
): { valid: boolean; errors: string[]; value?: BindingOptionsByCapability[T] } {
  const errs: string[] = [];
  const o = (options || {}) as Record<string, unknown>;

  const checkBoolean = (key: string) => {
    if (o[key] !== undefined && typeof o[key] !== 'boolean') errs.push(`${key} must be boolean`);
  };
  const checkNumber = (key: string) => {
    if (o[key] !== undefined && typeof o[key] !== 'number') errs.push(`${key} must be number`);
  };
  const checkString = (key: string) => {
    if (o[key] !== undefined && typeof o[key] !== 'string') errs.push(`${key} must be string`);
  };

  // base
  checkBoolean('requireSecureAccess');
  checkBoolean('requireSecureNetworking');

  if (capability === 'api:rest' || capability === 'api:http') {
    checkBoolean('enableVpcEndpoint');
    checkString('stageName');
  }

  if (capability === 'lambda:function') {
    checkNumber('reservedConcurrentExecutions');
  }

  if (capability === 'queue:sqs') {
    checkBoolean('enableDeadLetterQueue');
  }

  if (capability === 'topic:sns') {
    checkBoolean('fifo');
  }

  if (capability === 'db:postgres') {
    if (o['preferredSslMode'] !== undefined && !['require', 'verify-full'].includes(o['preferredSslMode'] as any)) {
      errs.push('preferredSslMode must be one of: require, verify-full');
    }
  }

  if (capability === 'db:mysql') {
    if (o['preferredSslMode'] !== undefined && !['REQUIRED', 'VERIFY_CA', 'VERIFY_IDENTITY'].includes(o['preferredSslMode'] as any)) {
      errs.push('preferredSslMode must be one of: REQUIRED, VERIFY_CA, VERIFY_IDENTITY');
    }
  }

  return { valid: errs.length === 0, errors: errs, value: o as any };
}


