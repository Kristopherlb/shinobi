import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Code, Wand2, FileText, Download, Copy, Check, Settings, Shield, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ComponentGenerationRequest, ComponentGenerationResult, GeneratedFile } from "@shared/contracts";

interface ComponentGeneratorProps {
  className?: string;
}

export function ComponentGenerator({ className }: ComponentGeneratorProps) {
  const [request, setRequest] = useState<Partial<ComponentGenerationRequest>>({
    componentName: "",
    componentType: "",
    description: "",
    awsService: "",
    capabilities: [],
    bindings: [],
    triggers: [],
    complianceFramework: "commercial",
    templateOptions: {
      includeTests: true,
      includeDocumentation: true,
      includeBinders: true,
      includeCreator: false
    }
  });
  
  const [generationResult, setGenerationResult] = useState<ComponentGenerationResult | null>(null);
  const [copiedFiles, setCopiedFiles] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const generateComponentMutation = useMutation({
    mutationFn: async (req: ComponentGenerationRequest): Promise<ComponentGenerationResult> => {
      // Call the actual Shinobi platform component generation service via shared HTTP abstraction
      const response = await apiRequest('POST', '/api/mcp/generate-component', req);
      return response.json();
    },
    onSuccess: (result) => {
      setGenerationResult(result);
      toast({
        title: "Component generated successfully",
        description: `Generated ${result.files.length} files for ${result.componentName}`,
      });
    }
  });

  const handleGenerate = () => {
    if (!request.componentName || !request.componentType || !request.description || !request.awsService) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    generateComponentMutation.mutate(request as ComponentGenerationRequest);
  };

  const copyToClipboard = async (content: string, filePath: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFiles(prev => new Set(prev).add(filePath));
      setTimeout(() => {
        setCopiedFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(filePath);
          return newSet;
        });
      }, 2000);
      toast({
        title: "Copied to clipboard",
        description: `Content of ${filePath} copied`,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy content to clipboard",
        variant: "destructive"
      });
    }
  };

  const downloadFiles = () => {
    if (!generationResult) return;
    
    // Create a simple text representation for download
    const content = generationResult.files.map(file => 
      `=== ${file.path} ===\n${file.content}\n\n`
    ).join('');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generationResult.componentName}-generated-files.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Files downloaded",
      description: "Generated component files have been downloaded",
    });
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "terraform": return <Settings className="w-4 h-4 text-purple-500" />;
      case "yaml": return <Layers className="w-4 h-4 text-blue-500" />;
      case "markdown": return <FileText className="w-4 h-4 text-green-500" />;
      case "python": return <Code className="w-4 h-4 text-yellow-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-generator-title">AI Component Generator</h1>
          <p className="text-muted-foreground" data-testid="text-generator-subtitle">
            Generate production-ready infrastructure components with AI-powered scaffolding
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Wand2 className="w-3 h-3" />
          AI Powered
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Component Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="componentName">Component Name *</Label>
                <Input
                  id="componentName"
                  placeholder="e.g., payment-processor"
                  value={request.componentName}
                  onChange={(e) => setRequest(prev => ({ ...prev, componentName: e.target.value }))}
                  data-testid="input-component-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="componentType">Component Type *</Label>
                <Select value={request.componentType} onValueChange={(value) => setRequest(prev => ({ ...prev, componentType: value }))}>
                  <SelectTrigger data-testid="select-component-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api-gateway">API Gateway</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="worker">Worker Service</SelectItem>
                    <SelectItem value="static-site">Static Site</SelectItem>
                    <SelectItem value="kubernetes-app">Kubernetes App</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what this component does..."
                value={request.description}
                onChange={(e) => setRequest(prev => ({ ...prev, description: e.target.value }))}
                data-testid="textarea-description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="awsService">AWS Service *</Label>
                <Input
                  id="awsService"
                  placeholder="e.g., lambda, ecs, rds"
                  value={request.awsService}
                  onChange={(e) => setRequest(prev => ({ ...prev, awsService: e.target.value }))}
                  data-testid="input-aws-service"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="complianceFramework">Compliance Framework</Label>
                <Select value={request.complianceFramework} onValueChange={(value) => setRequest(prev => ({ ...prev, complianceFramework: value as any }))}>
                  <SelectTrigger data-testid="select-compliance">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="fedramp-moderate">FedRAMP Moderate</SelectItem>
                    <SelectItem value="fedramp-high">FedRAMP High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Capabilities</Label>
              <Input
                placeholder="Enter capabilities separated by commas"
                value={request.capabilities?.join(', ') || ''}
                onChange={(e) => setRequest(prev => ({ 
                  ...prev, 
                  capabilities: e.target.value.split(',').map(v => v.trim()).filter(v => v) 
                }))}
                data-testid="input-capabilities"
              />
            </div>

            <div className="space-y-3">
              <Label>Template Options</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeTests"
                    checked={request.templateOptions?.includeTests}
                    onCheckedChange={(checked) => setRequest(prev => ({
                      ...prev,
                      templateOptions: { ...prev.templateOptions, includeTests: !!checked }
                    }))}
                    data-testid="checkbox-include-tests"
                  />
                  <Label htmlFor="includeTests" className="text-sm">Include Tests</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeDocumentation"
                    checked={request.templateOptions?.includeDocumentation}
                    onCheckedChange={(checked) => setRequest(prev => ({
                      ...prev,
                      templateOptions: { ...prev.templateOptions, includeDocumentation: !!checked }
                    }))}
                    data-testid="checkbox-include-docs"
                  />
                  <Label htmlFor="includeDocumentation" className="text-sm">Include Documentation</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeBinders"
                    checked={request.templateOptions?.includeBinders}
                    onCheckedChange={(checked) => setRequest(prev => ({
                      ...prev,
                      templateOptions: { ...prev.templateOptions, includeBinders: !!checked }
                    }))}
                    data-testid="checkbox-include-binders"
                  />
                  <Label htmlFor="includeBinders" className="text-sm">Include Binders</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeCreator"
                    checked={request.templateOptions?.includeCreator}
                    onCheckedChange={(checked) => setRequest(prev => ({
                      ...prev,
                      templateOptions: { ...prev.templateOptions, includeCreator: !!checked }
                    }))}
                    data-testid="checkbox-include-creator"
                  />
                  <Label htmlFor="includeCreator" className="text-sm">Include Creator Tools</Label>
                </div>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generateComponentMutation.isPending}
              className="w-full"
              data-testid="button-generate-component"
            >
              {generateComponentMutation.isPending ? (
                <>
                  <Wand2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Component
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Generated Files
              </CardTitle>
              {generationResult && (
                <Button variant="outline" size="sm" onClick={downloadFiles} data-testid="button-download-files">
                  <Download className="w-4 h-4 mr-2" />
                  Download All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!generationResult ? (
              <div className="text-center text-muted-foreground py-12" data-testid="text-no-results">
                Configure your component and click Generate to see the results
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-medium mb-2" data-testid="text-generation-summary">Generation Summary</h3>
                  <p className="text-sm text-muted-foreground mb-3">{generationResult.summary}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{generationResult.files.length} files</Badge>
                    <Badge variant="outline">{generationResult.dependencies.length} dependencies</Badge>
                    <Badge variant="outline">{generationResult.instructions.length} steps</Badge>
                  </div>
                </div>

                {/* Files */}
                <Tabs defaultValue="files">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="files">Files</TabsTrigger>
                    <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
                    <TabsTrigger value="instructions">Instructions</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="files">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {generationResult.files.map((file, index) => (
                          <Card key={index} className="hover-elevate" data-testid={`card-file-${index}`}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {getFileIcon(file.type)}
                                  <span className="font-mono text-sm" data-testid={`text-file-path-${index}`}>{file.path}</span>
                                  <Badge variant="outline" className="text-xs">{file.type}</Badge>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(file.content, file.path)}
                                  data-testid={`button-copy-file-${index}`}
                                >
                                  {copiedFiles.has(file.path) ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground mb-3" data-testid={`text-file-description-${index}`}>
                                {file.description}
                              </p>
                              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-32" data-testid={`pre-file-content-${index}`}>
                                {file.content.slice(0, 200)}
                                {file.content.length > 200 && "..."}
                              </pre>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="dependencies">
                    <div className="space-y-2">
                      {generationResult.dependencies.map((dep, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded" data-testid={`text-dependency-${index}`}>
                          <Shield className="w-4 h-4 text-green-500" />
                          <span className="font-mono text-sm">{dep}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="instructions">
                    <div className="space-y-3">
                      {generationResult.instructions.map((instruction, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 border rounded" data-testid={`text-instruction-${index}`}>
                          <Badge variant="outline" className="mt-0.5">{index + 1}</Badge>
                          <span className="text-sm">{instruction}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ComponentGenerator;