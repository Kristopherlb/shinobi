"use strict";
/**
 * @platform/contracts - Shared Interfaces and Types
 * Common contracts used across all platform packages
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Export component contracts
__exportStar(require("./component"), exports);
// Export configuration builder contracts
__exportStar(require("./config-builder"), exports);
// export binding and trigger specification types
__exportStar(require("./bindings"), exports);
__exportStar(require("./platform-binding-trigger-spec"), exports);
// Export trigger system interfaces
__exportStar(require("./trigger-interfaces"), exports);
// Export binder matrix implementation
__exportStar(require("./binder-matrix"), exports);
// Export OpenFeature standard interfaces
__exportStar(require("./openfeature-interfaces"), exports);
// Export platform services interfaces
__exportStar(require("./platform-services"), exports);
__exportStar(require("./logging-interfaces"), exports);
// Export artifact contracts
__exportStar(require("./artifacts"), exports);
