"use strict";
/**
 * @platform/waf-web-acl - WAF Web ACL Component
 * AWS WAF Web Application Firewall with comprehensive security rules and compliance hardening
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WafWebAclCreator = exports.WAF_WEB_ACL_CONFIG_SCHEMA = exports.WafWebAclConfigBuilder = exports.WafWebAclComponent = void 0;
// Component exports
var waf_web_acl_component_1 = require("./waf-web-acl.component");
Object.defineProperty(exports, "WafWebAclComponent", { enumerable: true, get: function () { return waf_web_acl_component_1.WafWebAclComponent; } });
// Configuration exports
var waf_web_acl_builder_1 = require("./waf-web-acl.builder");
Object.defineProperty(exports, "WafWebAclConfigBuilder", { enumerable: true, get: function () { return waf_web_acl_builder_1.WafWebAclConfigBuilder; } });
Object.defineProperty(exports, "WAF_WEB_ACL_CONFIG_SCHEMA", { enumerable: true, get: function () { return waf_web_acl_builder_1.WAF_WEB_ACL_CONFIG_SCHEMA; } });
// Creator exports
var waf_web_acl_creator_1 = require("./waf-web-acl.creator");
Object.defineProperty(exports, "WafWebAclCreator", { enumerable: true, get: function () { return waf_web_acl_creator_1.WafWebAclCreator; } });
