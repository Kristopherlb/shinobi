/**
 * Debug script to diagnose Jest module resolution issues
 */

// #region agent log
fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'debug-jest-resolve.mjs:5',message:'Debug script started',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const results = {
  jestVersion: null,
  testSequencerVersion: null,
  jestPath: null,
  testSequencerPath: null,
  errors: []
};

// #region agent log
fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'debug-jest-resolve.mjs:20',message:'Attempting to resolve jest',data:{cwd:__dirname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion

try {
  results.jestPath = require.resolve('jest');
  const jestPkg = require('jest/package.json');
  results.jestVersion = jestPkg.version;
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'debug-jest-resolve.mjs:30',message:'Jest resolved successfully',data:{jestVersion:results.jestVersion,jestPath:results.jestPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
} catch (e) {
  results.errors.push(`Failed to resolve jest: ${e.message}`);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'debug-jest-resolve.mjs:35',message:'Failed to resolve jest',data:{error:e.message,stack:e.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
}

// #region agent log
fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'debug-jest-resolve.mjs:40',message:'Attempting to resolve @jest/test-sequencer',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
// #endregion

try {
  results.testSequencerPath = require.resolve('@jest/test-sequencer');
  const sequencerPkg = require('@jest/test-sequencer/package.json');
  results.testSequencerVersion = sequencerPkg.version;
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'debug-jest-resolve.mjs:48',message:'@jest/test-sequencer resolved successfully',data:{sequencerVersion:results.testSequencerVersion,sequencerPath:results.testSequencerPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
} catch (e) {
  results.errors.push(`Failed to resolve @jest/test-sequencer: ${e.message}`);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'debug-jest-resolve.mjs:52',message:'Failed to resolve @jest/test-sequencer',data:{error:e.message,stack:e.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
}

// Check version compatibility
if (results.jestVersion && results.testSequencerVersion) {
  const jestMajor = parseInt(results.jestVersion.split('.')[0]);
  const sequencerMajor = parseInt(results.testSequencerVersion.split('.')[0]);
  const versionMismatch = jestMajor !== sequencerMajor;
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'debug-jest-resolve.mjs:63',message:'Version compatibility check',data:{jestMajor,sequencerMajor,versionMismatch},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  if (versionMismatch) {
    results.errors.push(`Version mismatch: Jest ${results.jestVersion} requires @jest/test-sequencer ${jestMajor}.x.x, but found ${results.testSequencerVersion}`);
  }
}

// #region agent log
fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'debug-jest-resolve.mjs:70',message:'Debug script completed',data:results,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

console.log(JSON.stringify(results, null, 2));

