"use strict";
/**
 * @platform/migration - CDK Migration Engine
 * Tools for migrating existing CDK projects to platform format
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
// Export main migration engine
__exportStar(require("./migration-engine"), exports);
// Export migration components
__exportStar(require("./cloudformation-analyzer"), exports);
__exportStar(require("./resource-mapper"), exports);
__exportStar(require("./logical-id-preserver"), exports);
__exportStar(require("./migration-validator"), exports);
__exportStar(require("./migration-reporter"), exports);
