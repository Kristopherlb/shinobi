"use strict";
/**
 * @platform/opensearch-domain - OpenSearchDomainComponent Component
 * OpenSearch Domain Component
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenSearchDomainComponentCreator = exports.OPENSEARCH_DOMAIN_CONFIG_SCHEMA = exports.OpenSearchDomainComponentConfigBuilder = exports.OpenSearchDomainComponentComponent = void 0;
// Component exports
var opensearch_domain_component_1 = require("./opensearch-domain.component");
Object.defineProperty(exports, "OpenSearchDomainComponentComponent", { enumerable: true, get: function () { return opensearch_domain_component_1.OpenSearchDomainComponentComponent; } });
// Configuration exports
var opensearch_domain_builder_1 = require("./opensearch-domain.builder");
Object.defineProperty(exports, "OpenSearchDomainComponentConfigBuilder", { enumerable: true, get: function () { return opensearch_domain_builder_1.OpenSearchDomainComponentConfigBuilder; } });
Object.defineProperty(exports, "OPENSEARCH_DOMAIN_CONFIG_SCHEMA", { enumerable: true, get: function () { return opensearch_domain_builder_1.OPENSEARCH_DOMAIN_CONFIG_SCHEMA; } });
// Creator exports
var opensearch_domain_creator_1 = require("./opensearch-domain.creator");
Object.defineProperty(exports, "OpenSearchDomainComponentCreator", { enumerable: true, get: function () { return opensearch_domain_creator_1.OpenSearchDomainComponentCreator; } });
