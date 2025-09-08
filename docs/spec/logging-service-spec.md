Platform Logging Service Specification
Version: 1.1 (Revised)
Status: Published
Last Updated: September 8, 2025

1. Overview & Vision
This document defines the specification for the platform's LoggingService. Its primary purpose is to serve as the definitive technical implementation of the Platform Structured Logging Standard v1.0.

The vision is to use the Service Injector Pattern to create a centralized, automated service that enforces our logging standard across all applicable components. This service is responsible for not only provisioning the necessary logging infrastructure (e.g., CloudWatch Log Groups) but also for ensuring that every component's runtime is automatically instrumented with the platform's standardized logger. By centralizing this logic, we guarantee that every log event is a structured, correlated, and compliant JSON object by default.

2. Guiding Principles
Single Responsibility: The LoggingService orchestrates logging; dedicated Logging Handlers contain the implementation logic for each component type.

Centralized Logic & Extensibility: The core service is centralized, but it is extended via a pluggable map of handlers. This makes adding logging support for new components possible without modifying the core service.

Compliance by Default: The service MUST automatically apply the correct log retention periods, encryption, and data handling policies based on the complianceFramework of the service.

3. Architectural Implementation: The Handler Pattern
The LoggingService is a concrete implementation of the IPlatformService interface. It uses a Map of ILoggingHandler implementations to apply the correct logic to each component type. This is a more scalable and maintainable approach than a single, monolithic switch statement.

3.1. The ILoggingHandler Interface
This is the universal contract that all logging handlers for specific component types must adhere to.

import { BaseComponent } from '@platform/contracts';

export interface ILoggingHandler {
  /** The component type this handler is for (e.g., 'lambda-api'). */
  readonly componentType: string;
  
  /** The logic to apply logging infrastructure and instrumentation. */
  apply(component: BaseComponent): void;
}

3.2. The Refactored LoggingService
The service itself becomes a lean orchestrator. It instantiates and registers all available handlers at startup and then uses the map to delegate the apply action.

export class LoggingService implements IPlatformService {
  public readonly name = 'LoggingService';
  private readonly handlers = new Map<string, ILoggingHandler>();

  constructor() {
    // The service registers all available handlers.
    this.registerHandler(new LambdaLoggingHandler());
    this.registerHandler(new VpcLoggingHandler());
    this.registerHandler(new S3LoggingHandler());
    // ... and so on for every component that requires logging.
  }

  private registerHandler(handler: ILoggingHandler): void {
    this.handlers.set(handler.componentType, handler);
  }

  public apply(component: BaseComponent): void {
    const handler = this.handlers.get(component.getType());
    
    if (handler) {
      handler.apply(component);
    } else {
      // Safely ignore components that do not have logging requirements.
    }
  }
}
