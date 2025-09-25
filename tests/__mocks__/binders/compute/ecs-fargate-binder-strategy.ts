export class EcsFargateBinderStrategy {
  supportedCapabilities = [
    'ecs:cluster',
    'ecs:service',
    'ecs:task-definition'
  ];
}
