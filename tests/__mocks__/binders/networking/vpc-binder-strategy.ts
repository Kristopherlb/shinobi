export class VpcBinderStrategy {
  supportedCapabilities = [
    'vpc:network',
    'vpc:subnet',
    'vpc:security-group',
    'vpc:route-table',
    'vpc:nat-gateway'
  ];
}
