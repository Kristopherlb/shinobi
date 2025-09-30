import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Zap, Play, Settings, Clock, CheckCircle, XCircle, Search, Filter, Code, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ToolSummary, ToolParameter } from "@shared/contracts";

interface MCPToolsDiscoveryProps {
  className?: string;
}

interface ToolExecution {
  id: string;
  toolName: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
}

export function MCPToolsDiscovery({ className }: MCPToolsDiscoveryProps) {
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedTool, setSelectedTool] = useState<ToolSummary | null>(null);
  const [toolArguments, setToolArguments] = useState<Record<string, any>>({});
  const [executions, setExecutions] = useState<ToolExecution[]>([]);
  const { toast } = useToast();

  // Mock data - will be replaced with real MCP API calls
  const { data: tools, isLoading } = useQuery({
    queryKey: ['/api/tools'],
    queryFn: async (): Promise<ToolSummary[]> => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return [
        {
          name: "infrastructure-scanner",
          description: "Scans AWS infrastructure and generates component recommendations based on current setup",
          parameters: {
            region: {
              type: "string",
              description: "AWS region to scan",
              required: true,
              enum: ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"]
            },
            serviceType: {
              type: "string", 
              description: "Type of service to focus on",
              required: false,
              enum: ["compute", "storage", "database", "networking", "all"]
            },
            includeTagged: {
              type: "boolean",
              description: "Include resources with existing tags",
              required: false
            }
          }
        },
        {
          name: "component-generator",
          description: "Generates boilerplate infrastructure components with best practices and compliance frameworks",
          parameters: {
            componentType: {
              type: "string",
              description: "Type of component to generate",
              required: true,
              enum: ["api-gateway", "database", "worker", "static-site", "kubernetes-app"]
            },
            complianceFramework: {
              type: "string",
              description: "Compliance framework to follow",
              required: false,
              enum: ["commercial", "fedramp-moderate", "fedramp-high"]
            },
            features: {
              type: "array",
              description: "Additional features to include",
              required: false,
              items: { type: "string" }
            },
            name: {
              type: "string",
              description: "Component name (lowercase, hyphen-separated)",
              required: true
            }
          }
        },
        {
          name: "security-analyzer",
          description: "Analyzes infrastructure configurations for security vulnerabilities and compliance violations",
          parameters: {
            targetService: {
              type: "string",
              description: "Service name to analyze",
              required: true
            },
            checkTypes: {
              type: "array",
              description: "Types of security checks to perform",
              required: false,
              items: { type: "string" }
            },
            severity: {
              type: "string",
              description: "Minimum severity level to report",
              required: false,
              enum: ["low", "medium", "high", "critical"]
            }
          }
        },
        {
          name: "performance-optimizer",
          description: "Analyzes service performance and suggests optimization strategies",
          parameters: {
            serviceName: {
              type: "string",
              description: "Name of the service to optimize",
              required: true
            },
            timeWindow: {
              type: "string",
              description: "Time window for analysis",
              required: false,
              enum: ["1h", "24h", "7d", "30d"]
            },
            optimizationGoals: {
              type: "array",
              description: "Optimization objectives",
              required: false,
              items: { type: "string" }
            }
          }
        },
        {
          name: "cost-analyzer",
          description: "Analyzes infrastructure costs and identifies potential savings opportunities",
          parameters: {
            scope: {
              type: "string",
              description: "Analysis scope",
              required: true,
              enum: ["service", "environment", "organization"]
            },
            timeframe: {
              type: "string",
              description: "Time period for cost analysis",
              required: false,
              enum: ["30d", "90d", "12m"]
            },
            includeRecommendations: {
              type: "boolean",
              description: "Include cost optimization recommendations",
              required: false
            }
          }
        }
      ];
    }
  });

  const executeToolMutation = useMutation({
    mutationFn: async ({ toolName, args }: { toolName: string; args: Record<string, any> }) => {
      // Mock implementation - replace with real MCP API call
      const executionId = `exec-${Date.now()}`;
      const execution: ToolExecution = {
        id: executionId,
        toolName,
        arguments: args,
        status: 'running',
        startedAt: new Date().toISOString()
      };
      
      setExecutions(prev => [execution, ...prev]);
      
      // Simulate execution time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock results based on tool
      let result: any = null;
      let error: string | null = null;
      
      if (toolName === "infrastructure-scanner") {
        result = {
          resourcesFound: 23,
          recommendations: [
            "Migrate EC2 instances to spot instances for 60% cost savings",
            "Enable auto-scaling for API Gateway to handle traffic spikes",
            "Implement CloudFront CDN for static assets"
          ],
          estimatedSavings: "$1,247/month"
        };
      } else if (toolName === "component-generator") {
        result = {
          componentName: args.name,
          files: [
            "terraform/main.tf",
            "kubernetes/deployment.yaml", 
            "docs/README.md",
            "scripts/deploy.sh"
          ],
          dependencies: ["aws-cli", "terraform", "kubectl"],
          instructions: [
            "Review generated Terraform configuration",
            "Update variables.tf with your specific values",
            "Run terraform plan to preview changes",
            "Deploy using terraform apply"
          ]
        };
      } else if (toolName === "security-analyzer") {
        if (Math.random() > 0.8) {
          error = "Service not found or access denied" as string;
        } else {
          result = {
            vulnerabilities: 5,
            critical: 1,
            high: 2,
            medium: 2,
            findings: [
              "Security group allows unrestricted inbound access on port 22",
              "RDS instance does not have backup encryption enabled",
              "S3 bucket has public read access enabled"
            ]
          };
        }
      } else {
        result = {
          status: "completed",
          summary: `${toolName} executed successfully with provided parameters`,
          details: args
        };
      }
      
      // Update execution with result
      setExecutions(prev => prev.map(exec => 
        exec.id === executionId ? {
          ...exec,
          result,
          error,
          status: error ? 'failed' : 'completed',
          completedAt: new Date().toISOString()
        } : exec
      ));
      
      return { executionId, result, error };
    },
    onSuccess: (data) => {
      if (data.error) {
        toast({
          title: "Tool execution failed",
          description: data.error,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Tool executed successfully",
          description: "Check the execution history for detailed results.",
        });
      }
    }
  });

  const getToolIcon = (toolName: string) => {
    if (toolName.includes('generator')) return <Code className="w-4 h-4 text-blue-500" />;
    if (toolName.includes('security')) return <Wrench className="w-4 h-4 text-red-500" />;
    if (toolName.includes('scanner')) return <Search className="w-4 h-4 text-green-500" />;
    return <Zap className="w-4 h-4 text-purple-500" />;
  };

  const getExecutionStatusIcon = (status: string) => {
    switch (status) {
      case "running": return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case "completed": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getToolCategory = (toolName: string) => {
    if (toolName.includes('generator')) return 'generation';
    if (toolName.includes('security')) return 'security';
    if (toolName.includes('scanner')) return 'analysis';
    if (toolName.includes('optimizer')) return 'optimization';
    if (toolName.includes('cost')) return 'cost';
    return 'utility';
  };

  const filteredTools = tools?.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCategory = categoryFilter === "all" || getToolCategory(tool.name) === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  const renderParameterInput = (paramName: string, param: ToolParameter) => {
    const value = toolArguments[paramName] || '';
    
    if (param.enum) {
      return (
        <Select value={value} onValueChange={(newValue) => setToolArguments(prev => ({ ...prev, [paramName]: newValue }))}>
          <SelectTrigger data-testid={`select-param-${paramName}`}>
            <SelectValue placeholder={`Select ${paramName}`} />
          </SelectTrigger>
          <SelectContent>
            {param.enum.map(option => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    if (param.type === 'boolean') {
      return (
        <Select value={value.toString()} onValueChange={(newValue) => setToolArguments(prev => ({ ...prev, [paramName]: newValue === 'true' }))}>
          <SelectTrigger data-testid={`select-param-${paramName}`}>
            <SelectValue placeholder="Select value" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    
    if (param.type === 'array') {
      return (
        <Textarea
          placeholder="Enter values separated by commas"
          value={Array.isArray(value) ? value.join(', ') : value}
          onChange={(e) => setToolArguments(prev => ({ 
            ...prev, 
            [paramName]: e.target.value.split(',').map(v => v.trim()).filter(v => v) 
          }))}
          data-testid={`textarea-param-${paramName}`}
        />
      );
    }
    
    return (
      <Input
        type="text"
        placeholder={param.description}
        value={value}
        onChange={(e) => setToolArguments(prev => ({ ...prev, [paramName]: e.target.value }))}
        data-testid={`input-param-${paramName}`}
      />
    );
  };

  const canExecuteTool = (tool: ToolSummary) => {
    const requiredParams = Object.entries(tool.parameters)
      .filter(([_, param]) => param.required)
      .map(([name]) => name);
    
    return requiredParams.every(param => toolArguments[param]);
  };

  const executeTool = (tool: ToolSummary) => {
    executeToolMutation.mutate({ 
      toolName: tool.name, 
      args: toolArguments 
    });
    setSelectedTool(null);
    setToolArguments({});
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-tools-title">MCP AI Tools</h1>
          <p className="text-muted-foreground" data-testid="text-tools-subtitle">
            Discover and execute AI-powered infrastructure tools and component generators
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {tools?.length || 0} tools available
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9"
            data-testid="input-tools-search"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40" data-testid="select-category-filter">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="generation">Generation</SelectItem>
            <SelectItem value="analysis">Analysis</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="optimization">Optimization</SelectItem>
            <SelectItem value="cost">Cost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tools List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Available Tools</h2>
          
          {isLoading ? (
            <div className="space-y-4" data-testid="loading-tools">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-muted rounded w-1/3 mb-3"></div>
                    <div className="h-4 bg-muted rounded w-full mb-2"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTools.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground" data-testid="text-no-tools">
                No tools found matching your filters
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTools.map((tool) => (
                <Card key={tool.name} className="hover-elevate cursor-pointer" data-testid={`card-tool-${tool.name}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {getToolIcon(tool.name)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold" data-testid={`text-tool-name-${tool.name}`}>
                              {tool.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {getToolCategory(tool.name)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3" data-testid={`text-tool-description-${tool.name}`}>
                            {tool.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Settings className="w-3 h-3" />
                            {Object.keys(tool.parameters).length} parameter{Object.keys(tool.parameters).length !== 1 ? 's' : ''}
                            <span>•</span>
                            {Object.values(tool.parameters).filter(p => p.required).length} required
                          </div>
                        </div>
                      </div>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedTool(tool);
                              setToolArguments({});
                            }}
                            data-testid={`button-execute-${tool.name}`}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Execute
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              {getToolIcon(tool.name)}
                              Execute {tool.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </DialogTitle>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              {tool.description}
                            </p>
                            
                            <div className="space-y-4">
                              <h4 className="font-medium">Parameters</h4>
                              {Object.entries(tool.parameters).map(([paramName, param]) => (
                                <div key={paramName} className="space-y-2">
                                  <Label htmlFor={paramName} className="flex items-center gap-2">
                                    {paramName}
                                    {param.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">{param.description}</p>
                                  {renderParameterInput(paramName, param)}
                                </div>
                              ))}
                            </div>
                            
                            <div className="flex justify-end gap-2">
                              <Button 
                                onClick={() => executeTool(tool)}
                                disabled={!canExecuteTool(tool) || executeToolMutation.isPending}
                                data-testid={`button-confirm-execute-${tool.name}`}
                              >
                                {executeToolMutation.isPending ? (
                                  <>
                                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                                    Executing...
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Execute Tool
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Execution History */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Execution History</h2>
          
          <ScrollArea className="h-[600px]">
            <div className="space-y-3 pr-4">
              {executions.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground" data-testid="text-no-executions">
                    No tool executions yet
                  </CardContent>
                </Card>
              ) : (
                executions.map((execution) => (
                  <Card key={execution.id} className="hover-elevate" data-testid={`card-execution-${execution.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {getExecutionStatusIcon(execution.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate" data-testid={`text-execution-tool-${execution.id}`}>
                              {execution.toolName}
                            </h4>
                            <Badge 
                              variant={execution.status === 'completed' ? 'outline' : 
                                     execution.status === 'failed' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {execution.status}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-muted-foreground mb-2" data-testid={`text-execution-time-${execution.id}`}>
                            {formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}
                          </p>
                          
                          {execution.result && (
                            <div className="bg-muted/50 rounded p-2 text-xs">
                              <pre className="whitespace-pre-wrap overflow-x-auto" data-testid={`text-execution-result-${execution.id}`}>
                                {JSON.stringify(execution.result, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {execution.error && (
                            <div className="bg-destructive/10 text-destructive rounded p-2 text-xs" data-testid={`text-execution-error-${execution.id}`}>
                              {execution.error}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

export default MCPToolsDiscovery;