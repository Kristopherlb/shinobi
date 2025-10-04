import { RdsPostgresComponent, RdsPostgresBuilder } from '../src/rds-postgres.ts';

test('RdsPostgresComponent has correct name', () => {
  const comp = new RdsPostgresComponent();
  expect(comp.name).toBe('rds-postgres');
});

test('RdsPostgresComponent uses default configuration', () => {
  const comp = new RdsPostgresComponent();
  expect(comp.getEngine()).toBe('postgres');
  expect(comp.getEngineVersion()).toBe('15.4');
  expect(comp.getInstanceClass()).toBe('db.t3.micro');
  expect(comp.getAllocatedStorage()).toBe(20);
  expect(comp.isStorageEncrypted()).toBe(true);
});

test('RdsPostgresComponent accepts custom configuration', () => {
  const config = {
    engine: 'postgres',
    engineVersion: '16.1',
    instanceClass: 'db.t3.small',
    allocatedStorage: 50,
    storageEncrypted: true
  };
  const comp = new RdsPostgresComponent(config);
  expect(comp.getEngine()).toBe('postgres');
  expect(comp.getEngineVersion()).toBe('16.1');
  expect(comp.getInstanceClass()).toBe('db.t3.small');
  expect(comp.getAllocatedStorage()).toBe(50);
});

test('RdsPostgresBuilder can build component', () => {
  const comp = new RdsPostgresComponent();
  const builder = new RdsPostgresBuilder();
  const result = builder.build(comp);
  expect(result.dbInstanceIdentifier).toBe('rds-rds-postgres');
  expect(result.engine).toBe('postgres');
});

test('RdsPostgresBuilder can generate CloudFormation', () => {
  const comp = new RdsPostgresComponent();
  const builder = new RdsPostgresBuilder();
  const cf = builder.generateCloudFormation(comp);
  expect(cf.Type).toBe('AWS::RDS::DBInstance');
  expect(cf.Properties.DBInstanceIdentifier).toBe('rds-rds-postgres');
});
