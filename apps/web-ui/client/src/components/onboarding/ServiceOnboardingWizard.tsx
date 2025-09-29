import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertCircle, ChevronRight, ChevronDown, CheckCircle2, Settings, Shield, Code, FileText, Users, Wand2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Service creation schema following platform standards
const serviceCreationSchema = z.object({
  // Step 1: Basic Information
  serviceName: z.string()
    .min(3, "Service name must be at least 3 characters")
    .max(50, "Service name must be less than 50 characters")
    .regex(/^[a-z0-9-]+$/, "Service name must be lowercase alphanumeric with hyphens"),
  
  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must be less than 500 characters"),
  
  // Step 2: Team & Ownership  
  owner: z.string()
    .min(2, "Owner is required"),
  
  team: z.string()
    .min(2, "Team assignment is required"),
  
  // Step 3: Compliance Framework
  complianceFramework: z.enum(["commercial", "fedramp-moderate", "fedramp-high"], {
    required_error: "Compliance framework selection is required",
  }),
  
  // Step 4: Initial Pattern
  initialPattern: z.string({
    required_error: "Initial pattern selection is required",
  }),
  
  // Advanced Options (Progressive Disclosure)
  environment: z.string().default("development"),
  region: z.string().default("us-east-1"),
  tags: z.record(z.string()).optional(),
});

type ServiceCreationForm = z.infer<typeof serviceCreationSchema>;

const WIZARD_STEPS = [
  { 
    id: "basic", 
    title: "Basic Information", 
    description: "Service name and description",
    icon: FileText 
  },
  { 
    id: "ownership", 
    title: "Team & Ownership", 
    description: "Assign owner and team",
    icon: Users 
  },
  { 
    id: "compliance", 
    title: "Compliance Framework", 
    description: "Security and compliance requirements",
    icon: Shield 
  },
  { 
    id: "pattern", 
    title: "Initial Pattern", 
    description: "Choose starting template",
    icon: Code 
  },
  { 
    id: "review", 
    title: "Review & Create", 
    description: "Confirm and generate service",
    icon: CheckCircle2 
  },
];

const COMPLIANCE_FRAMEWORKS = [
  {
    value: "commercial",
    label: "Commercial",
    description: "Standard security defaults for commercial applications",
    features: ["Encryption at rest", "Basic monitoring", "Standard IAM policies"],
  },
  {
    value: "fedramp-moderate",
    label: "FedRAMP Moderate",
    description: "Enhanced security for moderate-impact government systems",
    features: ["AES-256 encryption", "Enhanced logging", "Strict IAM policies", "Compliance auditing"],
  },
  {
    value: "fedramp-high",
    label: "FedRAMP High",
    description: "Maximum security for high-impact government systems",
    features: ["FIPS 140-2 encryption", "Comprehensive auditing", "Zero-trust IAM", "Real-time monitoring"],
  },
];

const INITIAL_PATTERNS = [
  {
    value: "lambda-api",
    label: "Lambda API",
    description: "RESTful API using AWS Lambda and API Gateway",
    components: ["lambda-api", "api-gateway", "cloudwatch-logs"],
    useCase: "Serverless REST APIs, microservices",
  },
  {
    value: "containerized-service",
    label: "Containerized Service",
    description: "Container-based service using ECS/Fargate",
    components: ["ecs-service", "application-load-balancer", "cloudwatch-logs"],
    useCase: "Long-running services, legacy applications",
  },
  {
    value: "data-processing",
    label: "Data Processing",
    description: "Event-driven data processing pipeline",
    components: ["lambda-worker", "sqs-queue", "s3-bucket", "cloudwatch-logs"],
    useCase: "ETL pipelines, async processing",
  },
  {
    value: "full-stack-web",
    label: "Full Stack Web",
    description: "Complete web application with database",
    components: ["lambda-api", "rds-postgres", "s3-bucket", "cloudfront"],
    useCase: "Web applications, SaaS platforms",
  },
];

interface ServiceOnboardingWizardProps {
  className?: string;
  onComplete?: (serviceData: ServiceCreationForm) => void;
  onCancel?: () => void;
}

export function ServiceOnboardingWizard({ 
  className,
  onComplete,
  onCancel 
}: ServiceOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewManifest, setPreviewManifest] = useState(false);
  const { toast } = useToast();

  const form = useForm<ServiceCreationForm>({
    resolver: zodResolver(serviceCreationSchema),
    defaultValues: {
      serviceName: "",
      description: "",
      owner: "",
      team: "",
      complianceFramework: "commercial",
      initialPattern: "",
      environment: "development",
      region: "us-east-1",
      tags: {},
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceCreationForm) => {
      // Call the platform service creation API (mirrors svc init)
      const response = await apiRequest('POST', '/api/services/create', data);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Service created successfully",
        description: `${result.serviceName} has been scaffolded and is ready for development`,
      });
      onComplete?.(form.getValues());
    },
    onError: (error) => {
      toast({
        title: "Service creation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const nextStep = async () => {
    const canProceedResult = await canProceed();
    if (canProceedResult && currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = async () => {
    // Use react-hook-form validation to check current step fields
    switch (currentStep) {
      case 0: // Basic Info
        const basicValid = await form.trigger(['serviceName', 'description']);
        return basicValid;
      case 1: // Ownership
        const ownershipValid = await form.trigger(['owner', 'team']);
        return ownershipValid;
      case 2: // Compliance
        const complianceValid = await form.trigger(['complianceFramework']);
        return complianceValid;
      case 3: // Pattern
        const patternValid = await form.trigger(['initialPattern']);
        return patternValid;
      case 4: // Review
        const allValid = await form.trigger();
        return allValid;
      default:
        return false;
    }
  };

  const generateManifestPreview = () => {
    const values = form.getValues();
    const selectedPattern = INITIAL_PATTERNS.find(p => p.value === values.initialPattern);
    
    return `# Generated service manifest for ${values.serviceName}
name: ${values.serviceName}
version: 1.0.0
description: ${values.description}
owner: ${values.owner}
team: ${values.team}
complianceFramework: ${values.complianceFramework}
environment: ${values.environment}

components:${selectedPattern?.components.map(comp => `
  ${comp}:
    type: ${comp}
    version: latest`).join('') || ''}

# Compliance and governance
suppressions: []
patches: []

# Generated by Shinobi platform
metadata:
  generated: true
  generator: shinobi-onboarding-wizard
  pattern: ${values.initialPattern}
  compliance: ${values.complianceFramework}`;
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    createServiceMutation.mutate(data);
  });

  const currentStepData = WIZARD_STEPS[currentStep];
  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Wizard Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />
                Service Creation Wizard
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create a new service following platform standards and best practices
              </p>
            </div>
            <Badge variant="outline" data-testid="step-indicator">
              Step {currentStep + 1} of {WIZARD_STEPS.length}
            </Badge>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="w-full" data-testid="progress-bar" />
            <div className="flex justify-between text-xs text-muted-foreground">
              {WIZARD_STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div 
                    key={step.id}
                    className={`flex items-center gap-1 ${
                      index <= currentStep ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="hidden sm:inline">{step.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Wizard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <currentStepData.icon className="w-5 h-5" />
                {currentStepData.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {currentStepData.description}
              </p>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Step 1: Basic Information */}
                  {currentStep === 0 && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="serviceName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="my-awesome-service" 
                                data-testid="input-service-name"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Must be lowercase, alphanumeric with hyphens. This will be used for AWS resource naming.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="A brief description of what this service does..."
                                rows={3}
                                data-testid="input-description"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Provide a clear description of the service purpose and functionality.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Step 2: Team & Ownership */}
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="owner"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Owner</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="john.doe@company.com" 
                                data-testid="input-owner"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Primary contact responsible for this service's lifecycle and maintenance.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="team"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Team</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger data-testid="select-team">
                                  <SelectValue placeholder="Select your team" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="platform-engineering">Platform Engineering</SelectItem>
                                  <SelectItem value="backend-services">Backend Services</SelectItem>
                                  <SelectItem value="frontend-experience">Frontend Experience</SelectItem>
                                  <SelectItem value="data-analytics">Data Analytics</SelectItem>
                                  <SelectItem value="security-compliance">Security & Compliance</SelectItem>
                                  <SelectItem value="devops-infrastructure">DevOps & Infrastructure</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormDescription>
                              Team responsible for development and operations of this service.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Step 3: Compliance Framework */}
                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="complianceFramework"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Compliance Framework</FormLabel>
                            <FormControl>
                              <div className="grid gap-3">
                                {COMPLIANCE_FRAMEWORKS.map((framework) => (
                                  <Card 
                                    key={framework.value}
                                    className={`cursor-pointer transition-colors ${
                                      field.value === framework.value 
                                        ? 'border-primary bg-primary/5' 
                                        : 'hover:border-muted-foreground/50'
                                    }`}
                                    onClick={() => field.onChange(framework.value)}
                                    data-testid={`framework-${framework.value}`}
                                  >
                                    <CardContent className="p-4">
                                      <div className="flex items-start justify-between">
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2">
                                            <Shield className="w-4 h-4" />
                                            <h4 className="font-medium">{framework.label}</h4>
                                          </div>
                                          <p className="text-sm text-muted-foreground">
                                            {framework.description}
                                          </p>
                                          <div className="flex flex-wrap gap-1">
                                            {framework.features.map((feature) => (
                                              <Badge key={feature} variant="secondary" className="text-xs">
                                                {feature}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                        {field.value === framework.value && (
                                          <CheckCircle2 className="w-5 h-5 text-primary" />
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Step 4: Initial Pattern */}
                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="initialPattern"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Initial Pattern</FormLabel>
                            <FormControl>
                              <div className="grid gap-3">
                                {INITIAL_PATTERNS.map((pattern) => (
                                  <Card 
                                    key={pattern.value}
                                    className={`cursor-pointer transition-colors ${
                                      field.value === pattern.value 
                                        ? 'border-primary bg-primary/5' 
                                        : 'hover:border-muted-foreground/50'
                                    }`}
                                    onClick={() => field.onChange(pattern.value)}
                                    data-testid={`pattern-${pattern.value}`}
                                  >
                                    <CardContent className="p-4">
                                      <div className="flex items-start justify-between">
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2">
                                            <Code className="w-4 h-4" />
                                            <h4 className="font-medium">{pattern.label}</h4>
                                          </div>
                                          <p className="text-sm text-muted-foreground">
                                            {pattern.description}
                                          </p>
                                          <div className="space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground">
                                              Components:
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                              {pattern.components.map((component) => (
                                                <Badge key={component} variant="outline" className="text-xs">
                                                  {component}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                          <p className="text-xs text-muted-foreground">
                                            <strong>Use case:</strong> {pattern.useCase}
                                          </p>
                                        </div>
                                        {field.value === pattern.value && (
                                          <CheckCircle2 className="w-5 h-5 text-primary" />
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Step 5: Review & Create */}
                  {currentStep === 4 && (
                    <div className="space-y-4">
                      <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Service Name</Label>
                            <p className="text-sm text-muted-foreground" data-testid="review-service-name">
                              {form.getValues().serviceName}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Team</Label>
                            <p className="text-sm text-muted-foreground" data-testid="review-team">
                              {form.getValues().team}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Owner</Label>
                            <p className="text-sm text-muted-foreground" data-testid="review-owner">
                              {form.getValues().owner}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Compliance Framework</Label>
                            <p className="text-sm text-muted-foreground" data-testid="review-compliance">
                              {COMPLIANCE_FRAMEWORKS.find(f => f.value === form.getValues().complianceFramework)?.label}
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Description</Label>
                          <p className="text-sm text-muted-foreground" data-testid="review-description">
                            {form.getValues().description}
                          </p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Initial Pattern</Label>
                          <p className="text-sm text-muted-foreground" data-testid="review-pattern">
                            {INITIAL_PATTERNS.find(p => p.value === form.getValues().initialPattern)?.label}
                          </p>
                        </div>
                      </div>

                      {/* Advanced Options */}
                      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full justify-start">
                            {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <Settings className="w-4 h-4 ml-1" />
                            Advanced Options
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4 pt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="environment"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Environment</FormLabel>
                                  <FormControl>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <SelectTrigger data-testid="select-environment">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="development">Development</SelectItem>
                                        <SelectItem value="staging">Staging</SelectItem>
                                        <SelectItem value="production">Production</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="region"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>AWS Region</FormLabel>
                                  <FormControl>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <SelectTrigger data-testid="select-region">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                                        <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                                        <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                                        <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Context & Help */}
        <div className="space-y-4">
          {/* Current Step Help */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Step Guide</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {currentStep === 0 && (
                <div className="space-y-2">
                  <p className="font-medium">Service Naming Best Practices:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc ml-4">
                    <li>Use lowercase letters, numbers, and hyphens</li>
                    <li>Be descriptive but concise</li>
                    <li>Follow team naming conventions</li>
                    <li>Examples: user-api, payment-processor, auth-service</li>
                  </ul>
                </div>
              )}
              {currentStep === 1 && (
                <div className="space-y-2">
                  <p className="font-medium">Ownership & Accountability:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc ml-4">
                    <li>Owner is responsible for service lifecycle</li>
                    <li>Team handles day-to-day operations</li>
                    <li>Clear ownership enables faster incident response</li>
                    <li>Owner receives alerts and notifications</li>
                  </ul>
                </div>
              )}
              {currentStep === 2 && (
                <div className="space-y-2">
                  <p className="font-medium">Choosing Compliance Level:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc ml-4">
                    <li>Commercial: Standard business applications</li>
                    <li>FedRAMP Moderate: Government systems (CUI)</li>
                    <li>FedRAMP High: High-impact government systems</li>
                    <li>Higher levels include stricter controls</li>
                  </ul>
                </div>
              )}
              {currentStep === 3 && (
                <div className="space-y-2">
                  <p className="font-medium">Pattern Selection Guide:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc ml-4">
                    <li>Lambda API: Best for stateless APIs</li>
                    <li>Containerized: For existing applications</li>
                    <li>Data Processing: For ETL and batch jobs</li>
                    <li>Full Stack: Complete web applications</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manifest Preview */}
          {currentStep >= 3 && form.getValues().initialPattern && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Manifest Preview</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewManifest(!previewManifest)}
                    data-testid="button-preview-manifest"
                  >
                    <Eye className="w-4 h-4" />
                    {previewManifest ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </CardHeader>
              {previewManifest && (
                <CardContent>
                  <ScrollArea className="h-64 w-full">
                    <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                      {generateManifestPreview()}
                    </pre>
                  </ScrollArea>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Navigation */}
      <Card>
        <CardContent className="flex justify-between items-center py-4">
          <div className="flex gap-2">
            {onCancel && (
              <Button 
                variant="outline" 
                onClick={onCancel}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            )}
            {currentStep > 0 && (
              <Button 
                variant="outline" 
                onClick={prevStep}
                data-testid="button-previous"
              >
                Previous
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {currentStep < WIZARD_STEPS.length - 1 ? (
              <Button 
                onClick={nextStep}
                disabled={!canProceed()}
                data-testid="button-next"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={!canProceed() || createServiceMutation.isPending}
                data-testid="button-create-service"
              >
                {createServiceMutation.isPending ? "Creating..." : "Create Service"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}