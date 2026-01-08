/**
 * Platform VPC Resolution Utility
 * 
 * Provides a consistent, platform-wide approach to VPC resolution that avoids
 * CloudFormation early validation errors.
 * 
 * ROOT CAUSE: CloudFormation's early validation runs BEFORE custom resources execute.
 * `Vpc.fromLookup()` creates a custom resource that queries AWS during deployment,
 * so VPC context isn't available during early validation. This causes
 * `AWS::EarlyValidation::ResourceExistenceCheck` errors when subnet groups try to
 * validate subnet IDs belong to a VPC.
 * 
 * SOLUTION: Always use `Vpc.fromVpcAttributes()` when explicit subnet IDs are provided.
 * This provides static VPC attributes at synthesis time, allowing CloudFormation to
 * validate subnet IDs during early validation.
 * 
 * @module @shinobi/core/platform/utils/vpc-resolver
 */

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import type { ComponentContext } from '../contracts/component-interfaces.js';

export interface VpcResolutionOptions {
  /** VPC ID (optional - if not provided, will check context.vpc or use default VPC) */
  vpcId?: string;
  
  /** Explicit subnet IDs (required when vpcId is provided for subnet groups) */
  subnetIds?: string[];
  
  /** Availability zones (optional, inferred from subnet IDs if not provided) */
  availabilityZones?: string[];
  
  /** AWS region (optional, used for AZ inference, defaults to us-east-1) */
  region?: string;
  
  /** VPC CIDR block (optional, needed for security group rules) */
  vpcCidrBlock?: string;
  
  /** Use default VPC if no explicit VPC ID provided (default: false) */
  useDefaultVpc?: boolean;
  
  /** Component context (optional, used to check for context.vpc) */
  context?: ComponentContext;
  
  /** Component name (for error messages) */
  componentName?: string;
}

/**
 * Resolve VPC for components that create subnet groups or security groups.
 * 
 * This function ensures consistent VPC resolution across all platform components,
 * avoiding CloudFormation early validation errors.
 * 
 * **RESOLUTION PRIORITY:**
 * 1. Explicit VPC ID with subnet IDs → Use `fromVpcAttributes()` (avoids custom resource)
 * 2. Context VPC (injected) → Use injected VPC from context
 * 3. Default VPC (if useDefaultVpc=true) → Use `fromLookup()` with isDefault: true
 * 4. Error if none provided
 * 
 * **WHY THIS MATTERS:**
 * - Subnet groups need to validate subnet IDs belong to a VPC
 * - Security groups need VPC context
 * - Early validation runs BEFORE custom resources (fromLookup) execute
 * - `fromVpcAttributes()` provides static attributes at synthesis time
 * 
 * @param scope - CDK construct scope
 * @param id - Unique identifier for the VPC construct
 * @param options - VPC resolution options
 * @returns Resolved VPC instance
 * @throws Error if no VPC can be resolved
 * 
 * @example
 * ```typescript
 * // When explicit subnet IDs are provided (RECOMMENDED)
 * const vpc = resolveVpcForSubnetGroups(this, 'Vpc', {
 *   vpcId: 'vpc-12345',
 *   subnetIds: ['subnet-abc', 'subnet-def'],
 *   availabilityZones: ['us-west-2a', 'us-west-2b'],
 *   region: 'us-west-2',
 *   context: this.context
 * });
 * 
 * // Using default VPC
 * const vpc = resolveVpcForSubnetGroups(this, 'Vpc', {
 *   useDefaultVpc: true,
 *   context: this.context
 * });
 * ```
 */
export function resolveVpcForSubnetGroups(
  scope: Construct,
  id: string,
  options: VpcResolutionOptions
): ec2.IVpc {
  const componentName = options.componentName || 'component';
  
  // Priority 1: Explicit VPC ID provided
  if (options.vpcId) {
    // When explicit subnet IDs are provided, ALWAYS use fromVpcAttributes()
    // This avoids fromLookup() custom resource that runs AFTER early validation
    if (options.subnetIds && options.subnetIds.length > 0) {
      const availabilityZones = options.availabilityZones ?? 
        inferAvailabilityZonesFromSubnetIds(options.subnetIds, options.region);
      
      const vpcAttributes: any = {
        vpcId: options.vpcId,
        availabilityZones: availabilityZones
      };
      
      // Include vpcCidrBlock if provided (required for SecurityGroup creation)
      if (options.vpcCidrBlock) {
        vpcAttributes.vpcCidrBlock = options.vpcCidrBlock;
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vpc-resolver.ts:107',message:'Creating VPC via fromVpcAttributes',data:{vpcId:options.vpcId,hasVpcCidrBlock:!!options.vpcCidrBlock,vpcCidrBlock:options.vpcCidrBlock,availabilityZonesCount:availabilityZones.length,subnetIdsCount:options.subnetIds?.length || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run23',hypothesisId:'U'})}).catch(()=>{});
      // #endregion
      
      return ec2.Vpc.fromVpcAttributes(scope, id, vpcAttributes);
    }
    
    // VPC ID provided but no subnet IDs - still use fromVpcAttributes() for consistency
    // Components creating subnet groups should provide subnet IDs
    const availabilityZones = options.availabilityZones ?? 
      inferAvailabilityZonesFromSubnetIds([], options.region);
    
    const vpcAttributes: any = {
      vpcId: options.vpcId,
      availabilityZones: availabilityZones
    };
    
    // Include vpcCidrBlock if provided (required for SecurityGroup creation)
    if (options.vpcCidrBlock) {
      vpcAttributes.vpcCidrBlock = options.vpcCidrBlock;
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vpc-resolver.ts:119',message:'Creating VPC via fromVpcAttributes (no subnet IDs)',data:{vpcId:options.vpcId,hasVpcCidrBlock:!!options.vpcCidrBlock,vpcCidrBlock:options.vpcCidrBlock,availabilityZonesCount:availabilityZones.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run23',hypothesisId:'U'})}).catch(()=>{});
    // #endregion
    
    return ec2.Vpc.fromVpcAttributes(scope, id, vpcAttributes);
  }
  
  // Priority 2: VPC injected via context
  if (options.context?.vpc) {
    return options.context.vpc;
  }
  
  // Priority 3: Default VPC fallback (when useDefaultVpc is true)
  if (options.useDefaultVpc) {
    // Use fromLookup() for default VPC - this creates a custom resource that runs after early validation
    // For default VPC, this is acceptable since components will select subnets from the VPC
    return ec2.Vpc.fromLookup(scope, id, { isDefault: true });
  }
  
  // No VPC provided and default VPC not enabled
  throw new Error(
    `${componentName} requires a VPC. ` +
    'Provide vpcId with subnetIds, inject context.vpc, or set useDefaultVpc to true.'
  );
}

/**
 * Infer availability zones from subnet IDs.
 * 
 * AWS subnet IDs don't encode availability zone information, so this function
 * provides a best-effort inference based on common patterns. For accurate
 * AZ resolution, components should provide explicit availability zones.
 * 
 * NOTE: This is a placeholder implementation. Components should provide explicit
 * availability zones when known. This function defaults to 3 AZs which works
 * for most AWS regions.
 * 
 * @param subnetIds - Array of subnet IDs
 * @param region - AWS region (optional, defaults to us-east-1)
 * @returns Array of inferred availability zones (defaults to 3 AZs)
 */
function inferAvailabilityZonesFromSubnetIds(subnetIds: string[], region: string = 'us-east-1'): string[] {
  // Default to 3 availability zones (most AWS regions have at least 3)
  // Components should provide explicit AZs when known
  const defaultAzs = ['a', 'b', 'c'];
  // Extract region base (e.g., 'us-west-2' -> 'us-west-2')
  const regionBase = region.split('-').slice(0, 2).join('-');
  const regionNumber = region.split('-').pop() || '1';
  return defaultAzs.map(az => `${regionBase}-${regionNumber}${az}`);
}

/**
 * Resolve VPC for components that DON'T create subnet groups.
 * 
 * For components that only need VPC context for security groups (not subnet groups),
 * this function provides the same resolution logic but with a clearer semantic meaning.
 * 
 * For consistency and to avoid future issues, prefer `resolveVpcForSubnetGroups()`
 * even when subnet groups aren't created - they share the same implementation.
 * 
 * @param scope - CDK construct scope
 * @param id - Unique identifier for the VPC construct
 * @param options - VPC resolution options
 * @returns Resolved VPC instance
 */
export function resolveVpcForSecurityGroups(
  scope: Construct,
  id: string,
  options: VpcResolutionOptions
): ec2.IVpc {
  // Same implementation as resolveVpcForSubnetGroups() for consistency
  return resolveVpcForSubnetGroups(scope, id, options);
}

