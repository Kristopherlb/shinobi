/**
 * @platform/waf-web-acl - WAF Web ACL Component
 * AWS WAF Web Application Firewall with comprehensive security rules and compliance hardening
 */

// Component exports
export { WafWebAclComponent } from './waf-web-acl.component.js';

// Configuration exports
export type { WafWebAclComponentConfig } from './waf-web-acl.builder.js';
export {
  WafWebAclComponentConfigBuilder,
  WAF_WEB_ACL_CONFIG_SCHEMA
} from './waf-web-acl.builder.js';

// Creator exports
export { WafWebAclComponentCreator } from './waf-web-acl.creator.js';
