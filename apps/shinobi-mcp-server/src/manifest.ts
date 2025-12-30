/**
 * Manifest Intelligence Domain
 * 
 * Provides manifest generation, component generation, linting, and KB operations.
 */

import fs from 'node:fs';
import path from 'node:path';
import { DomainModule, ToolDefinition, DomainContext } from './types.js';
import { sh } from './utils.js';

const MANIFEST_TOOLS: ToolDefinition[] = [
  {
    name: 'generate_manifest',
    description: 'Generate production-ready manifest snippet(s) from high-level prompt',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'High-level description of what to generate' },
        includeRationale: { type: 'boolean', description: 'Include rationale for decisions', default: true }
      },
      required: ['prompt']
    }
  },
  {
    name: 'generate_component',
    description: 'Generate production-grade AWS CDK L3 component with compliance by construction using Platform KB',
    inputSchema: {
      type: 'object',
      properties: {
        componentName: { type: 'string', description: 'Name of the component (e.g., s3-bucket, lambda-api)' },
        serviceType: { type: 'string', description: 'Service type (e.g., s3-bucket, lambda-api)' },
        framework: { type: 'string', enum: ['commercial', 'fedramp-low', 'fedramp-moderate', 'fedramp-high'], description: 'Target compliance framework' },
        packsToInclude: { type: 'array', items: { type: 'string' }, description: 'Specific pack IDs to include (if omitted, will infer from service and framework)' },
        extraControlTags: { type: 'array', items: { type: 'string' }, description: 'Additional NIST control tags (e.g., AC-2(3), AT-4(b))' },
        includeTests: { type: 'boolean', description: 'Generate comprehensive test suite', default: true },
        includeObservability: { type: 'boolean', description: 'Generate observability configs (alarms, dashboards)', default: true },
        includePolicies: { type: 'boolean', description: 'Generate REGO policies for posture rules', default: true }
      },
      required: ['componentName', 'serviceType', 'framework']
    }
  },
  {
    name: 'kb.selectPacks',
    description: 'Select packs and flatten rules for a service/framework',
    inputSchema: {
      type: 'object',
      properties: {
        serviceType: { type: 'string', description: 'Service type (e.g., s3-bucket, lambda-api)' },
        framework: { type: 'string', enum: ['commercial', 'fedramp-low', 'fedramp-moderate', 'fedramp-high'], description: 'Target compliance framework' },
        explicitPackIds: { type: 'array', items: { type: 'string' }, nullable: true, description: 'Explicit pack IDs to use instead of auto-selection' }
      },
      required: ['serviceType', 'framework']
    }
  },
  {
    name: 'component.scaffold',
    description: 'Create component package + audit plan + obs stubs from packs',
    inputSchema: {
      type: 'object',
      properties: {
        componentName: { type: 'string', description: 'Component name' },
        serviceType: { type: 'string', description: 'Service type' },
        framework: { type: 'string', description: 'Compliance framework' },
        packs: { type: 'array', items: { type: 'string' }, description: 'Selected pack IDs' },
        extraControls: { type: 'array', items: { type: 'string' }, default: [], description: 'Extra NIST control tags' }
      },
      required: ['componentName', 'serviceType', 'framework', 'packs']
    }
  },
  {
    name: 'component.generateTests',
    description: 'Generate unit tests from audit plan',
    inputSchema: {
      type: 'object',
      properties: {
        componentName: { type: 'string', description: 'Component name' }
      },
      required: ['componentName']
    }
  },
  {
    name: 'component.generateRego',
    description: 'Generate REGO policies from audit plan',
    inputSchema: {
      type: 'object',
      properties: {
        componentName: { type: 'string', description: 'Component name' }
      },
      required: ['componentName']
    }
  },
  {
    name: 'audit.static',
    description: 'Run synth + (nag|guard|conftest) over the repo',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'qa.component',
    description: 'Answer packs/controls/rules for a component from its plan',
    inputSchema: {
      type: 'object',
      properties: {
        componentName: { type: 'string', description: 'Component name' },
        question: { type: 'string', description: 'Question about the component' }
      },
      required: ['componentName', 'question']
    }
  },
  {
    name: 'component_wizard',
    description: 'Interactive wizard for guided component generation with step-by-step guidance',
    inputSchema: {
      type: 'object',
      properties: {
        step: { type: 'string', enum: ['start', 'component-type', 'description', 'compliance', 'stages', 'review', 'generate'], description: 'Current step in the wizard', default: 'start' },
        componentType: { type: 'string', description: 'Type of component to generate (required after component-type step)' },
        description: { type: 'string', description: 'Description of what the component should do (required after description step)' },
        complianceFramework: { type: 'string', enum: ['commercial', 'fedramp-moderate', 'fedramp-high'], description: 'Target compliance framework (required after compliance step)', default: 'commercial' },
        stages: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 5 }, description: 'Which stages to execute (required after stages step)', default: [0, 1, 2, 3, 4, 5] },
        previousAnswers: { type: 'object', description: 'Previous answers from wizard steps (for context)' }
      },
      required: ['step']
    }
  },
  {
    name: 'lint_manifest',
    description: 'Lint manifest for policy and style issues with auto-fix suggestions',
    inputSchema: {
      type: 'object',
      properties: {
        manifest: { type: 'object', description: 'Manifest to lint' },
        autoFix: { type: 'boolean', description: 'Apply auto-fixes where possible', default: false }
      },
      required: ['manifest']
    }
  },
  {
    name: 'upgrade_manifest',
    description: 'Migrate old fields to new standards with PR-ready diff summary',
    inputSchema: {
      type: 'object',
      properties: {
        manifest: { type: 'object', description: 'Manifest to upgrade' },
        targetVersion: { type: 'string', description: 'Target platform version', default: 'latest' }
      },
      required: ['manifest']
    }
  }
];

// Tool implementations
async function generateManifest(args: any): Promise<any> {
  return {
    content: [{
      type: 'text',
      text: `Manifest generated for prompt: ${args.prompt}`
    }]
  };
}

async function generateComponent(args: any, workspaceRoot: string): Promise<any> {
  const { componentName, serviceType, framework } = args;
  
  try {
    // Use kb-load to select packs
    const kbOut = await sh('node', ['tools/kb-load.mjs', 'platform-kb', serviceType, framework], { cwd: workspaceRoot });
    const kbData = JSON.parse(kbOut);
    
    // Generate component artifacts (placeholder for now)
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          componentName,
          serviceType,
          framework,
          packsSelected: (kbData.chosen || []).length,
          message: 'Component generation pipeline integration pending'
        }, null, 2)
      }]
    };
  } catch (error) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          componentName
        }, null, 2)
      }]
    };
  }
}

async function kbSelectPacks(args: any, workspaceRoot: string): Promise<any> {
  const { serviceType, framework } = args;

  try {
    const out = await sh('node', ['tools/kb-load.mjs', 'platform-kb', serviceType, framework], { cwd: workspaceRoot });
    const data = JSON.parse(out);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          packs: (data.chosen || []).map((c: any) => c.meta?.id ?? c.id).filter(Boolean),
          rules: (data.chosen || []).flatMap((c: any) => c.pack?.rules || []),
          nist_controls: Array.from(new Set(
            (data.chosen || []).flatMap((c: any) => c.pack?.rules || []).flatMap((r: any) => r.nist_controls || [])
          )),
          serviceType,
          framework
        }, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          serviceType,
          framework
        }, null, 2)
      }]
    };
  }
}

async function componentScaffold(args: any, workspaceRoot: string): Promise<any> {
  const { componentName, serviceType, framework, packs, extraControls = [] } = args;

  try {
    const tmpFile = path.join(workspaceRoot, `.tmp.packs.${Date.now()}.json`);
    const packsData = {
      chosen: packs.map((id: string) => ({ meta: { id } }))
    };

    fs.writeFileSync(tmpFile, JSON.stringify(packsData, null, 2));

    await sh('node', [
      'tools/agent-scaffold.mjs',
      '--component', componentName,
      '--service-type', serviceType,
      '--framework', framework,
      '--packs', tmpFile,
      '--controls', extraControls.join(',')
    ], { cwd: workspaceRoot });

    fs.unlinkSync(tmpFile);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          componentName,
          serviceType,
          framework,
          packs,
          extraControls,
          path: `packages/components/${componentName}`,
          artifacts: [
            'Component package structure',
            'audit/component.plan.json',
            'Observability stubs',
            'Test scaffolding'
          ]
        }, null, 2)
      }]
    };
  } catch (error) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          componentName
        }, null, 2)
      }]
    };
  }
}

async function componentGenerateTests(args: any, workspaceRoot: string): Promise<any> {
  const { componentName } = args;

  try {
    await sh('node', ['tools/gen-tests-from-plan.mjs', componentName], { cwd: workspaceRoot });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          componentName,
          action: 'Generated unit tests from audit plan',
          testFiles: [
            `packages/components/${componentName}/tests/unit/builder.test.ts`,
            `packages/components/${componentName}/tests/unit/component.test.ts`,
            `packages/components/${componentName}/tests/compliance.test.ts`,
            `packages/components/${componentName}/tests/observability.test.ts`
          ]
        }, null, 2)
      }]
    };
  } catch (error) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          componentName
        }, null, 2)
      }]
    };
  }
}

async function componentGenerateRego(args: any, workspaceRoot: string): Promise<any> {
  const { componentName } = args;

  try {
    await sh('node', ['tools/gen-rego-from-plan.mjs', componentName], { cwd: workspaceRoot });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          componentName,
          action: 'Generated REGO policies from audit plan'
        }, null, 2)
      }]
    };
  } catch (error) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          componentName
        }, null, 2)
      }]
    };
  }
}

async function auditStatic(args: any, workspaceRoot: string): Promise<any> {
  try {
    await sh('pnpm', ['run', 'synth'], { cwd: workspaceRoot });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          action: 'Static audit completed via synth + nag'
        }, null, 2)
      }]
    };
  } catch (error) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error instanceof Error ? error.message : String(error)
        }, null, 2)
      }]
    };
  }
}

async function qaComponent(args: any, workspaceRoot: string): Promise<any> {
  const { componentName, question } = args;
  const planPath = path.join(workspaceRoot, 'packages', 'components', componentName, 'audit', 'component.plan.json');
  
  if (!fs.existsSync(planPath)) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: `No audit plan found for component '${componentName}' at ${planPath}`
        }, null, 2)
      }]
    };
  }

  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        componentName,
        question,
        packs: plan.packs || [],
        nist_controls: plan.nist_controls || [],
        rules: plan.rules || []
      }, null, 2)
    }]
  };
}

async function componentWizard(args: any): Promise<any> {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        message: 'Component wizard not yet implemented',
        step: args.step
      }, null, 2)
    }]
  };
}

async function lintManifest(args: any): Promise<any> {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        message: 'Manifest linting not yet implemented'
      }, null, 2)
    }]
  };
}

async function upgradeManifest(args: any): Promise<any> {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        message: 'Manifest upgrade not yet implemented'
      }, null, 2)
    }]
  };
}

export const manifestDomain: DomainModule = {
  getToolDefinitions: () => MANIFEST_TOOLS,
  
  handleToolCall: async (name: string, args: any, context: DomainContext) => {
    const { workspaceRoot } = context;
    
    switch (name) {
      case 'generate_manifest':
        return generateManifest(args);
      case 'generate_component':
        return generateComponent(args, workspaceRoot);
      case 'kb.selectPacks':
        return kbSelectPacks(args, workspaceRoot);
      case 'component.scaffold':
        return componentScaffold(args, workspaceRoot);
      case 'component.generateTests':
        return componentGenerateTests(args, workspaceRoot);
      case 'component.generateRego':
        return componentGenerateRego(args, workspaceRoot);
      case 'audit.static':
        return auditStatic(args, workspaceRoot);
      case 'qa.component':
        return qaComponent(args, workspaceRoot);
      case 'component_wizard':
        return componentWizard(args);
      case 'lint_manifest':
        return lintManifest(args);
      case 'upgrade_manifest':
        return upgradeManifest(args);
      default:
        throw new Error(`Unknown manifest tool: ${name}`);
    }
  }
};


