/**
 * Logger utility that exposes a preconfigured structured logger instance for commands
 */
import { Logger } from '../console-logger.js';
const sharedLogger = new Logger();
export { Logger };
export { sharedLogger as logger };
