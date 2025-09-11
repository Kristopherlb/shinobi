"use strict";
/**
 * @platform/certificate-manager - CertificateManagerComponent Component
 * Certificate Manager Component
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificateManagerComponentCreator = exports.CERTIFICATE_MANAGER_CONFIG_SCHEMA = exports.CertificateManagerComponentConfigBuilder = exports.CertificateManagerComponentComponent = void 0;
// Component exports
var certificate_manager_component_1 = require("./certificate-manager.component");
Object.defineProperty(exports, "CertificateManagerComponentComponent", { enumerable: true, get: function () { return certificate_manager_component_1.CertificateManagerComponentComponent; } });
// Configuration exports
var certificate_manager_builder_1 = require("./certificate-manager.builder");
Object.defineProperty(exports, "CertificateManagerComponentConfigBuilder", { enumerable: true, get: function () { return certificate_manager_builder_1.CertificateManagerComponentConfigBuilder; } });
Object.defineProperty(exports, "CERTIFICATE_MANAGER_CONFIG_SCHEMA", { enumerable: true, get: function () { return certificate_manager_builder_1.CERTIFICATE_MANAGER_CONFIG_SCHEMA; } });
// Creator exports
var certificate_manager_creator_1 = require("./certificate-manager.creator");
Object.defineProperty(exports, "CertificateManagerComponentCreator", { enumerable: true, get: function () { return certificate_manager_creator_1.CertificateManagerComponentCreator; } });
