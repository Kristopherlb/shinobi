#!/usr/bin/env npx ts-node

/**
 * Simple test script for the Platform Inventory Tool
 * Tests the inventory command against our current CDK project
 */

import { InventoryCommand } from './src/cli/inventory';

async function testInventory() {
  console.log('🔍 Testing Platform Inventory Tool...\n');
  
  const inventoryTool = new InventoryCommand();
  
  try {
    await inventoryTool.execute('./src/components', {});
    console.log('✅ Inventory tool test completed successfully!');
  } catch (error) {
    console.error('❌ Inventory tool test failed:', error);
    process.exit(1);
  }
}

testInventory();
