/**
 * Standards Chunker
 * Parses and chunks platform standards documents into addressable resources
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { StandardChunk } from '../audits/engine/types-v2.js';

/**
 * Parse a markdown standard document into chunks
 */
export function chunkStandardDocument(
  filePath: string,
  standardId: string,
  version: string = 'v1'
): StandardChunk[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const chunks: StandardChunk[] = [];

  // Split by ## headers (major sections)
  const sections = content.split(/^## /gm).filter(s => s.trim());

  for (const section of sections) {
    const lines = section.split('\n');
    const header = lines[0].trim();
    const body = lines.slice(1).join('\n').trim();

    // Skip if too small (likely just a header)
    if (body.length < 100) continue;

    // Create section ID (kebab-case)
    const sectionId = header
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    const chunkId = `${standardId}#${sectionId}`;
    const chunkContent = `## ${header}\n\n${body}`;
    const hash = createHash('sha256').update(chunkContent).digest('hex').substring(0, 16);

    chunks.push({
      id: chunkId,
      standardId,
      section: header,
      content: chunkContent,
      version,
      hash,
      updatedAt: fs.statSync(filePath).mtime.toISOString(),
      uri: `shinobi://standards/${standardId}/${version}#${sectionId}`,
    });
  }

  return chunks;
}

/**
 * Load all platform standards and chunk them
 */
export function loadAllStandards(workspaceRoot: string): Map<string, StandardChunk[]> {
  const standardsDir = path.join(workspaceRoot, 'docs/platform-standards');
  const standards = new Map<string, StandardChunk[]>();

  if (!fs.existsSync(standardsDir)) {
    return standards;
  }

  const files = fs.readdirSync(standardsDir).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(standardsDir, file);
    const standardId = file.replace(/^platform-/, '').replace('.md', '').replace('-standard', '');

    const chunks = chunkStandardDocument(filePath, standardId);
    standards.set(standardId, chunks);
  }

  return standards;
}

/**
 * Get a specific standard chunk by URI
 */
export function getStandardChunk(
  workspaceRoot: string,
  uri: string
): StandardChunk | null {
  // Parse URI: shinobi://standards/{standardId}/{version}#{section}
  const match = uri.match(/^shinobi:\/\/standards\/([^\/]+)\/([^#]+)#(.+)$/);
  if (!match) return null;

  const [, standardId, version, sectionId] = match;

  const standardsDir = path.join(workspaceRoot, 'docs/platform-standards');
  const possibleFiles = [
    `platform-${standardId}-standard.md`,
    `platform-${standardId}.md`,
    `${standardId}.md`,
  ];

  for (const filename of possibleFiles) {
    const filePath = path.join(standardsDir, filename);
    if (fs.existsSync(filePath)) {
      const chunks = chunkStandardDocument(filePath, standardId, version);
      return chunks.find(c => c.id === `${standardId}#${sectionId}`) || null;
    }
  }

  return null;
}

/**
 * List all available standards
 */
export function listStandards(workspaceRoot: string): Array<{
  id: string;
  name: string;
  uri: string;
  chunks: number;
  updatedAt: string;
}> {
  const standardsDir = path.join(workspaceRoot, 'docs/platform-standards');
  const result: Array<{
    id: string;
    name: string;
    uri: string;
    chunks: number;
    updatedAt: string;
  }> = [];

  if (!fs.existsSync(standardsDir)) {
    return result;
  }

  const files = fs.readdirSync(standardsDir).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(standardsDir, file);
    const standardId = file.replace(/^platform-/, '').replace('.md', '').replace('-standard', '');
    const name = standardId
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ') + ' Standard';

    const chunks = chunkStandardDocument(filePath, standardId);

    result.push({
      id: standardId,
      name,
      uri: `shinobi://standards/${standardId}/v1`,
      chunks: chunks.length,
      updatedAt: fs.statSync(filePath).mtime.toISOString(),
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}


