"use strict";
/**
 * @platform/rds-postgres - RdsPostgresComponent Component
 * RDS PostgreSQL Component
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RdsPostgresComponentCreator = exports.RDS_POSTGRES_CONFIG_SCHEMA = exports.RdsPostgresComponentConfigBuilder = exports.RdsPostgresComponentComponent = void 0;
// Component exports
var rds_postgres_component_1 = require("./rds-postgres.component");
Object.defineProperty(exports, "RdsPostgresComponentComponent", { enumerable: true, get: function () { return rds_postgres_component_1.RdsPostgresComponentComponent; } });
// Configuration exports
var rds_postgres_builder_1 = require("./rds-postgres.builder");
Object.defineProperty(exports, "RdsPostgresComponentConfigBuilder", { enumerable: true, get: function () { return rds_postgres_builder_1.RdsPostgresComponentConfigBuilder; } });
Object.defineProperty(exports, "RDS_POSTGRES_CONFIG_SCHEMA", { enumerable: true, get: function () { return rds_postgres_builder_1.RDS_POSTGRES_CONFIG_SCHEMA; } });
// Creator exports
var rds_postgres_creator_1 = require("./rds-postgres.creator");
Object.defineProperty(exports, "RdsPostgresComponentCreator", { enumerable: true, get: function () { return rds_postgres_creator_1.RdsPostgresComponentCreator; } });
