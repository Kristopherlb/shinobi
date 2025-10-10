# ElastiCache Redis - Observability Guide

**Component:** `elasticache-redis`  
**Version:** 1.0.0  
**Last Updated:** October 10, 2025

---

## Overview

This directory contains operational observability resources for the ElastiCache Redis component, including CloudWatch dashboards, alarm configurations, operational runbooks, and SLO definitions.

---

## Available Resources

### 📊 Dashboards
- **[redis-performance.json](./dashboards/redis-performance.json)** - Performance metrics dashboard
- **[redis-health.json](./dashboards/redis-health.json)** - Health and availability dashboard

### 📈 Metrics
See **[metrics.md](./metrics.md)** for complete reference of available CloudWatch metrics

### 🚨 Alarms
See **[alarms.md](./alarms.md)** for alarm configuration guidelines and thresholds

### 📖 Runbooks
Operational troubleshooting guides:
- **[high-cpu.md](./runbooks/high-cpu.md)** - High CPU utilization
- **[cache-misses.md](./runbooks/cache-misses.md)** - High cache miss rate
- **[evictions.md](./runbooks/evictions.md)** - Memory pressure and evictions
- **[connection-limit.md](./runbooks/connection-limit.md)** - Connection exhaustion

### 🎯 SLOs
- **[cache-availability.yaml](./slos/cache-availability.yaml)** - Service Level Objectives

---

## Quick Start

### Enable Monitoring
```yaml
# service.yml
components:
  - name: cache
    type: elasticache-redis
    config:
      monitoring:
        enabled: true
        alarms:
          cpuUtilization:
            enabled: true
            threshold: 75
            evaluationPeriods: 2
          cacheMisses:
            enabled: true
            threshold: 1000
          evictions:
            enabled: true
            threshold: 10
          connections:
            enabled: true
            threshold: 500
```

### Deploy Dashboard
```bash
# Upload CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name my-service-cache-performance \
  --dashboard-body file://observability/dashboards/redis-performance.json
```

### View Logs
```bash
# View slow query logs
aws logs tail /aws/platform/redis/my-service-cache/slow-log --follow

# Filter for specific patterns
aws logs filter-log-events \
  --log-group-name /aws/platform/redis/my-service-cache/slow-log \
  --filter-pattern "latency > 1000"
```

> Monitoring is mandatory: the component will reject configurations that disable telemetry and always provisions slow- and engine-log destinations with compliant retention.

---

## Alarm Response

When an alarm triggers:

1. **Check the Dashboard** - Start with the health dashboard to get overall status
2. **Consult the Runbook** - Each alarm type has a corresponding runbook
3. **Review Recent Changes** - Check recent deployments or configuration changes
4. **Escalate if Needed** - Follow your team's escalation procedures

---

## SLO Monitoring

The component supports the following SLOs:

| SLO | Target | Measurement |
|-----|--------|-------------|
| Cache Availability | 99.9% | Uptime monitoring |
| Cache Hit Rate | > 80% | CacheHits / (CacheHits + CacheMisses) |
| P95 Latency | < 5ms | Redis response time |
| Memory Utilization | < 80% | BytesUsedForCache / MaxMemory |

See **[slos/cache-availability.yaml](./slos/cache-availability.yaml)** for detailed SLO definitions.

---

## Key Metrics to Monitor

### Critical (Always Monitor)
- `CPUUtilization` - Redis process CPU usage
- `CacheMisses` - Cache effectiveness indicator
- `Evictions` - Memory pressure indicator
- `CurrConnections` - Connection pool health

### Important (FedRAMP/Production)
- `EngineCPUUtilization` - Redis engine thread CPU
- `SwapUsage` - Memory swap indicator
- `ReplicationLag` - Multi-AZ synchronization
- `NetworkBytesIn/Out` - Traffic patterns

### Supplementary (Troubleshooting)
- `CacheHits` - Cache effectiveness (complement to misses)
- `DatabaseMemoryUsagePercentage` - Memory consumption
- `NewConnections` - Connection churn rate
- `BytesUsedForCache` - Actual memory usage

---

## Log Delivery Configuration

The component supports two types of Redis logs:

### Managed Log Groups
The component provisions two CloudWatch log groups automatically when monitoring is enabled:

- `/aws/platform/redis/<service>-<component>/slow-log`
- `/aws/platform/redis/<service>-<component>/engine-log`

Both log groups are encrypted with a dedicated KMS key, inherit platform tags, and default to compliance-specific retention (1/3/7 years).

---

## Compliance Framework Differences

### Commercial
- Monitoring: **Optional** (must be explicitly enabled)
- Log Retention: **1 year**
- Alarm Thresholds: **Relaxed**

### FedRAMP Moderate
- Monitoring: **Required** (enabled by default)
- Log Retention: **3 years**
- Alarm Thresholds: **Moderate**
- Additional: Performance Insights enabled

### FedRAMP High
- Monitoring: **Required** (enabled by default)
- Log Retention: **7 years**
- Alarm Thresholds: **Strict**
- Additional: Enhanced monitoring, all log types, immutable logs

---

## Dashboard Access

### Via AWS Console
1. Navigate to CloudWatch → Dashboards
2. Select your dashboard (e.g., `my-service-cache-performance`)
3. View real-time metrics

### Via CLI
```bash
# Get dashboard definition
aws cloudwatch get-dashboard --dashboard-name my-service-cache-performance

# List all dashboards
aws cloudwatch list-dashboards
```

---

## Alerting Integration

The component integrates with SNS for alarm notifications:

```yaml
monitoring:
  enabled: true
  snsTopicArn: arn:aws:sns:region:account:topic-name
```

### Recommended SNS Integration
- **Slack** - Real-time team notifications
- **PagerDuty** - On-call alerting
- **Email** - Management notifications
- **Lambda** - Automated remediation

---

## Performance Tuning

Use observability data to tune Redis configuration:

| Symptom | Metric | Tuning Action |
|---------|--------|---------------|
| High CPU | `CPUUtilization > 80%` | Scale up node type |
| Cache misses | `CacheMisses` increasing | Review TTL settings, increase cache size |
| Evictions | `Evictions > 0` | Increase memory, review maxmemory-policy |
| Connection issues | `CurrConnections` at limit | Increase timeout, review connection pooling |

---

## Additional Resources

- **AWS ElastiCache Monitoring Guide**: [ElastiCache CloudWatch Metrics](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.html)
- **Platform Observability Standard**: `docs/platform-standards/platform-observability-standard.md`
- **Redis Best Practices**: [Redis Performance](https://redis.io/docs/management/optimization/)

---

**For questions or issues with observability, contact:** Platform Engineering Team
