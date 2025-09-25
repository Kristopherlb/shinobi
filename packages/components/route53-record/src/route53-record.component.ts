/**
 * Route 53 Record Component
 * 
 * Declarative management of DNS records with reference resolution support.
 * Implements the Platform Component API Contract and provides dns:record capability.
 */

import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { BaseComponent } from '../../@shinobi/core/component';
import { ComponentContext, ComponentSpec } from '../../@shinobi/core/component-interfaces';
import { Route53RecordConfig, Route53RecordConfigBuilder } from './route53-record.builder';
// Platform services will be injected by the platform
// import { Logger } from '../../../../src/platform/services/logger';
// import { ObservabilityService } from '../../../../src/platform/services/observability.service';
// import { TaggingService } from '../../../../src/platform/services/tagging.service';

/**
 * Route 53 Record Component
 * 
 * Creates and manages DNS records with support for various record types,
 * routing policies, and reference resolution from other components.
 */
export class Route53RecordComponent extends BaseComponent {
  private readonly config: Route53RecordConfig;
  private record: route53.IRecordSet;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);

    // Build configuration only - no synthesis in constructor
    const configBuilder = new Route53RecordConfigBuilder({ context, spec });
    this.config = configBuilder.buildSync();

    // Initialize record as undefined - will be created in synth()
    this.record = undefined as any;
  }

  /**
   * Apply platform services to the component
   */
  private _applyPlatformServices(): void {
    // Platform services will be applied by the platform's service injector
    // This method is a placeholder for future platform service integration
  }

  /**
   * Lookup existing hosted zone - does not create new zones
   */
  private _lookupHostedZone(): route53.IHostedZone {
    const zoneName = this.config.record.zoneName;
    
    try {
      const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: zoneName
      });
      
      return hostedZone;
    } catch (error) {
      throw new Error(
        `Hosted zone '${zoneName}' does not exist. ` +
        `Please create the hosted zone first using a dedicated route53-hosted-zone component ` +
        `before creating DNS records in it.`
      );
    }
  }

  /**
   * Create the Route 53 record with all configured properties
   */
  private _createRoute53Record(hostedZone: route53.IHostedZone): route53.IRecordSet {
    const { record } = this.config;

    // Target is already resolved by ResolverEngine - no custom resolution needed
    const target = record.target;

    // Create record based on type
    let dnsRecord: route53.IRecordSet;
    switch (record.recordType) {
      case 'A':
        dnsRecord = this._createARecord(hostedZone, target);
        break;
      case 'AAAA':
        dnsRecord = this._createAAAARecord(hostedZone, target);
        break;
      case 'CNAME':
        dnsRecord = this._createCnameRecord(hostedZone, target);
        break;
      case 'MX':
        dnsRecord = this._createMxRecord(hostedZone, target);
        break;
      case 'TXT':
        dnsRecord = this._createTxtRecord(hostedZone, target);
        break;
      case 'NS':
        dnsRecord = this._createNsRecord(hostedZone, target);
        break;
      case 'SRV':
        dnsRecord = this._createSrvRecord(hostedZone, target);
        break;
      default:
        dnsRecord = this._createGenericRecord(hostedZone, target);
        break;
    }

    return dnsRecord;
  }

  /**
   * Create A record
   */
  private _createARecord(hostedZone: route53.IHostedZone, target: string | string[]): route53.ARecord {
    const targets = Array.isArray(target) ? target : [target];
    
    return new route53.ARecord(this, 'ARecord', {
      zone: hostedZone,
      recordName: this.config.record.recordName,
      target: route53.RecordTarget.fromValues(...targets),
      ttl: cdk.Duration.seconds(this.config.record.ttl || 300),
      comment: this.config.record.comment
    });
  }

  /**
   * Create AAAA record
   */
  private _createAAAARecord(hostedZone: route53.IHostedZone, target: string | string[]): route53.AaaaRecord {
    const targets = Array.isArray(target) ? target : [target];
    
    return new route53.AaaaRecord(this, 'AAAARecord', {
      zone: hostedZone,
      recordName: this.config.record.recordName,
      target: route53.RecordTarget.fromValues(...targets),
      ttl: cdk.Duration.seconds(this.config.record.ttl || 300),
      comment: this.config.record.comment
    });
  }

  /**
   * Create CNAME record
   */
  private _createCnameRecord(hostedZone: route53.IHostedZone, target: string | string[]): route53.CnameRecord {
    const targetValue = Array.isArray(target) ? target[0] : target;
    
    return new route53.CnameRecord(this, 'CnameRecord', {
      zone: hostedZone,
      recordName: this.config.record.recordName,
      domainName: targetValue,
      ttl: cdk.Duration.seconds(this.config.record.ttl || 300),
      comment: this.config.record.comment
    });
  }

  /**
   * Create MX record
   */
  private _createMxRecord(hostedZone: route53.IHostedZone, target: string | string[]): route53.MxRecord {
    const targets = Array.isArray(target) ? target : [target];
    const mxValues = targets.map(t => {
      const [priority, exchange] = t.split(' ');
      return { priority: parseInt(priority), hostName: exchange };
    });
    
    return new route53.MxRecord(this, 'MxRecord', {
      zone: hostedZone,
      recordName: this.config.record.recordName,
      values: mxValues,
      ttl: cdk.Duration.seconds(this.config.record.ttl || 300),
      comment: this.config.record.comment
    });
  }

  /**
   * Create TXT record
   */
  private _createTxtRecord(hostedZone: route53.IHostedZone, target: string | string[]): route53.TxtRecord {
    const targets = Array.isArray(target) ? target : [target];
    
    return new route53.TxtRecord(this, 'TxtRecord', {
      zone: hostedZone,
      recordName: this.config.record.recordName,
      values: targets,
      ttl: cdk.Duration.seconds(this.config.record.ttl || 300),
      comment: this.config.record.comment
    });
  }

  /**
   * Create NS record
   */
  private _createNsRecord(hostedZone: route53.IHostedZone, target: string | string[]): route53.NsRecord {
    const targets = Array.isArray(target) ? target : [target];
    
    return new route53.NsRecord(this, 'NsRecord', {
      zone: hostedZone,
      recordName: this.config.record.recordName,
      values: targets,
      ttl: cdk.Duration.seconds(this.config.record.ttl || 300),
      comment: this.config.record.comment
    });
  }

  /**
   * Create SRV record
   */
  private _createSrvRecord(hostedZone: route53.IHostedZone, target: string | string[]): route53.SrvRecord {
    const targets = Array.isArray(target) ? target : [target];
    const srvValues = targets.map(t => {
      const [priority, weight, port, target] = t.split(' ');
      return {
        priority: parseInt(priority),
        weight: parseInt(weight),
        port: parseInt(port),
        hostName: target
      };
    });
    
    return new route53.SrvRecord(this, 'SrvRecord', {
      zone: hostedZone,
      recordName: this.config.record.recordName,
      values: srvValues,
      ttl: cdk.Duration.seconds(this.config.record.ttl || 300),
      comment: this.config.record.comment
    });
  }

  /**
   * Create generic record for unsupported types
   */
  private _createGenericRecord(hostedZone: route53.IHostedZone, target: string | string[]): route53.RecordSet {
    const targets = Array.isArray(target) ? target : [target];
    
    return new route53.RecordSet(this, 'GenericRecord', {
      zone: hostedZone,
      recordName: this.config.record.recordName,
      recordType: route53.RecordType[this.config.record.recordType],
      target: route53.RecordTarget.fromValues(...targets),
      ttl: cdk.Duration.seconds(this.config.record.ttl || 300),
      comment: this.config.record.comment
    });
  }


  /**
   * Get the Route 53 record construct for external access
   */
  public getConstruct(handle: string): any {
    switch (handle) {
      case 'main':
      case 'record':
        return this.record;
      default:
        throw new Error(`Unknown construct handle: ${handle}`);
    }
  }

  /**
   * Get component capabilities
   */
  public getCapabilities(): Record<string, any> {
    return {
      'dns:record': {
        recordName: this.config.record.recordName,
        recordType: this.config.record.recordType,
        zoneName: this.config.record.zoneName,
        target: this.config.record.target,
        ttl: this.config.record.ttl || 300
      }
    };
  }

  /**
   * Get component outputs
   */
  public getOutputs(): Record<string, any> {
    return {
      recordName: this.config.record.recordName,
      recordType: this.config.record.recordType,
      zoneName: this.config.record.zoneName,
      target: this.config.record.target,
      ttl: this.config.record.ttl || 300
    };
  }

  /**
   * Synthesize the component (required by BaseComponent)
   */
  public synth(): void {
    try {
      // Step 1: Lookup hosted zone (does not create)
      const hostedZone = this._lookupHostedZone();

      // Step 2: Create the Route 53 record
      this.record = this._createRoute53Record(hostedZone);

      // Step 3: Apply platform services
      this._applyPlatformServices();

      // Step 4: Register constructs for patches.ts access
      this.registerConstruct('main', this.record);
      this.registerConstruct('record', this.record);

      // Step 5: Register capabilities for component binding
      this.registerCapability('dns:record', {
        recordName: this.config.record.recordName,
        recordType: this.config.record.recordType,
        zoneName: this.config.record.zoneName,
        target: this.config.record.target
      });

      // Step 6: Configure observability for health checks
      this._configureObservabilityForDns();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Configure observability for DNS health checks
   */
  private _configureObservabilityForDns(): void {
    // Only create health check alarms if evaluateTargetHealth is enabled
    if (this.config.record.evaluateTargetHealth) {
      // Create CloudWatch alarm for health check status
      // Note: This would be implemented with actual CloudWatch alarm creation
      // For now, this is a placeholder for future observability integration
    }
  }

  /**
   * Get component type (required by BaseComponent)
   */
  public getType(): string {
    return 'route53-record';
  }
}
