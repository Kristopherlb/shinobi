import React, { useState } from 'react';
import { Link, useRoute } from 'wouter';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/Badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle,
  XCircle,
  Tag,
  Download,
  Eye,
  Play,
  Settings,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function ComponentDetail() {
  const [, params] = useRoute('/component/:componentName');
  const componentName = params?.componentName || 's3-cloudfront';
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  // Mock component data based on component ID - in real app this would come from API
  const getComponentData = (id: string) => {
    const components = {
      's3-cloudfront': {
        name: 'S3 + CloudFront CDN',
        version: 'v3.0.1',
        icon: 'https://preview.uxpin.com/external-url',
        description: 'S3 bucket with CloudFront distribution for global content delivery. Includes HTTPS, custom domains, and origin access control.',
        tags: ['storage', 'cdn', 'https', 'global', 'performance'],
        type: 's3-bucket',
        category: 'storage'
      },
      'lambda-api-gateway': {
        name: 'API Gateway + Lambda',
        version: 'v2.1.3',
        icon: 'https://preview.uxpin.com/external-url',
        description: 'Serverless API with Lambda functions, API Gateway integration, and automatic scaling. Includes JWT authentication and request validation.',
        tags: ['serverless', 'api', 'jwt', 'validation', 'cors'],
        type: 'lambda-api',
        category: 'compute'
      },
      'postgres-rds': {
        name: 'PostgreSQL RDS',
        version: 'v1.8.7',
        icon: 'https://preview.uxpin.com/external-url',
        description: 'Managed PostgreSQL database with automated backups, multi-AZ deployment, and encryption at rest. Optimized for production workloads.',
        tags: ['database', 'postgresql', 'managed', 'encryption', 'backup'],
        type: 'rds-postgres',
        category: 'database'
      },
      'sqs-dlq': {
        name: 'SQS Queue with DLQ',
        version: 'v1.4.2',
        icon: 'https://preview.uxpin.com/external-url',
        description: 'SQS queue with dead letter queue, message encryption, and CloudWatch monitoring. Includes automatic retry logic and alarm configuration.',
        tags: ['messaging', 'queue', 'dlq', 'monitoring', 'retry'],
        type: 'sqs-queue',
        category: 'messaging'
      },
      'ecs-fargate': {
        name: 'ECS Fargate Service',
        version: 'v2.3.5',
        icon: 'https://preview.uxpin.com/external-url',
        description: 'Containerized service with ECS Fargate, Application Load Balancer, and auto-scaling. Includes health checks and rolling deployments.',
        tags: ['containers', 'fargate', 'scaling', 'loadbalancer', 'health'],
        type: 'ecs-service',
        category: 'compute'
      }
    };
    return components[id as keyof typeof components] || components['s3-cloudfront'];
  };

  const component = getComponentData(componentName);

  // Common data for all components
  const commonData = {
    triggers: [
      { name: 'objectCreated', description: 'Fires when new objects are uploaded' },
      { name: 'objectRemoved', description: 'Fires when objects are deleted' },
      { name: 'objectRestore', description: 'Fires when objects are restored from archive' }
    ],
    bindableTargets: [
      { name: 'lambda-worker', description: 'Process objects with serverless functions' },
      { name: 'sqs-queue', description: 'Queue messages for batch processing' },
      { name: 'sns-topic', description: 'Fan-out notifications to multiple services' }
    ],
    securityDefaults: [
      { name: 'Encrypted (KMS) by default', status: 'enabled', details: 'AWS managed keys' },
      { name: 'Versioning: Enabled', status: 'enabled', details: 'Automatic object versioning' },
      { name: 'Access logging: Off', status: 'disabled', details: 'Configurable via parameters' },
      { name: 'Tagging required', status: 'required', details: 'platform:component-type, data-classification' }
    ],
    compliance: [
      { framework: 'Commercial', status: 'ready', description: 'Ready for production' },
      { framework: 'FedRAMP Moderate', status: 'ready', description: 'Baseline controls implemented' },
      { framework: 'FedRAMP High', status: 'pending', description: 'Additional logging controls required' }
    ],
    metrics: {
      availability: '99.9%',
      avgResponse: '45ms',
      storageUsed: '1.2TB'
    },
    relatedComponents: [
      { name: 'Lambda Worker', description: 'Serverless compute for processing S3 events', icon: 'https://preview.uxpin.com/external-url' },
      { name: 'SQS Queue', description: 'Reliable message queuing for batch processing', icon: 'https://preview.uxpin.com/external-url' },
      { name: 'Web App', description: 'Frontend applications with S3 static hosting', icon: 'https://preview.uxpin.com/external-url' },
      { name: 'ML Pipeline', description: 'Machine learning workflows with S3 data sources', icon: 'https://preview.uxpin.com/external-url' }
    ],
    configSchema: {
      bucketName: {
        type: "string",
        description: "Name for the S3 bucket"
      },
      encryption: {
        type: "object",
        properties: {
          kmsKeyId: { type: "string" },
          sseAlgorithm: { type: "string", default: "AES256" }
        }
      },
      versioning: {
        type: "boolean",
        default: true
      },
      accessLogging: {
        type: "boolean",
        default: false
      }
    }
  };

  // Merge component data with common data
  const fullComponent = { ...component, ...commonData };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'enabled':
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'disabled':
      case 'pending':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'required':
        return <Tag className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'enabled':
      case 'ready':
        return 'text-green-500';
      case 'disabled':
      case 'pending':
        return 'text-red-500';
      case 'required':
        return 'text-blue-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Components' },
        { label: 'Storage' },
        { label: 'S3 Bucket' }
      ]}
    >
      <div className="min-h-screen bg-background text-foreground">
        {/* Header Section */}
        <div className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/catalog">
                    Components
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/catalog?category=storage">
                    Storage
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    S3 Bucket
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        <div className="flex max-w-7xl mx-auto">
          {/* Main Content */}
          <div className="flex-1 max-w-3xl px-6 py-8 space-y-12">
            {/* Component Header */}
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <img
                    className="w-12 h-12 object-cover rounded-lg"
                    src={fullComponent.icon}
                    alt={`${fullComponent.name} Icon`}
                  />
                  <div>
                    <h1 className="text-4xl font-semibold text-foreground">
                      {fullComponent.name}
                    </h1>
                    <p className="text-muted-foreground text-lg mt-1">
                      {fullComponent.version}
                    </p>
                  </div>
                </div>
                <Button className="ml-8">
                  Add to Manifest
                </Button>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {fullComponent.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button variant="outline">
                  <Play className="w-4 h-4 mr-2" />
                  Try Locally
                </Button>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">
                What This Component Does
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {fullComponent.description}
              </p>
            </div>

            {/* Triggers & Bindings */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground">
                Triggers & Bindings
              </h2>
              <Card>
                <CardHeader>
                  <CardTitle>Event Sources & Targets</CardTitle>
                  <CardDescription>
                    Configure how this component triggers other services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h3 className="font-medium text-foreground mb-3">
                        Trigger Source Events
                      </h3>
                      <div className="space-y-2">
                        {fullComponent.triggers.map((trigger, index) => (
                          <div key={index} className="p-3 border border-border rounded-lg">
                            <div className="font-medium">{trigger.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {trigger.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground mb-3">
                        Bindable Targets
                      </h3>
                      <div className="space-y-2">
                        {fullComponent.bindableTargets.map((target, index) => (
                          <div key={index} className="p-3 border border-border rounded-lg">
                            <div className="font-medium">{target.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {target.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <div className="text-sm font-medium">CDK Construct Reference</div>
                    <code className="text-sm text-muted-foreground">
                      s3n.LambdaDestination, s3n.SqsDestination
                    </code>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Security & Defaults */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground">
                Security & Defaults
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {fullComponent.securityDefaults.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-4 border border-border rounded-lg">
                    {getStatusIcon(item.status)}
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.details}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Config Schema Collapsible */}
              <Collapsible open={open} onOpenChange={setOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full">
                    View Config Schema
                    {open ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <pre className="text-sm text-muted-foreground overflow-x-auto">
                      {JSON.stringify(fullComponent.configSchema, null, 2)}
                    </pre>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Compliance Frameworks */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground">
                Supported Compliance Frameworks
              </h2>
              <div className="space-y-3">
                {fullComponent.compliance.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(item.status)}
                      <span className="font-medium">{item.framework}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {item.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Observability & Monitoring */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground">
                Observability & Monitoring
              </h2>
              <Card>
                <CardHeader>
                  <CardTitle>Built-in Monitoring</CardTitle>
                  <CardDescription>
                    Automatic metrics, logs, and traces
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">
                        {fullComponent.metrics.availability}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Availability
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">
                        {fullComponent.metrics.avgResponse}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg Response
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-500">
                        {fullComponent.metrics.storageUsed}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Storage Used
                      </div>
                    </div>
                  </div>
                  <Separator className="my-6" />
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">Logs</Badge>
                      <span className="text-sm text-muted-foreground">
                        CloudWatch, JSON structured
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">Metrics</Badge>
                      <span className="text-sm text-muted-foreground">
                        CloudWatch custom metrics, OpenTelemetry
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">Traces</Badge>
                      <span className="text-sm text-muted-foreground">
                        X-Ray integration enabled
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Related Components */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground">
                Related Capabilities & Components
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {fullComponent.relatedComponents.map((related, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <img
                          className="w-6 h-6 object-cover rounded"
                          src={related.icon}
                          alt={related.name}
                        />
                        <h3 className="font-medium">{related.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {related.description}
                      </p>
                      <Button variant="outline" size="sm">
                        View Component
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="sticky top-6 w-80 p-6 h-fit">
            {/* Ask the Agent */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src="https://preview.uxpin.com/external-url" alt="Shinobi Sage" />
                    <AvatarFallback>SS</AvatarFallback>
                  </Avatar>
                  <span>Ask the Agent</span>
                </CardTitle>
                <CardDescription>
                  Get help from Shinobi Sage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full text-left h-auto p-3">
                    What triggers can I use here?
                  </Button>
                  <Button variant="outline" size="sm" className="w-full text-left h-auto p-3">
                    Is this FedRAMP high-ready?
                  </Button>
                  <Button variant="outline" size="sm" className="w-full text-left h-auto p-3">
                    Generate a manifest example using this
                  </Button>
                </div>
                <Separator />
                <div className="space-y-3">
                  <Textarea
                    placeholder="Ask me anything about this component..."
                    className="min-h-20"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <Button className="w-full">
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full">
                  Add to Manifest
                </Button>
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Config
                </Button>
                <Button variant="outline" className="w-full">
                  View Examples
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Fixed Navigation */}
        <div className="fixed top-20 left-6 hidden lg:block">
          <Card className="w-48">
            <CardContent className="p-4">
              <nav className="space-y-2 text-sm">
                <a href="#overview" className="block text-primary font-medium">
                  Overview
                </a>
                <a href="#triggers" className="block text-muted-foreground hover:text-foreground">
                  Triggers
                </a>
                <a href="#defaults" className="block text-muted-foreground hover:text-foreground">
                  Defaults
                </a>
                <a href="#compliance" className="block text-muted-foreground hover:text-foreground">
                  Compliance
                </a>
                <a href="#monitoring" className="block text-muted-foreground hover:text-foreground">
                  Monitoring
                </a>
                <a href="#related" className="block text-muted-foreground hover:text-foreground">
                  Related
                </a>
              </nav>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
