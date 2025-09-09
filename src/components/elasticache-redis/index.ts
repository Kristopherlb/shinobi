/**
 * @platform/elasticache-redis - ElastiCacheRedisComponent Component
 * ElastiCache Redis Component implementing Component API Contract v1.0
 */

// Component exports
export { ElastiCacheRedisComponentComponent } from './elasticache-redis.component';

// Configuration exports
export { 
  ElastiCacheRedisConfig,
  ElastiCacheRedisComponentConfigBuilder,
  ELASTICACHE_REDIS_CONFIG_SCHEMA
} from './elasticache-redis.builder';

// Creator exports
export { ElastiCacheRedisComponentCreator } from './elasticache-redis.creator';