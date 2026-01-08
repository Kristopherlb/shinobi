/**
 * File Utilities
 * 
 * Utility functions for file system operations used by CLI commands
 */

import * as fsp from 'fs/promises';
import * as path from 'path';

/**
 * Ensure a directory exists, creating it recursively if needed
 * 
 * @param dir - Directory path to ensure exists
 */
export async function ensureOutputDir(dir: string): Promise<void> {
  await fsp.mkdir(dir, { recursive: true });
}

/**
 * Recursively copy a directory and all its contents
 * 
 * @param src - Source directory path
 * @param dest - Destination directory path
 */
export async function copyDirectory(src: string, dest: string): Promise<void> {
  const entries = await fsp.readdir(src, { withFileTypes: true });
  await ensureOutputDir(dest);
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fsp.copyFile(srcPath, destPath);
    }
  }
}

