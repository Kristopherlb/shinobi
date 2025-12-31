# Binder Strategy System Visual Diagrams

## Architecture Overview

```mermaid
graph TB
    subgraph "Component Synthesis Process"
        A[Service Manifest] --> B[Component Discovery]
        B --> C[Capability Extraction]
        C --> D[Enhanced Binder Registry]
    end

    subgraph "Enhanced Binder Registry"
        D --> E[Strategy Selection]
        D --> F[Compliance Enforcement]
        D --> G[Binding Cache]
        D --> H[Metrics Collection]
    end

    subgraph "Binder Strategies"
        E --> I[DatabaseBinderStrategy]
        E --> J[StorageBinderStrategy]
        E --> K[CacheBinderStrategy]
        E --> L[QueueBinderStrategy]
        E --> M[LambdaBinderStrategy]
        E --> N[ApiGatewayBinderStrategy]
    end

    subgraph "Output Generation"
        I --> O[IAM Policies]
        J --> O
        K --> O
        L --> O
        M --> O
        N --> O
        
        I --> P[Environment Variables]
        J --> P
        K --> P
        L --> P
        M --> P
        N --> P
        
        I --> Q[Security Group Rules]
        K --> Q
        
        F --> R[Compliance Actions]
    end

    subgraph "Performance Optimization"
        G --> S[Cache Hit/Miss]
        H --> T[Performance Metrics]
        H --> U[Benchmark Results]
    end

    style D fill:#e1f5fe
    style F fill:#fff3e0
    style G fill:#f3e5f5
    style H fill:#e8f5e8
```

## Binding Flow Diagram

```mermaid
sequenceDiagram
    participant CM as Component Manifest
    participant BR as Binder Registry
    participant Cache as Binding Cache
    participant CE as Compliance Enforcer
    participant BS as Binder Strategy
    participant MC as Metrics Collector

    CM->>BR: bind(context)
    BR->>MC: recordBindingStart(context)
    
    BR->>Cache: get(context)
    alt Cache Hit
        Cache-->>BR: cachedResult
        BR->>MC: recordCacheHit(context)
        BR->>MC: recordBindingSuccess(context, result, duration)
        BR-->>CM: bindingResult
    else Cache Miss
        Cache-->>BR: null
        BR->>MC: recordCacheMiss(context)
        
        BR->>BR: findStrategy(sourceType, capability)
        BR->>CE: enforceCompliance(context)
        CE->>MC: recordComplianceCheck(context, duration, violations)
        CE-->>BR: complianceResult
        
        alt Compliance Violations
            CE-->>BR: Error
            BR->>MC: recordBindingError(context, error, duration)
            BR-->>CM: Error
        else Compliance Pass
            BR->>BS: bind(context)
            BS-->>BR: bindingResult
            BR->>Cache: set(context, result)
            BR->>MC: recordBindingSuccess(context, result, duration)
            BR-->>CM: bindingResult
        end
    end
```

## Capability Matrix

```mermaid
graph LR
    subgraph "Source Components"
        A[Lambda API]
        B[ECS Service]
        C[EC2 Instance]
        D[Fargate Service]
        E[Step Function]
    end

    subgraph "Target Capabilities"
        F[Database<br/>db:postgres<br/>db:mysql<br/>db:aurora-postgres<br/>db:aurora-mysql]
        G[Storage<br/>storage:s3<br/>storage:s3-bucket<br/>bucket:s3]
        H[Cache<br/>cache:redis<br/>cache:elasticache-redis<br/>cache:memcached]
        I[Queue<br/>queue:sqs<br/>topic:sns<br/>messaging:sqs<br/>messaging:sns]
        J[Lambda<br/>lambda:function<br/>function:lambda<br/>compute:lambda]
        K[API Gateway<br/>api:gateway<br/>gateway:api<br/>http:api<br/>rest:api]
    end

    A --> F
    A --> G
    A --> H
    A --> I
    A --> J
    A --> K
    
    B --> F
    B --> G
    B --> H
    B --> I
    B --> J
    B --> K
    
    C --> F
    C --> G
    C --> H
    C --> I
    C --> J
    C --> K
    
    D --> F
    D --> G
    D --> H
    D --> I
    D --> J
    D --> K
    
    E --> F
    E --> G
    E --> H
    E --> I
    E --> J
    E --> K

    style F fill:#e3f2fd
    style G fill:#e8f5e8
    style H fill:#fff3e0
    style I fill:#f3e5f5
    style J fill:#fce4ec
    style K fill:#e0f2f1
```

## Compliance Framework Enforcement

```mermaid
graph TD
    A[Binding Request] --> B{Compliance Framework?}
    
    B -->|commercial| C[Commercial Rules]
    B -->|fedramp-moderate| D[FedRAMP Moderate Rules]
    B -->|fedramp-high| E[FedRAMP High Rules]
    
    subgraph "Commercial Framework"
        C --> C1[Basic Security Policies]
        C --> C2[Secure Transport]
        C --> C3[Standard Access Control]
        C --> C4[Basic Logging]
    end
    
    subgraph "FedRAMP Moderate Framework"
        D --> D1[Enhanced Monitoring]
        D --> D2[Audit Logging - 90 days]
        D --> D3[Secure Transport]
        D --> D4[Regional Restrictions]
        D --> D5[Error Monitoring]
    end
    
    subgraph "FedRAMP High Framework"
        E --> E1[VPC Endpoint Requirements]
        E --> E2[Network Segmentation]
        E --> E3[Comprehensive Logging - 365 days]
        E --> E4[MFA Requirements]
        E --> E5[Encryption at Rest]
        E --> E6[Security Monitoring]
        E --> E7[Resource-based Policies]
    end
    
    C1 --> F[Compliance Actions]
    C2 --> F
    C3 --> F
    C4 --> F
    D1 --> F
    D2 --> F
    D3 --> F
    D4 --> F
    D5 --> F
    E1 --> F
    E2 --> F
    E3 --> F
    E4 --> F
    E5 --> F
    E6 --> F
    E7 --> F
    
    F --> G[Binding Result]
    
    style C fill:#e8f5e8
    style D fill:#fff3e0
    style E fill:#ffebee
    style F fill:#e1f5fe
```

## Database Binding Strategy

```mermaid
graph TB
    subgraph "Database Binding Process"
        A[Lambda API] --> B[DatabaseBinderStrategy]
        B --> C[Generate Environment Variables]
        B --> D[Create IAM Policies]
        B --> E[Create Security Group Rules]
        B --> F[Apply Compliance Restrictions]
    end

    subgraph "Environment Variables"
        C --> C1[DB_HOST]
        C --> C2[DB_PORT]
        C --> C3[DB_NAME]
        C --> C4[DB_SECRET_ARN]
        C --> C5[DB_CONNECTION_STRING]
    end

    subgraph "IAM Policies"
        D --> D1[Database Access Policy<br/>rds-db:connect<br/>rds-db:select<br/>rds-db:insert<br/>rds-db:update<br/>rds-db:delete]
        D --> D2[Secrets Manager Policy<br/>secretsmanager:GetSecretValue<br/>secretsmanager:DescribeSecret]
        D --> D3[RDS Metadata Policy<br/>rds:DescribeDBInstances<br/>rds:DescribeDBClusters]
    end

    subgraph "Security Group Rules"
        E --> E1[Ingress Rule<br/>Source: Lambda Security Group<br/>Port: 5432<br/>Protocol: TCP]
    end

    subgraph "Compliance Actions"
        F --> F1[Encryption in Transit]
        F --> F2[Regional Restrictions]
        F --> F3[Audit Logging]
        F --> F4[VPC Endpoint Requirements]
    end

    style B fill:#e3f2fd
    style D1 fill:#e8f5e8
    style E1 fill:#fff3e0
    style F4 fill:#ffebee
```

## Storage Binding Strategy

```mermaid
graph TB
    subgraph "Storage Binding Process"
        A[Lambda API] --> B[StorageBinderStrategy]
        B --> C[Generate Environment Variables]
        B --> D[Create S3 IAM Policies]
        B --> E[Apply Compliance Restrictions]
    end

    subgraph "Environment Variables"
        C --> C1[BUCKET_NAME]
        C --> C2[BUCKET_ARN]
        C --> C3[BUCKET_REGION]
        C --> C4[BUCKET_ENDPOINT]
        C --> C5[S3_URL]
    end

    subgraph "S3 IAM Policies"
        D --> D1[Base S3 Access<br/>s3:GetObject<br/>s3:PutObject<br/>s3:DeleteObject]
        D --> D2[Multipart Upload<br/>s3:AbortMultipartUpload<br/>s3:ListMultipartUploadParts]
        D --> D3[Bucket Metadata<br/>s3:GetBucketLocation<br/>s3:ListBucket]
        D --> D4[KMS Encryption<br/>kms:Decrypt<br/>kms:GenerateDataKey<br/>kms:DescribeKey]
    end

    subgraph "Compliance Actions"
        E --> E1[HTTPS Only Transport]
        E --> E2[Least Privilege Access]
        E --> E3[Resource Scoping]
        E --> E4[VPC Endpoint Requirements]
        E --> E5[Access Logging]
    end

    style B fill:#e8f5e8
    style D1 fill:#e3f2fd
    style E4 fill:#ffebee
```

## Cache Binding Strategy

```mermaid
graph TB
    subgraph "Cache Binding Process"
        A[Lambda API] --> B[CacheBinderStrategy]
        B --> C[Generate Environment Variables]
        B --> D[Create IAM Policies]
        B --> E[Create Security Group Rules]
        B --> F[Apply Compliance Restrictions]
    end

    subgraph "Environment Variables"
        C --> C1[CACHE_HOST]
        C --> C2[CACHE_PORT]
        C --> C3[CACHE_AUTH_TOKEN]
        C --> C4[REDIS_URL]
        C --> C5[CLUSTER_ENDPOINT]
    end

    subgraph "IAM Policies"
        D --> D1[ElastiCache Metadata<br/>elasticache:DescribeCacheClusters<br/>elasticache:DescribeReplicationGroups]
        D --> D2[CloudWatch Monitoring<br/>cloudwatch:GetMetricStatistics<br/>cloudwatch:ListMetrics]
        D --> D3[Secrets Manager Auth<br/>secretsmanager:GetSecretValue<br/>secretsmanager:DescribeSecret]
    end

    subgraph "Security Group Rules"
        E --> E1[Ingress Rule<br/>Source: Lambda Security Group<br/>Port: 6379<br/>Protocol: TCP]
        E --> E2[Egress Rule<br/>Source: Lambda Security Group<br/>Port: 6379<br/>Protocol: TCP]
    end

    subgraph "Compliance Actions"
        F --> F1[Encryption in Transit]
        F --> F2[Cache AUTH Required]
        F --> F3[VPC Endpoint Requirements]
        F --> F4[Network Segmentation]
    end

    style B fill:#fff3e0
    style E1 fill:#e3f2fd
    style F2 fill:#ffebee
```

## Queue Binding Strategy

```mermaid
graph TB
    subgraph "Queue Binding Process"
        A[Lambda API] --> B[QueueBinderStrategy]
        B --> C[Generate Environment Variables]
        B --> D[Create SQS/SNS IAM Policies]
        B --> E[Configure Dead Letter Queue]
        B --> F[Apply Compliance Restrictions]
    end

    subgraph "Environment Variables"
        C --> C1[QUEUE_URL]
        C --> C2[QUEUE_ARN]
        C --> C3[QUEUE_REGION]
        C --> C4[DLQ_URL]
        C --> C5[DLQ_ARN]
    end

    subgraph "SQS IAM Policies"
        D --> D1[SQS Access<br/>sqs:ReceiveMessage<br/>sqs:SendMessage<br/>sqs:DeleteMessage]
        D --> D2[SQS Attributes<br/>sqs:GetQueueAttributes<br/>sqs:ListQueues]
        D --> D3[Dead Letter Queue<br/>sqs:SendMessage<br/>sqs:GetQueueAttributes]
    end

    subgraph "SNS IAM Policies"
        D --> D4[SNS Access<br/>sns:Publish<br/>sns:Subscribe<br/>sns:Unsubscribe]
        D --> D5[SNS Attributes<br/>sns:GetTopicAttributes<br/>sns:ListTopics]
    end

    subgraph "Dead Letter Queue"
        E --> E1[Max Receive Count: 3]
        E --> E2[Visibility Timeout: 30s]
        E --> E3[Error Handling Policy]
    end

    subgraph "Compliance Actions"
        F --> F1[HTTPS Only Transport]
        F --> F2[VPC Endpoint Requirements]
        F --> F3[Access Logging]
        F --> F4[Dead Letter Queue Required]
    end

    style B fill:#f3e5f5
    style E1 fill:#e8f5e8
    style F4 fill:#ffebee
```

## Lambda Binding Strategy

```mermaid
graph TB
    subgraph "Lambda Binding Process"
        A[ECS Service] --> B[LambdaBinderStrategy]
        B --> C[Generate Environment Variables]
        B --> D[Create Lambda IAM Policies]
        B --> E[Apply Compliance Restrictions]
    end

    subgraph "Environment Variables"
        C --> C1[FUNCTION_NAME]
        C --> C2[FUNCTION_ARN]
        C --> C3[FUNCTION_URL]
        C --> C4[FUNCTION_REGION]
        C --> C5[FUNCTION_TIMEOUT]
        C --> C6[FUNCTION_MEMORY_SIZE]
    end

    subgraph "Lambda IAM Policies"
        D --> D1[Lambda Invocation<br/>lambda:InvokeFunction<br/>lambda:InvokeAsync]
        D --> D2[Lambda Configuration<br/>lambda:GetFunction<br/>lambda:GetFunctionConfiguration]
        D --> D3[CloudWatch Logs<br/>logs:CreateLogGroup<br/>logs:CreateLogStream<br/>logs:PutLogEvents]
    end

    subgraph "Compliance Actions"
        E --> E1[Regional Restrictions]
        E --> E2[Execution Logging]
        E --> E3[Function Monitoring]
        E --> E4[VPC Endpoint Requirements]
    end

    style B fill:#fce4ec
    style D1 fill:#e3f2fd
    style E4 fill:#ffebee
```

## API Gateway Binding Strategy

```mermaid
graph TB
    subgraph "API Gateway Binding Process"
        A[Lambda API] --> B[ApiGatewayBinderStrategy]
        B --> C[Generate Environment Variables]
        B --> D[Create API Gateway IAM Policies]
        B --> E[Apply Compliance Restrictions]
    end

    subgraph "Environment Variables"
        C --> C1[API_URL]
        C --> C2[API_ARN]
        C --> C3[API_ID]
        C --> C4[STAGE_NAME]
        C --> C5[BASE_URL]
    end

    subgraph "API Gateway IAM Policies"
        D --> D1[API Gateway Access<br/>apigateway:GET<br/>apigateway:POST<br/>apigateway:PUT<br/>apigateway:DELETE]
        D --> D2[API Execution<br/>execute-api:Invoke<br/>execute-api:ManageConnections]
        D --> D3[CloudWatch Logs<br/>logs:CreateLogGroup<br/>logs:CreateLogStream<br/>logs:PutLogEvents]
    end

    subgraph "Compliance Actions"
        E --> E1[HTTPS Only Transport]
        E --> E2[Regional Restrictions]
        E --> E3[Access Logging]
        E --> E4[VPC Endpoint Requirements]
        E --> E5[API Key Management]
    end

    style B fill:#e0f2f1
    style D2 fill:#e3f2fd
    style E4 fill:#ffebee
```

## Performance Optimization

```mermaid
graph TB
    subgraph "Caching Layer"
        A[Binding Request] --> B{Cache Check}
        B -->|Hit| C[Return Cached Result]
        B -->|Miss| D[Execute Binding]
        D --> E[Cache Result]
    end

    subgraph "Metrics Collection"
        F[Binding Events] --> G[Performance Metrics]
        F --> H[Cache Statistics]
        F --> I[Compliance Metrics]
        F --> J[Error Tracking]
    end

    subgraph "Benchmarking"
        K[Benchmark Config] --> L[Warmup Iterations]
        L --> M[Performance Test]
        M --> N[Results Analysis]
        N --> O[Optimization Recommendations]
    end

    style C fill:#e8f5e8
    style G fill:#e1f5fe
    style O fill:#fff3e0
```

## Error Handling Flow

```mermaid
graph TD
    A[Binding Request] --> B{Validation}
    B -->|Pass| C{Strategy Found?}
    B -->|Fail| D[Validation Error]
    
    C -->|Yes| E{Compliance Check}
    C -->|No| F[Strategy Not Found Error]
    
    E -->|Pass| G[Execute Binding]
    E -->|Fail| H[Compliance Violation Error]
    
    G --> I{Binding Success?}
    I -->|Yes| J[Cache Result]
    I -->|No| K[Binding Error]
    
    J --> L[Return Success]
    K --> M[Record Error]
    D --> M
    F --> M
    H --> M
    
    M --> N[Return Error with Context]
    
    style D fill:#ffebee
    style F fill:#ffebee
    style H fill:#ffebee
    style K fill:#ffebee
    style L fill:#e8f5e8
```

## Integration Points

```mermaid
graph LR
    subgraph "Shinobi Platform"
        A[Service Manifest]
        B[Component Discovery]
        C[Capability Resolution]
    end

    subgraph "Binder Strategy System"
        D[Enhanced Binder Registry]
        E[Binding Strategies]
        F[Compliance Enforcer]
        G[Performance Cache]
        H[Metrics Collector]
    end

    subgraph "AWS Services"
        I[IAM]
        J[CloudWatch]
        K[VPC]
        L[Security Groups]
        M[Secrets Manager]
    end

    subgraph "Output"
        N[Component Configuration]
        O[IAM Policies]
        P[Environment Variables]
        Q[Security Rules]
        R[Monitoring Setup]
    end

    A --> B
    B --> C
    C --> D
    
    D --> E
    D --> F
    D --> G
    D --> H
    
    E --> I
    E --> J
    E --> K
    E --> L
    E --> M
    
    F --> I
    G --> J
    H --> J
    
    I --> O
    J --> R
    K --> Q
    L --> Q
    M --> P
    
    O --> N
    P --> N
    Q --> N
    R --> N

    style D fill:#e1f5fe
    style E fill:#e8f5e8
    style F fill:#fff3e0
    style G fill:#f3e5f5
    style H fill:#e0f2f1
```
