/**
 * Logger utility that exposes a preconfigured structured logger instance for commands
 */

import { Logger, LoggerConfig } from '../console-logger';

const sharedLogger = new Logger();

export { Logger, LoggerConfig };
export { sharedLogger as logger };
