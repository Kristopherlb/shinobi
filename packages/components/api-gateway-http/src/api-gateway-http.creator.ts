import { Construct } from 'constructs';
import {
  ComponentContext,
  ComponentSpec,
  IComponentCreator
} from '@shinobi/core';
import { ApiGatewayHttpComponent } from './api-gateway-http.component.js';
import {
  ApiGatewayHttpConfig,
  API_GATEWAY_HTTP_CONFIG_SCHEMA
} from './api-gateway-http.builder.js';

export class ApiGatewayHttpCreator implements IComponentCreator {
  public readonly componentType = 'api-gateway-http';
  public readonly displayName = 'Modern HTTP API Gateway';
  public readonly description = 'AWS API Gateway v2 (HTTP API) with platform defaults for observability and compliance';
  public readonly category = 'api';
  public readonly tags = ['api-gateway', 'http-api', 'serverless'];
  public readonly configSchema = API_GATEWAY_HTTP_CONFIG_SCHEMA;

  public createComponent(spec: ComponentSpec, context: ComponentContext): ApiGatewayHttpComponent {
    if (!context.scope) {
      throw new Error('ComponentContext.scope is required to create components');
    }
    this.assertValidSpec(spec, context);
    return new ApiGatewayHttpComponent(context.scope as Construct, spec.name, context, spec);
  }

  public processComponent(spec: ComponentSpec, context: ComponentContext): ApiGatewayHttpComponent {
    return this.createComponent(spec, context);
  }

  public validateSpec(spec: ComponentSpec, context: ComponentContext): { valid: boolean; errors: string[] } {
    const errors = this.collectValidationErrors(spec, context);
    return {
      valid: errors.length === 0,
      errors
    };
  }

  public getProvidedCapabilities(): string[] {
    return ['api:http'];
  }

  public getRequiredCapabilities(): string[] {
    return [];
  }

  public getConstructHandles(): string[] {
    return ['main', 'httpApi', 'stage', 'accessLogGroup', 'customDomain'];
  }

  private assertValidSpec(spec: ComponentSpec, context: ComponentContext): void {
    const errors = this.collectValidationErrors(spec, context);
    if (errors.length > 0) {
      throw new Error(`Invalid api-gateway-http specification: ${errors.join('; ')}`);
    }
  }

  private collectValidationErrors(spec: ComponentSpec, context: ComponentContext): string[] {
    const errors: string[] = [];
    const config = (spec.config ?? {}) as ApiGatewayHttpConfig;

    if (!spec.name || !/^[a-z][a-z0-9-]*$/i.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters or hyphens');
    }

    if (config.customDomain) {
      if (!config.customDomain.domainName) {
        errors.push('Custom domain requires domainName');
      }
      if (config.customDomain.securityPolicy && config.customDomain.securityPolicy !== 'TLS_1_2') {
        errors.push(`Unsupported security policy ${config.customDomain.securityPolicy}. Only TLS_1_2 is supported.`);
      }
      if (config.customDomain.certificateArn && config.customDomain.autoGenerateCertificate) {
        errors.push('customDomain cannot specify both certificateArn and autoGenerateCertificate');
      }
      if (!config.customDomain.certificateArn && !config.customDomain.autoGenerateCertificate) {
        errors.push('Custom domain requires either certificateArn or autoGenerateCertificate');
      }
      if (config.customDomain.autoGenerateCertificate && !config.customDomain.hostedZoneId) {
        errors.push('autoGenerateCertificate requires hostedZoneId to be specified');
      }
    }

    if (config.routes) {
      const keys = new Set<string>();
      config.routes.forEach((route, index) => {
        if (!route.routeKey) {
          errors.push(`Route ${index} is missing routeKey`);
        } else if (keys.has(route.routeKey)) {
          errors.push(`Duplicate routeKey detected: ${route.routeKey}`);
        } else {
          keys.add(route.routeKey);
        }
        if (!route.integration) {
          errors.push(`Route ${index} is missing an integration definition`);
        }
      });
    }

    if (config.security) {
      if (config.security.webAclArn && !config.security.enableWaf) {
        errors.push('security.webAclArn provided but enableWaf is false');
      }
      if (config.security.enableWaf && !config.security.webAclArn) {
        errors.push('enableWaf is true but security.webAclArn is not provided');
      }
    }

    return errors;
  }
}
