#!/usr/bin/env npx ts-node

/**
 * Test script for the Enhanced Platform Inventory Tool
 */

import { InventoryCommand } from './src/cli/inventory';

async function testEnhancedInventory() {
  console.log('🚀 Testing Enhanced Platform Inventory Tool...\n');
  
  const inventoryTool = new InventoryCommand();
  
  try {
    await inventoryTool.execute('./src/components', {});
    console.log('✅ Enhanced inventory tool test completed successfully!');
    console.log('\n📄 Check the generated INVENTORY_REPORT.md for enhanced analysis features:');
    console.log('  - Architectural value scoring');
    console.log('  - Complexity reduction estimates');
    console.log('  - Anti-pattern detection');
    console.log('  - ROI analysis');
    console.log('  - Related pattern identification');
  } catch (error) {
    console.error('❌ Enhanced inventory tool test failed:', error);
    process.exit(1);
  }
}

testEnhancedInventory();
