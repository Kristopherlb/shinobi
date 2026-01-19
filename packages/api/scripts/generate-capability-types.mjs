import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileFromFile } from 'json-schema-to-typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, '..', 'src', 'schemas', 'capability.schema.json');
const outPath = path.join(__dirname, '..', 'src', 'types', 'capability.ts');

const bannerComment = `/**
 * NOTE: This file is generated from src/schemas/capability.schema.json.
 *
 * Regenerate via:
 *   pnpm --filter @shinobi/api run generate:types
 */`;

const ts = await compileFromFile(schemaPath, {
  bannerComment,
  additionalProperties: false,
  strictIndexSignatures: true,
  unknownAny: true,
  style: {
    semi: true,
    singleQuote: true,
  },
});

await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, ts, 'utf8');


