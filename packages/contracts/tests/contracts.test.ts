import { ComponentSpec, ComponentConfig, ComponentBinding } from '../src/index';

test('ComponentSpec interface is defined', () => {
  const comp: ComponentSpec = { name: "example-component", type: "example-type", config: {} };
  expect(comp.name).toBe("example-component");
});

test('ComponentConfig interface is defined', () => {
  const config: ComponentConfig = {
    instanceType: "t3.micro",
    region: "us-east-1"
  };
  expect(config.instanceType).toBe("t3.micro");
});

test('ComponentBinding interface is defined', () => {
  const binding: ComponentBinding = {
    from: "lambda-api",
    to: "rds-postgres",
    capability: "database:read"
  };
  expect(binding.from).toBe("lambda-api");
  expect(binding.to).toBe("rds-postgres");
  expect(binding.capability).toBe("database:read");
});
