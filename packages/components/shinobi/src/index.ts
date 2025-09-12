/**
 * Shinobi Component - The Platform Intelligence Brain
 * 
 * A production-grade Ops MCP Server that becomes the brain for SRE/DevOps/DPE/Developers and leadership.
 * Delivers exceptional DX/UX from day one, runs locally and in AWS, and provides a clean runway 
 * to a drag-and-drop GUI that outputs platform L3 construct manifests.
 */

export { ShinobiComponent } from './shinobi.component';
export { ShinobiComponentConfigBuilder, ShinobiConfig } from './shinobi.builder';
export { ShinobiComponentCreator } from './shinobi.creator';
export { 
  SHINOBI_FEATURE_FLAGS, 
  createShinobiFeatureFlags, 
  getShinobiFeatureFlagConfig 
} from './shinobi-feature-flags';

// Export MCP Server
export { ShinobiMcpServer, startShinobiServer } from './server/index';
