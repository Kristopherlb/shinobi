/**
 * Event Source Scanner
 * 
 * Scans component eventSources and generates implicit bindings for the binder system.
 * Implements Event Source Auto-Binding per platform-bindings-spec.md v2.1 (lines 271-282).
 * 
 * Architectural Note: Event-source-generated bindings are synthetic outbound bindings
 * created to satisfy inbound trigger requirements. Graph direction: queue → lambda (trigger),
 * but we generate lambda → queue binding (source → target) for IAM permissions.
 * This makes dependency graphs correct and prevents confusion in MCP dependency views.
 */

import type { IComponent } from '../platform/contracts/index.js';
import type { BindingDirective } from '../platform/contracts/platform-binding-trigger-spec.js';

/**
 * Private symbol for internal source component name tracking
 * This ensures the field doesn't leak outside the scanner
 */
const SOURCE_COMPONENT_NAME_SYMBOL = Symbol('_sourceComponentName');

/**
 * Extended binding directive with internal source component name tracking
 * Uses Symbol to prevent field leakage outside the scanner
 */
type EventSourceBindingDirective = BindingDirective & {
  [SOURCE_COMPONENT_NAME_SYMBOL]?: string;
}

/**
 * Logger interface for audit trail logging
 */
interface Logger {
  warn(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
}

/**
 * Supported event source types for auto-binding
 * Extensible array for future event types (SNS, DynamoDB Streams, EventBridge, etc.)
 */
const SUPPORTED_EVENT_TYPES = ['sqs'] as const;
type SupportedEventType = typeof SUPPORTED_EVENT_TYPES[number];

export class EventSourceScanner {
  /**
   * Scan components for event sources and generate implicit bindings
   * 
   * @param components - Array of components to scan
   * @param logger - Optional logger for audit trail (warnings, debug info)
   * @returns Array of generated binding directives with internal source component tracking
   */
  static scanEventSourcesForBindings(components: IComponent[], logger?: Logger): EventSourceBindingDirective[] {
    const bindings: EventSourceBindingDirective[] = [];

    for (const component of components) {
      const config = component.spec?.config;
      if (!config || !config.eventSources) {
        continue;
      }

      // Check opt-out flag
      let autoBind = true;
      let eventSourcesArray: any[] = [];

      // Handle both array format and object format with autoBind flag
      // Schema: { type: 'object', properties: { autoBind: { type: 'boolean' }, sources: { type: 'array' } } }
      if (Array.isArray(config.eventSources)) {
        eventSourcesArray = config.eventSources;
        // autoBind defaults to true when using array format
      } else if (typeof config.eventSources === 'object') {
        // Object format: { autoBind: boolean, sources: [...] }
        autoBind = config.eventSources.autoBind !== false; // Default to true
        eventSourcesArray = config.eventSources.sources || [];
      }

      // Skip if auto-binding is disabled
      if (!autoBind) {
        continue;
      }

      // Process each event source
      for (const eventSource of eventSourcesArray) {
        const eventType = eventSource.type as SupportedEventType;
        
        // Only process supported event types (extensible for future types)
        if (!SUPPORTED_EVENT_TYPES.includes(eventType)) {
          // Skip unsupported types gracefully (SNS, DynamoDB Streams, etc. - future support)
          continue;
        }

        if (eventType === 'sqs' && eventSource.queueArn) {
          const queueArn = eventSource.queueArn;

          // Handle component reference
          if (queueArn.startsWith('@component:')) {
            const componentName = queueArn.replace('@component:', '');
            const binding: EventSourceBindingDirective = {
              to: componentName,
              capability: 'messaging:sqs',
              access: 'read'
            };
            // Store source component name using Symbol for internal tracking
            binding[SOURCE_COMPONENT_NAME_SYMBOL] = component.spec.name;
            bindings.push(binding);
          } else if (typeof queueArn === 'string' && queueArn.startsWith('arn:aws:sqs:')) {
            // External ARN - require explicit opt-in flag per platform-bindings-spec.md line 274
            if (!eventSource.allowDirectGrant) {
              throw new Error(
                `External queue ARN detected but allowDirectGrant flag not set. ` +
                `For external queues, you must explicitly opt-in per platform-bindings-spec.md line 274: ` +
                `eventSources: [{ type: 'sqs', queueArn: '${queueArn}', allowDirectGrant: true }]`
              );
            }
            
            // External queues with allowDirectGrant skip auto-binding (handled by component)
            // Log warning for audit trail even when allowDirectGrant is set
            if (logger) {
              logger.warn(
                `External queue ARN detected - skipping auto-binding (handled by component with allowDirectGrant). ` +
                `This bypasses binder-managed IAM policies.`,
                {
                  componentName: component.spec.name,
                  queueArn: queueArn,
                  allowDirectGrant: eventSource.allowDirectGrant,
                  specReference: 'platform-bindings-spec.md line 274'
                }
              );
            }
            // Continue to next event source
          }
        }
      }
    }

    return bindings;
  }

  /**
   * Extract source component name from binding directive (internal use only)
   * @internal
   */
  static getSourceComponentName(binding: EventSourceBindingDirective): string | undefined {
    return binding[SOURCE_COMPONENT_NAME_SYMBOL];
  }

  /**
   * Remove internal tracking fields from binding directive
   * @internal
   */
  static stripInternalFields(binding: EventSourceBindingDirective): BindingDirective {
    const { [SOURCE_COMPONENT_NAME_SYMBOL]: _, ...cleanBinding } = binding;
    return cleanBinding;
  }
}

