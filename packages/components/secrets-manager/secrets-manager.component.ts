/**
 * Secrets Manager Component
 *
 * Provisions AWS Secrets Manager secrets using configuration supplied by the
 * platform ConfigBuilder. All compliance-aware defaults are resolved before
 * synthesis so this implementation consumes a manifest-driven config object
 * without hard-coded framework switches.
 */

import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@platform/contracts';
import {
  SecretsManagerConfig,
  SecretsManagerComponentConfigBuilder
} from './secrets-manager.builder';

export class SecretsManagerComponentComponent extends Component {
  private secret?: secretsmanager.Secret;
  private kmsKey?: kms.IKey;
  private rotationLambda?: lambda.Function;
  private config?: SecretsManagerConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting Secrets Manager component synthesis', {
      secretName: this.spec.config?.secretName,
      automaticRotation: this.spec.config?.automaticRotation?.enabled
    });

    const startedAt = Date.now();

    try {
      const configBuilder = new SecretsManagerComponentConfigBuilder({
        context: this.context,
        spec: this.spec
      });
      this.config = configBuilder.buildSync();

      this.logComponentEvent('config_built', 'Resolved Secrets Manager configuration', {
        secretName: this.config.secretName,
        rotationEnabled: !!this.config.automaticRotation?.enabled,
        replicaCount: this.config.replicas?.length ?? 0
      });

      this.configureEncryptionKey();
      this.createRotationLambdaIfNeeded();
      this.createSecret();
      this.applyAccessPolicies();
      this.configureMonitoring();

      this.registerConstruct('main', this.secret!);
      this.registerConstruct('secret', this.secret!);
      if (this.kmsKey instanceof kms.Key) {
        this.registerConstruct('kmsKey', this.kmsKey);
      }
      if (this.rotationLambda) {
        this.registerConstruct('rotationLambda', this.rotationLambda);
      }

      this.registerCapability('secret:secretsmanager', this.buildSecretCapability());

      const duration = Date.now() - startedAt;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: Object.keys(this.capabilities).length
      });

      this.logComponentEvent('synthesis_complete', 'Secrets Manager component synthesis completed', {
        secretCreated: 1,
        kmsKeyCreated: this.kmsKey instanceof kms.Key,
        rotationLambdaCreated: !!this.rotationLambda,
        replicasCreated: this.config.replicas?.length ?? 0
      });
    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'secrets-manager',
        stage: 'synthesis'
      });
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'secrets-manager';
  }

  private configureEncryptionKey(): void {
    const encryptionConfig = this.config?.encryption;
    this.kmsKey = undefined;

    if (!encryptionConfig) {
      return;
    }

    if (encryptionConfig.kmsKeyArn) {
      this.kmsKey = kms.Key.fromKeyArn(this, 'ImportedEncryptionKey', encryptionConfig.kmsKeyArn);
      return;
    }

    if (encryptionConfig.createCustomerManagedKey) {
      const enableRotation = encryptionConfig.enableKeyRotation ?? false;
      const createdKey = new kms.Key(this, 'CustomerManagedKey', {
        description: `Customer managed key for ${this.spec.name} secret`,
        enableKeyRotation: enableRotation,
        keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
        keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
      });

      this.applyStandardTags(createdKey, {
        'encryption-type': 'customer-managed',
        'key-rotation': enableRotation.toString(),
        'resource-type': 'secrets-manager-encryption'
      });

      createdKey.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'AllowSecretsManagerService',
        principals: [new iam.ServicePrincipal('secretsmanager.amazonaws.com')],
        actions: ['kms:Decrypt', 'kms:GenerateDataKey*', 'kms:DescribeKey'],
        resources: ['*']
      }));

      this.kmsKey = createdKey;
    }
  }

  private createRotationLambdaIfNeeded(): void {
    const rotation = this.config?.automaticRotation;
    const lambdaConfig = rotation?.rotationLambda;

    if (!rotation?.enabled || !lambdaConfig?.createFunction) {
      return;
    }

    const tracingEnabled = lambdaConfig.enableTracing ?? false;

    this.rotationLambda = new lambda.Function(this, 'RotationFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromInline(`
import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Basic placeholder for secret rotation.
    Extend this function to rotate credentials for your target service.
    """
    logger.info(f"Rotation event: {json.dumps(event)}")

    client = boto3.client('secretsmanager')
    secret_arn = event['SecretId']
    token = event['ClientRequestToken']
    step = event['Step']

    logger.info(f"Rotating secret {secret_arn} - Step: {step}")

    try:
        if step == "createSecret":
            logger.info("Creating new secret version")
        elif step == "setSecret":
            logger.info("Applying secret to downstream service")
        elif step == "testSecret":
            logger.info("Testing new secret version")
        elif step == "finishSecret":
            logger.info("Finalising rotation")
            client.update_secret_version_stage(
                SecretId=secret_arn,
                VersionStage="AWSCURRENT",
                ClientRequestToken=token
            )
        return {"statusCode": 200}
    except Exception as e:
        logger.error(f"Rotation failed: {str(e)}")
        raise e
      `),
      description: `Secret rotation function for ${this.spec.name}`,
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      tracing: tracingEnabled ? lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED,
      environment: {
        SECRET_ARN: 'placeholder'
      }
    });

    this.applyStandardTags(this.rotationLambda, {
      'function-type': 'secret-rotation',
      'runtime': this.rotationLambda.runtime.name,
      'purpose': 'secrets-manager-rotation'
    });
  }

  private createSecret(): void {
    const secretProps: secretsmanager.SecretProps = {
      secretName: this.buildSecretName(),
      description: this.config?.description,
      encryptionKey: this.kmsKey,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    };

    if (this.config?.generateSecret?.enabled) {
      const generator = this.config.generateSecret;
      secretProps.generateSecretString = {
        excludeCharacters: generator.excludeCharacters,
        includeSpace: generator.includeSpace,
        passwordLength: generator.passwordLength,
        requireEachIncludedType: generator.requireEachIncludedType,
        secretStringTemplate: generator.secretStringTemplate,
        generateStringKey: generator.generateStringKey
      };
    } else if (this.config?.secretValue?.secretStringValue) {
      secretProps.secretStringValue = secretsmanager.SecretValue.unsafePlainText(
        this.config.secretValue.secretStringValue
      );
    }

    if (this.config?.replicas && this.config.replicas.length > 0) {
      secretProps.replicaRegions = this.config.replicas.map(replica => ({
        region: replica.region,
        encryptionKey: replica.kmsKeyArn
          ? kms.Key.fromKeyArn(this, `ReplicaKey-${replica.region}`, replica.kmsKeyArn)
          : undefined
      }));
    }

    this.secret = new secretsmanager.Secret(this, 'Secret', secretProps);

    this.applyStandardTags(this.secret, {
      'secret-type': 'primary',
      'rotation-enabled': (!!this.config?.automaticRotation?.enabled).toString(),
      'replicas-count': (this.config?.replicas?.length ?? 0).toString(),
      'deletion-protection': (!!this.config?.recovery?.deletionProtection).toString()
    });

    const rotation = this.config?.automaticRotation;
    if (rotation?.enabled) {
      const rotationDays = rotation.schedule?.automaticallyAfterDays ?? 30;

      if (this.rotationLambda) {
        this.rotationLambda.addEnvironment('SECRET_ARN', this.secret.secretArn);
        this.secret.addRotationSchedule('RotationSchedule', {
          rotationLambda: this.rotationLambda,
          automaticallyAfter: cdk.Duration.days(rotationDays)
        });
      } else if (rotation.rotationLambda?.functionArn) {
        const existingFunction = lambda.Function.fromFunctionArn(
          this,
          'ExistingRotationLambda',
          rotation.rotationLambda.functionArn
        );
        this.secret.addRotationSchedule('RotationSchedule', {
          rotationLambda: existingFunction,
          automaticallyAfter: cdk.Duration.days(rotationDays)
        });
      }
    }

    this.logResourceCreation('secrets-manager-secret', this.secret.secretName ?? this.spec.name, {
      rotationEnabled: !!rotation?.enabled,
      replicaCount: this.config?.replicas?.length ?? 0,
      customerManagedKey: kms.Key.isKey(this.kmsKey)
    });
  }

  private applyAccessPolicies(): void {
    if (!this.secret) {
      return;
    }

    const policies = this.config?.accessPolicies ?? {};

    if (policies.denyInsecureTransport !== false) {
      this.secret.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'DenyInsecureTransport',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['secretsmanager:*'],
        resources: ['*'],
        conditions: {
          Bool: {
            'aws:SecureTransport': 'false'
          }
        }
      }));
    }

    if (policies.restrictToVpce) {
      const allowedVpces = policies.allowedVpceIds && policies.allowedVpceIds.length > 0
        ? policies.allowedVpceIds
        : ['vpce-*'];

      this.secret.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'RestrictToVPCEndpoints',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['secretsmanager:*'],
        resources: ['*'],
        conditions: {
          StringNotEquals: {
            'aws:sourceVpce': allowedVpces
          }
        }
      }));
    }

    if (policies.requireTemporaryCredentials) {
      this.secret.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'RequireTemporaryCredentials',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['secretsmanager:*'],
        resources: ['*'],
        conditions: {
          Bool: {
            'aws:TokenIssueTime': 'false'
          }
        }
      }));
    }
  }

  private configureMonitoring(): void {
    const monitoring = this.config?.monitoring;
    if (!monitoring?.enabled || !this.secret) {
      return;
    }

    const secretName = this.buildSecretName() ?? this.spec.name;
    const latencyThreshold = monitoring.unusualAccessThresholdMs ?? 5000;
    const rotationThreshold = monitoring.rotationFailureThreshold ?? 1;

    if (this.config?.automaticRotation?.enabled) {
      const rotationFailureAlarm = new cloudwatch.Alarm(this, 'RotationFailureAlarm', {
        alarmName: `${this.context.serviceName}-${this.spec.name}-rotation-failure`,
        alarmDescription: 'Secrets Manager rotation failure alarm',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/SecretsManager',
          metricName: 'RotationFailed',
          dimensionsMap: { SecretName: secretName },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5)
        }),
        threshold: rotationThreshold,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      });

      this.applyStandardTags(rotationFailureAlarm, {
        'alarm-type': 'rotation-failure',
        'metric-type': 'error-rate',
        threshold: rotationThreshold.toString()
      });
    }

    const accessAlarm = new cloudwatch.Alarm(this, 'SecretAccessAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-unusual-access`,
      alarmDescription: 'Secrets Manager unusual access latency alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SecretsManager',
        metricName: 'SuccessfulRequestLatency',
        dimensionsMap: { SecretName: secretName },
        statistic: 'Average',
        period: cdk.Duration.minutes(5)
      }),
      threshold: latencyThreshold,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.applyStandardTags(accessAlarm, {
      'alarm-type': 'access-latency',
      'metric-type': 'performance',
      threshold: latencyThreshold.toString()
    });

    this.logComponentEvent('observability_configured', 'Monitoring configured for Secrets Manager', {
      secretName,
      monitoringEnabled: true,
      rotationAlarmCreated: !!this.config?.automaticRotation?.enabled,
      unusualAccessThresholdMs: latencyThreshold
    });
  }

  private buildSecretCapability(): Record<string, any> {
    return {
      secretArn: this.secret!.secretArn,
      secretName: this.secret!.secretName
    };
  }

  private buildSecretName(): string | undefined {
    if (this.config?.secretName) {
      return this.config.secretName;
    }
    return `${this.context.serviceName}/${this.spec.name}`;
  }
}
