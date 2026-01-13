export class ObservabilityService {
    buildConfig(input) {
        const { context, policy, options, spec, governance } = input;
        const optionsSafe = options ?? {};
        const collectorEndpoint = this.coalesce(optionsSafe.collectorEndpoint, policy?.observability?.collectorEndpoint, context.observability?.collectorEndpoint, process.env.OTEL_EXPORTER_OTLP_ENDPOINT, this.buildDefaultCollectorEndpoint(context));
        const tracesSampling = this.coerceNumber(this.coalesce(optionsSafe.tracesSampling, policy?.observability?.tracesSamplingRate, context.observability?.tracesSamplingRate), governance.dataClassification === 'cui' ? 1.0 : 0.1);
        const metricsInterval = this.coerceNumber(this.coalesce(optionsSafe.metricsInterval, policy?.observability?.metricsIntervalSeconds, context.observability?.metricsIntervalSeconds), 60);
        const logsRetention = this.coerceNumber(this.coalesce(optionsSafe.logsRetention, policy?.logging?.retentionDays, context.observability?.logsRetentionDays, governance.logRetentionDays), 365);
        const enablePerformanceInsights = this.coerceBoolean(this.coalesce(optionsSafe.enablePerformanceInsights, policy?.observability?.enablePerformanceInsights, context.observability?.enablePerformanceInsights), false);
        const enableXRayTracing = this.coerceBoolean(this.coalesce(optionsSafe.enableXRayTracing, policy?.observability?.enableXRayTracing, context.observability?.enableXRayTracing, context.observability?.enableTracing), governance.dataClassification === 'cui');
        const customAttributes = {
            ...(context.observability?.customAttributes ?? {}),
            ...(policy?.observability?.customAttributes ?? {}),
            ...(optionsSafe.customAttributes ?? {})
        };
        return {
            collectorEndpoint,
            serviceName: optionsSafe.serviceName ?? spec.name,
            serviceVersion: context.serviceLabels?.version ?? '1.0.0',
            environment: context.environment,
            region: context.region ?? 'us-east-1',
            complianceFramework: context.complianceFramework,
            tracesSampling,
            metricsInterval,
            logsRetention,
            enablePerformanceInsights,
            enableXRayTracing,
            customAttributes
        };
    }
    buildEnvironmentVariables(config, governance) {
        const resourceAttributes = [
            `service.name=${config.serviceName}`,
            `service.version=${config.serviceVersion}`,
            `deployment.environment=${config.environment}`,
            `cloud.provider=aws`,
            `cloud.region=${config.region}`,
            `compliance.framework=${config.complianceFramework}`
        ];
        Object.entries(config.customAttributes).forEach(([key, value]) => {
            resourceAttributes.push(`${key}=${value}`);
        });
        const envVars = {
            'OTEL_EXPORTER_OTLP_ENDPOINT': config.collectorEndpoint,
            'OTEL_EXPORTER_OTLP_HEADERS': `authorization=Bearer \${OTEL_COLLECTOR_AUTH_TOKEN}`,
            'OTEL_SERVICE_NAME': config.serviceName,
            'OTEL_SERVICE_VERSION': config.serviceVersion,
            'OTEL_RESOURCE_ATTRIBUTES': resourceAttributes.join(','),
            'OTEL_TRACES_SAMPLER': this.getTracesSampler(config.tracesSampling),
            'OTEL_METRICS_EXPORTER': 'otlp',
            'OTEL_LOGS_EXPORTER': 'otlp',
            'OTEL_PROPAGATORS': 'tracecontext,baggage,xray',
            'OTEL_INSTRUMENTATION_COMMON_DEFAULT_ENABLED': 'true'
        };
        if (config.enableXRayTracing || governance.auditLoggingRequired) {
            envVars['OTEL_INSTRUMENTATION_AWS_LAMBDA_ENABLED'] = 'true';
            envVars['OTEL_INSTRUMENTATION_AWS_LAMBDA_FLUSH_TIMEOUT'] = '30000';
        }
        return envVars;
    }
    getTracesSampler(samplingRate) {
        if (samplingRate >= 1.0) {
            return 'always_on';
        }
        if (samplingRate <= 0.0) {
            return 'always_off';
        }
        return `traceidratio:${samplingRate}`;
    }
    buildDefaultCollectorEndpoint(context) {
        const region = context.region ?? 'us-east-1';
        const environment = context.environment ?? 'env';
        return `https://otel-collector.${environment}.${region}.platform.local:4317`;
    }
    coalesce(...values) {
        for (const value of values) {
            if (value !== undefined && value !== null) {
                return value;
            }
        }
        return undefined;
    }
    coerceNumber(value, fallback) {
        if (value === undefined || value === null) {
            return fallback;
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    coerceBoolean(value, fallback) {
        if (value === undefined || value === null) {
            return fallback;
        }
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (['true', '1', 'yes', 'enabled', 'required'].includes(normalized)) {
                return true;
            }
            if (['false', '0', 'no', 'disabled', 'optional', 'recommended'].includes(normalized)) {
                return false;
            }
        }
        if (typeof value === 'number') {
            if (value === 1)
                return true;
            if (value === 0)
                return false;
        }
        return fallback;
    }
}
export const defaultObservabilityService = new ObservabilityService();
//# sourceMappingURL=observability.service.js.map