# ElastiCache Redis - CloudWatch Metrics Reference

**Component:** `elasticache-redis`  
**Last Updated:** October 10, 2025

---

## Overview

This document provides a complete reference for all CloudWatch metrics available for ElastiCache Redis clusters, including AWS-provided metrics and component-configured alarms.

---

## Component-Configured Alarms

The following alarms are automatically created when `monitoring.enabled: true`:

### 1. CPU Utilization
**Metric Name:** `CPUUtilization`  
**Namespace:** `AWS/ElastiCache`  
**Statistic:** `Average`  
**Unit:** `Percent`

**Description:** Percentage of CPU utilization for the Redis process.

**Default Threshold:** 80%  
**Recommended Threshold:**
- Commercial: 80-90%
- FedRAMP Moderate: 75%
- FedRAMP High: 70%

**Troubleshooting:** See [runbooks/high-cpu.md](./runbooks/high-cpu.md)

---

### 2. Cache Misses
**Metric Name:** `CacheMisses`  
**Namespace:** `AWS/ElastiCache`  
**Statistic:** `Sum`  
**Unit:** `Count`

**Description:** Number of unsuccessful read-only key lookups in the cache.

**Default Threshold:** 1000 per period  
**Evaluation:** High cache misses indicate poor cache hit rate

**Troubleshooting:** See [runbooks/cache-misses.md](./runbooks/cache-misses.md)

---

### 3. Evictions
**Metric Name:** `Evictions`  
**Namespace:** `AWS/ElastiCache`  
**Statistic:** `Sum`  
**Unit:** `Count`

**Description:** Number of non-expired items evicted from cache due to memory constraints.

**Default Threshold:** 10 evictions  
**Evaluation:** Any evictions indicate memory pressure

**Troubleshooting:** See [runbooks/evictions.md](./runbooks/evictions.md)

---

### 4. Current Connections
**Metric Name:** `CurrConnections`  
**Namespace:** `AWS/ElastiCache`  
**Statistic:** `Average`  
**Unit:** `Count`

**Description:** Number of client connections to the cache cluster.

**Default Threshold:** 500 connections  
**Max Connections:** Varies by node type

**Troubleshooting:** See [runbooks/connection-limit.md](./runbooks/connection-limit.md)

---

## Additional AWS Metrics (Not Yet Implemented)

### Engine CPU Utilization
**Metric Name:** `EngineCPUUtilization`  
**Description:** CPU utilization of the Redis engine thread (for larger node types)  
**Recommended:** Monitor for r6g.xlarge and larger  
**Priority:** HIGH

### Swap Usage
**Metric Name:** `SwapUsage`  
**Description:** Amount of swap space used on the host  
**Threshold:** Should remain at 0; any swap usage indicates memory pressure  
**Priority:** HIGH

### Cache Hits
**Metric Name:** `CacheHits`  
**Description:** Number of successful read-only key lookups  
**Use:** Calculate hit rate: `CacheHits / (CacheHits + CacheMisses)`  
**Priority:** HIGH

### Replication Lag
**Metric Name:** `ReplicationLag`  
**Description:** Seconds a replica lags behind the primary node  
**Threshold:** < 5 seconds for Multi-AZ deployments  
**Priority:** HIGH (Multi-AZ only)

### Network Bytes In/Out
**Metric Names:** `NetworkBytesIn`, `NetworkBytesOut`  
**Description:** Network traffic to/from the cache  
**Use:** Capacity planning and traffic pattern analysis  
**Priority:** MEDIUM

---

## Composite Metrics (Recommended)

### Cache Hit Rate
**Formula:** `(CacheHits / (CacheHits + CacheMisses)) * 100`  
**Target:** > 80%  
**Status:** Not yet implemented - requires composite metric

### Memory Utilization Percentage
**Formula:** `(BytesUsedForCache / MaxMemory) * 100`  
**Target:** < 80%  
**Status:** Not yet implemented - requires MaxMemory calculation

---

## Metric Dimensions

All metrics are published with the following dimension:

**Dimension Name:** `CacheClusterId`  
**Dimension Value:** `{serviceName}-{componentName}[-001]`

Example: `my-service-cache-001`

---

## Metric Publication Frequency

**Standard Metrics:** Published every 60 seconds  
**Detailed Monitoring:** Not available for ElastiCache

---

## Metric Retention

| Metric Age | Data Resolution |
|------------|-----------------|
| < 15 days | 1 minute |
| 15-63 days | 5 minutes |
| 63 days-15 months | 1 hour |

---

## CloudWatch Insights Queries

### Calculate Hit Rate
```
fields @timestamp, CacheHits, CacheMisses
| stats sum(CacheHits) as hits, sum(CacheMisses) as misses by bin(1h)
| fields hits / (hits + misses) * 100 as hit_rate_percent
```

### Identify Peak Usage Times
```
fields @timestamp, CurrConnections
| stats max(CurrConnections) as peak_connections by bin(1h)
| sort @timestamp desc
```

### Memory Pressure Analysis
```
fields @timestamp, Evictions, BytesUsedForCache
| filter Evictions > 0
| sort @timestamp desc
```

---

## Grafana Integration

For Grafana dashboards, use the CloudWatch data source with these queries:

```json
{
  "namespace": "AWS/ElastiCache",
  "metricName": "CPUUtilization",
  "dimensions": {
    "CacheClusterId": "$cluster_id"
  },
  "statistic": "Average",
  "period": 300
}
```

---

## API Access

### AWS CLI
```bash
# Get metric statistics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name CPUUtilization \
  --dimensions Name=CacheClusterId,Value=my-cluster \
  --start-time 2025-10-10T00:00:00Z \
  --end-time 2025-10-10T23:59:59Z \
  --period 300 \
  --statistics Average
```

### AWS SDK (TypeScript)
```typescript
import { CloudWatchClient, GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch";

const client = new CloudWatchClient({ region: "us-west-2" });
const command = new GetMetricStatisticsCommand({
  Namespace: "AWS/ElastiCache",
  MetricName: "CPUUtilization",
  Dimensions: [{ Name: "CacheClusterId", Value: "my-cluster" }],
  StartTime: new Date(Date.now() - 3600000),
  EndTime: new Date(),
  Period: 300,
  Statistics: ["Average"]
});

const response = await client.send(command);
```

---

## Metric Costs

**Standard Monitoring:** Included with ElastiCache (no additional cost)  
**Custom Metrics:** Not applicable (using AWS-provided metrics only)  
**CloudWatch Alarms:** $0.10 per alarm per month  
**Logs Ingestion:** Standard CloudWatch Logs pricing

---

## References

- **AWS Documentation:** [ElastiCache CloudWatch Metrics](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.html)
- **Best Practices:** [Which Metrics to Monitor](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.WhichShouldIMonitor.html)
- **Performance:** [Monitoring and Tuning](https://docs.aws.amazon.com/whitepapers/latest/scale-performance-elasticache/monitoring-and-tuning.html)

---

**For metric configuration questions, contact:** Platform Engineering Team

