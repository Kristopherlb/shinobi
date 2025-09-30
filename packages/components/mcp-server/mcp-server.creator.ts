/**
 * Creator for the MCP Server component.
 */

import { Construct } from 'constructs';
import {
  ComponentSpec,
  ComponentContext,
  IComponent,
  IComponentCreator
} from '@shinobi/core';
import { McpServerComponent } from './mcp-server.component';
import {
  McpServerConfig,
  McpServerComponentConfigBuilder,
  MCP_SERVER_CONFIG_SCHEMA
} from './mcp-server.builder';

export class McpServerComponentCreator implements IComponentCreator {
  public readonly componentType = 'mcp-server';
  public readonly displayName = 'MCP Server';
  public readonly description = 'Model Context Protocol server providing platform intelligence APIs.';
  public readonly category = 'integration';
  public readonly awsService = 'ECS';
  public readonly tags = ['mcp-server', 'integration', 'ecs', 'container'];
  public readonly configSchema = MCP_SERVER_CONFIG_SCHEMA;

  public createComponent(
    scope: Construct,
    spec: ComponentSpec,
    context: ComponentContext
  ): IComponent {
    return new McpServerComponent(scope, spec.name, context, spec);
  }

  public validateSpec(
    spec: ComponentSpec,
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as Partial<McpServerConfig> | undefined;

    if (!spec.name || !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, or underscores.');
    }

    let resolvedConfig: McpServerConfig | undefined;
    try {
      resolvedConfig = new McpServerComponentConfigBuilder({ context, spec }).buildSync();
    } catch (error) {
      errors.push(`Unable to resolve MCP server configuration: ${(error as Error).message}`);
    }

    const toNumber = (value: number | string | undefined): number | undefined => {
      if (value === undefined || value === null) {
        return undefined;
      }
      const numeric = typeof value === 'string' ? Number(value) : value;
      return Number.isFinite(numeric) ? numeric : undefined;
    };

    const containerConfig = resolvedConfig?.container ?? config?.container;
    if (containerConfig) {
      const cpu = toNumber(containerConfig.cpu);
      if (cpu !== undefined && (cpu < 256 || cpu > 4096)) {
        errors.push('container.cpu must be between 256 and 4096.');
      }

      const memory = toNumber(containerConfig.memory);
      if (memory !== undefined && (memory < 512 || memory > 16384)) {
        errors.push('container.memory must be between 512 and 16384.');
      }

      const taskCount = toNumber(containerConfig.taskCount);
      if (taskCount !== undefined && (taskCount < 1 || taskCount > 10)) {
        errors.push('container.taskCount must be between 1 and 10.');
      }
    }

    if (context.environment === 'prod') {
      const monitoringEnabled = resolvedConfig?.monitoring?.enabled ?? config?.monitoring?.enabled ?? true;
      if (!monitoringEnabled) {
        errors.push('monitoring.enabled must be true in production environments.');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  public getProvidedCapabilities(): string[] {
    return ['api:rest', 'container:ecs'];
  }

  public getRequiredCapabilities(): string[] {
    return ['vpc:network', 'security:groups'];
  }

  public getConstructHandles(): string[] {
    return ['main', 'cluster', 'service', 'taskDefinition', 'repository', 'loadBalancer', 'logGroup'];
  }
}
