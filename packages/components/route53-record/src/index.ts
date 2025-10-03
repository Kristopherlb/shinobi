/**
 * Route 53 Record Component Package
 * 
 * Exports all Route 53 record component classes and interfaces.
 */

// Main component class
export { Route53RecordComponent } from './route53-record.component.js';

// Configuration builder and interfaces
export { 
  Route53RecordConfig, 
  Route53RecordConfigBuilder, 
  ROUTE53_RECORD_CONFIG_SCHEMA 
} from './route53-record.builder.js';

// Component creator factory
export { Route53RecordCreator } from './route53-record.creator.js';
