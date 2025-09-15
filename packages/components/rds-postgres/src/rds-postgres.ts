import { ComponentSpec, ComponentConfig } from '@platform/contracts';

export class RdsPostgresComponent implements ComponentSpec {
  name = 'rds-postgres';
  config: ComponentConfig;

  constructor(config: ComponentConfig = {}) {
    this.config = {
      engine: 'postgres',
      engineVersion: '15.4',
      instanceClass: 'db.t3.micro',
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      backupRetentionPeriod: 7,
      multiAz: false,
      publiclyAccessible: false,
      storageEncrypted: true,
      ...config
    };
  }

  getEngine(): string {
    return this.config.engine as string;
  }

  getEngineVersion(): string {
    return this.config.engineVersion as string;
  }

  getInstanceClass(): string {
    return this.config.instanceClass as string;
  }

  getAllocatedStorage(): number {
    return this.config.allocatedStorage as number;
  }

  isStorageEncrypted(): boolean {
    return this.config.storageEncrypted as boolean;
  }
}
