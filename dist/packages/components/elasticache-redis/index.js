"use strict";
/**
 * @platform/elasticache-redis - ElastiCacheRedisComponent Component
 * ElastiCache Redis Component implementing Component API Contract v1.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElastiCacheRedisComponentCreator = exports.ELASTICACHE_REDIS_CONFIG_SCHEMA = exports.ElastiCacheRedisComponentConfigBuilder = exports.ElastiCacheRedisComponentComponent = void 0;
// Component exports
var elasticache_redis_component_1 = require("./elasticache-redis.component");
Object.defineProperty(exports, "ElastiCacheRedisComponentComponent", { enumerable: true, get: function () { return elasticache_redis_component_1.ElastiCacheRedisComponentComponent; } });
// Configuration exports
var elasticache_redis_builder_1 = require("./elasticache-redis.builder");
Object.defineProperty(exports, "ElastiCacheRedisComponentConfigBuilder", { enumerable: true, get: function () { return elasticache_redis_builder_1.ElastiCacheRedisComponentConfigBuilder; } });
Object.defineProperty(exports, "ELASTICACHE_REDIS_CONFIG_SCHEMA", { enumerable: true, get: function () { return elasticache_redis_builder_1.ELASTICACHE_REDIS_CONFIG_SCHEMA; } });
// Creator exports
var elasticache_redis_creator_1 = require("./elasticache-redis.creator");
Object.defineProperty(exports, "ElastiCacheRedisComponentCreator", { enumerable: true, get: function () { return elasticache_redis_creator_1.ElastiCacheRedisComponentCreator; } });
