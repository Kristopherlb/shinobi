Platform Service Injector Standard
Version: 1.0
Status: Published
Last Updated: September 7, 2025

1. Overview & Vision
This document defines the specification for a critical architectural refactoring of the platform. The goal is to move all cross-cutting logic (observability, tagging, security scanning, etc.) out of individual components and into a new layer of centrally-managed, injectable Platform Services.

The current model requires every component (e.g., VpcComponent, Ec2InstanceComponent) to contain specific knowledge of how to implement observability, apply tags, and handle other platform-wide standards. This violates the Single Responsibility Principle, creates significant code duplication, and makes it difficult for the SRE/Platform team to evolve standards without modifying dozens of component files.

The vision is to create a clean separation of concerns. Components are responsible for creating resources. Platform Services are responsible for enhancing those resources with cross-cutting capabilities. This refactoring will make our component code dramatically simpler, centralize our standards logic for easy maintenance, and create a clear, extensible pattern for adding new platform-wide capabilities in the future.

2. Guiding Principles
Single Responsibility: A component's only job is to synthesize its core AWS resources. A Platform Service's only job is to apply a single, cross-cutting concern.

Centralized Logic: The implementation for a platform-wide standard (like our OTel observability rules) MUST exist in only one place: its dedicated Platform Service class.

Extensible & Pluggable: The system MUST be designed to allow the SRE team to add new Platform Services (e.g., a CostOptimizationService) in the future without modifying the core ResolverEngine or existing components.

Clear SRE Workflow: The process for managing a standard (e.g., adding a new standard CloudWatch Alarm for all databases) MUST be a simple, localized change within a single, dedicated service file.

3. Architectural Implementation: The Service Injector Pattern
The refactoring introduces three new architectural constructs and modifies the ResolverEngine.

3.1. The IPlatformService Interface
This is the simple, universal contract that all injectable services must adhere to.

Location: @platform/contracts

Specification:

import { BaseComponent } from './base-component';

export interface IPlatformService {
  /**
   * The name of the service, used for logging and identification.
   */
  readonly name: string;

  /**
   * The core method that applies the service's logic to a component
   * after it has been fully synthesized.
   * @param component The fully synthesized component instance.
   */
  apply(component: BaseComponent): void;
}
