"use strict";
/**
 * @platform/core-engine - Core platform orchestration engine
 * Exports main engine classes and interfaces
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
exports.LogLevel = exports.Logger = exports.ComponentRegistry = exports.ComponentFactoryProvider = exports.ComponentBinder = exports.BinderRegistry = exports.BinderStrategy = exports.ResolverEngine = void 0;
var resolver_engine_1 = require("./resolver-engine");
Object.defineProperty(exports, "ResolverEngine", { enumerable: true, get: function () { return resolver_engine_1.ResolverEngine; } });
var binding_strategies_1 = require("./binding-strategies");
Object.defineProperty(exports, "BinderStrategy", { enumerable: true, get: function () { return binding_strategies_1.BinderStrategy; } });
Object.defineProperty(exports, "BinderRegistry", { enumerable: true, get: function () { return binding_strategies_1.BinderRegistry; } });
Object.defineProperty(exports, "ComponentBinder", { enumerable: true, get: function () { return binding_strategies_1.ComponentBinder; } });
var component_factory_provider_1 = require("./component-factory-provider");
Object.defineProperty(exports, "ComponentFactoryProvider", { enumerable: true, get: function () { return component_factory_provider_1.ComponentFactoryProvider; } });
Object.defineProperty(exports, "ComponentRegistry", { enumerable: true, get: function () { return component_factory_provider_1.ComponentRegistry; } });
var logger_1 = require("./logger");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return logger_1.Logger; } });
Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return logger_1.LogLevel; } });
// Re-export contracts for convenience
__exportStar(require("@platform/contracts"), exports);
