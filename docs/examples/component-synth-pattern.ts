// docs/examples/component-synth-pattern.ts
// Example of how to use the KB libraries in a component's synth() method

import { BaseComponent } from '@platform/base';
import { buildPlan } from '../../../tools/lib/kb';
import { applyComplianceTags } from '../_lib/tags';
import { loadRecipe, applyRecipe, createLogGroup, getFrameworkRetention } from '../_lib/observability';
import { aws_s3 as s3, Stack } from 'aws-cdk-lib';

export class ExampleS3BucketComponent extends BaseComponent {
  public mainConstruct!: s3.Bucket;

  public synth(): void {
    // Step 1: Build configuration using 5-layer precedence
    const config = new ExampleS3BucketConfigBuilder(this.context, this.spec).buildSync();

    // Step 2: Helper resources if needed (e.g., CMK)
    const kmsKey = this._createKmsKeyIfNeeded('s3-data');

    // Step 3: L2 constructs (set properties to satisfy rules & framework)
    this.mainConstruct = new s3.Bucket(this, 'Main', {
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: kmsKey,
      serverAccessLogsBucket: config.logging?.accessLogsBucket,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true
    });

    // Step 4: Apply standard + compliance tags using KB-driven plan
    const plan = buildPlan({
      component: 's3-bucket',
      serviceType: 's3-bucket',
      framework: config.framework,                   // commercial|fedramp-*
      extraControls: config.extraControls || []      // e.g., ["AC-2(3)","AT-4(b)"]
    });

    applyComplianceTags(this.mainConstruct, {
      component: 's3-bucket',
      serviceType: 's3-bucket',
      framework: plan.framework,
      controls: plan.nist_controls,
      owner: this.context.owner,
      environment: this.context.env
    });

    // Step 5: Register constructs for platform access
    this._registerConstruct('main', this.mainConstruct);

    // Step 6: Register capabilities for component binding
    this._registerCapability('storage:s3-bucket', {
      bucketArn: this.mainConstruct.bucketArn,
      bucketName: this.mainConstruct.bucketName
    });

    // Observability from recipe (alarms/dashboards)
    const recipe = loadRecipe('platform-kb', 's3-bucket');
    if (recipe) {
      applyRecipe(Stack.of(this), recipe, {
        framework: plan.framework,
        ns: 'S3',
        componentName: 's3-bucket'
      });
    }

    // Persist plan to /audit for Q&A & CI
    this._writeAuditArtifact('component.plan.json', plan);
  }

  private _writeAuditArtifact(filename: string, content: any): void {
    // Helper method on BaseComponent that writes under packages/components/<name>/audit/
    const auditDir = path.join('packages', 'components', 's3-bucket', 'audit');
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(auditDir, filename),
      JSON.stringify(content, null, 2)
    );
  }
}

// Example builder that uses framework-specific defaults
export class ExampleS3BucketConfigBuilder {
  constructor(private context: any, private spec: any) { }

  buildSync(): any {
    const userConfig = this.spec || {};
    const framework = userConfig.framework || 'commercial';

    // 5-layer precedence: Component > Environment > Platform > Compliance > Hardcoded
    return {
      ...this.getHardcodedFallbacks(),
      ...this.getComplianceFrameworkDefaults(framework),
      ...this.getPlatformDefaults(),
      ...this.getEnvironmentDefaults(),
      ...userConfig
    };
  }

  private getHardcodedFallbacks(): any {
    return {
      encryption: true,
      logging: true,
      monitoring: true,
      backup: false,
      high_availability: false,
      auto_scaling: false
    };
  }

  private getComplianceFrameworkDefaults(framework: string): any {
    const retention = getFrameworkRetention(framework);

    switch (framework) {
      case 'fedramp-high':
        return {
          encryption: true,
          logging: true,
          monitoring: true,
          backup: true,
          high_availability: true,
          logRetention: retention.logs,
          metricRetention: retention.metrics,
          auditLogging: true,
          continuousMonitoring: true
        };

      case 'fedramp-moderate':
        return {
          encryption: true,
          logging: true,
          monitoring: true,
          backup: true,
          logRetention: retention.logs,
          metricRetention: retention.metrics,
          auditLogging: true
        };

      case 'commercial':
      default:
        return {
          encryption: true,
          logging: true,
          monitoring: true,
          logRetention: retention.logs,
          metricRetention: retention.metrics
        };
    }
  }

  private getPlatformDefaults(): any {
    return {
      // Platform-wide defaults
      costCenter: this.context.costCenter,
      owner: this.context.owner
    };
  }

  private getEnvironmentDefaults(): any {
    return {
      // Environment-specific defaults
      environment: this.context.environment
    };
  }
}
