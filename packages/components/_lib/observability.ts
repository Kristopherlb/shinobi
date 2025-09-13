// packages/components/_lib/observability.ts
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { aws_cloudwatch as cw, IResource, Stack, Duration } from 'aws-cdk-lib';

export type Recipe = {
  service_type: string;
  telemetry: {
    logs?: { name: string; required?: boolean; retention_days?: Record<string, number> }[];
    metrics?: { name: string; items: string[] }[];
    tracing?: { applicable: boolean; adot_layer?: string; adot_sidecar?: boolean; xray_enabled?: boolean };
    alarms?: { name: string; metric: string; threshold?: number; threshold_pct?: number; period: number; eval_periods: number }[];
  };
  dashboards?: { name: string; widgets: string[] }[];
};

export function loadRecipe(kbRoot: string, serviceType: string): Recipe | null {
  const svc = serviceType.replace(/:.*/, '');
  const recipePath = path.join(kbRoot, 'observability', 'recipes', `${svc}.yaml`);

  if (!fs.existsSync(recipePath)) {
    return null;
  }

  try {
    return yaml.parse(fs.readFileSync(recipePath, 'utf8')) as Recipe;
  } catch (error) {
    console.warn(`Failed to load recipe for ${serviceType}:`, error);
    return null;
  }
}

// Create alarms and dashboards according to the recipe
export function applyRecipe(
  stack: Stack,
  recipe: Recipe,
  opts: {
    framework: string;
    ns: string;
    metricsNamespace?: string;
    componentName?: string;
  }
) {
  const ns = opts.metricsNamespace ?? `Platform/${recipe.service_type}`;

  // Create alarms based on recipe
  for (const alarm of (recipe.telemetry.alarms || [])) {
    new cw.Alarm(stack, `${opts.ns}${alarm.name}`, {
      alarmName: `${opts.ns}-${alarm.name}`,
      alarmDescription: `Alarm for ${alarm.metric} on ${recipe.service_type}`,
      metric: new cw.Metric({
        metricName: alarm.metric,
        namespace: ns,
        period: Duration.seconds(alarm.period)
      }),
      evaluationPeriods: alarm.eval_periods,
      threshold: alarm.threshold ?? 1,
      comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cw.TreatMissingData.BREACHING,
    });
  }

  // Create dashboards based on recipe
  if (recipe.dashboards?.length) {
    for (const dashboard of recipe.dashboards) {
      const dashboardName = `${opts.ns}-${dashboard.name.replace(/\s+/g, '')}`;
      const cwDashboard = new cw.Dashboard(stack, dashboardName, {
        dashboardName: dashboardName
      });

      // Add placeholder widgets - components can expand per service
      cwDashboard.addWidgets(
        new cw.TextWidget({
          markdown: `# ${recipe.service_type} - ${dashboard.name}\n\nFramework: ${opts.framework}`,
          width: 24,
          height: 2
        })
      );

      // Add basic metrics widgets if available
      if (recipe.telemetry.metrics?.length) {
        for (const metric of recipe.telemetry.metrics) {
          cwDashboard.addWidgets(
            new cw.GraphWidget({
              title: metric.name,
              left: [new cw.Metric({
                metricName: metric.items[0] || 'Count',
                namespace: ns,
                period: Duration.minutes(5)
              })],
              width: 12,
              height: 6
            })
          );
        }
      }
    }
  }
}

// Framework-specific retention settings
export function getFrameworkRetention(framework: string): { logs: number; metrics: number } {
  const retentionMap: Record<string, { logs: number; metrics: number }> = {
    'commercial': { logs: 30, metrics: 90 },
    'fedramp-low': { logs: 90, metrics: 365 },
    'fedramp-moderate': { logs: 180, metrics: 365 },
    'fedramp-high': { logs: 365, metrics: 730 }
  };

  return retentionMap[framework] || retentionMap['commercial'];
}

// ADOT helpers for Lambda (pattern only; call from components based on runtime)
export function enableLambdaAdot(env: Record<string, string>): Record<string, string> {
  return {
    ...env,
    AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
    OTEL_PROPAGATORS: 'tracecontext,baggage',
    OTEL_TRACES_SAMPLER: 'parentbased_always_on',
    OTEL_SERVICE_NAME: env.OTEL_SERVICE_NAME || 'lambda-function'
  };
}

// ECS ADOT sidecar configuration
export function getEcsAdotConfig(): any {
  return {
    image: 'public.ecr.aws/aws-observability/aws-otel-collector:latest',
    essential: true,
    portMappings: [
      {
        containerPort: 4317,
        protocol: 'tcp'
      },
      {
        containerPort: 4318,
        protocol: 'tcp'
      }
    ],
    environment: [
      { name: 'AWS_REGION', value: 'us-east-1' },
      { name: 'OTEL_EXPORTER_OTLP_ENDPOINT', value: 'http://localhost:4317' }
    ],
    logging: {
      driver: 'awslogs',
      options: {
        'awslogs-group': '/ecs/aws-otel-collector',
        'awslogs-region': 'us-east-1',
        'awslogs-stream-prefix': 'ecs'
      }
    }
  };
}

// API Gateway X-Ray tracing configuration
export function getApiGatewayXRayConfig(): any {
  return {
    tracingEnabled: true,
    loggingLevel: 'INFO',
    dataTraceEnabled: true,
    metricsEnabled: true
  };
}

// Helper to create log group with framework-specific retention
export function createLogGroup(
  stack: Stack,
  logGroupName: string,
  framework: string
): cw.LogGroup {
  const retention = getFrameworkRetention(framework);

  return new cw.LogGroup(stack, logGroupName.replace(/[^a-zA-Z0-9]/g, ''), {
    logGroupName,
    retention: Duration.days(retention.logs),
    removalPolicy: framework === 'commercial' ? 'destroy' : 'retain'
  });
}

// Helper to create metric filter
export function createMetricFilter(
  logGroup: cw.LogGroup,
  filterName: string,
  filterPattern: string,
  metricName: string,
  metricNamespace: string,
  metricValue: string = '1'
): cw.MetricFilter {
  return new cw.MetricFilter(logGroup, filterName, {
    logGroup,
    filterPattern: cw.FilterPattern.literal(filterPattern),
    metricNamespace,
    metricName,
    metricValue
  });
}
