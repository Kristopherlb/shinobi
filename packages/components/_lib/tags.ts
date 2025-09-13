// packages/components/_lib/tags.ts
import { Tags, IConstruct } from 'aws-cdk-lib';

export function applyComplianceTags(scope: IConstruct, params: {
  component: string; serviceType: string; framework: string; controls: string[];
  owner?: string; environment?: string; costCenter?: string;
}) {
  Tags.of(scope).add('platform:component', params.component);
  Tags.of(scope).add('platform:service-type', params.serviceType);
  Tags.of(scope).add('compliance:framework', params.framework);
  if (params.controls?.length) {
    Tags.of(scope).add('compliance:nist-controls', params.controls.join(', '));
  }
  if (params.owner) Tags.of(scope).add('owner', params.owner);
  if (params.environment) Tags.of(scope).add('environment', params.environment);
  if (params.costCenter) Tags.of(scope).add('cost-center', params.costCenter);
}
