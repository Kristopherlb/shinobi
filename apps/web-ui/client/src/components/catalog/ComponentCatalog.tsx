import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Package, Star, Download, ExternalLink, Filter, Zap, Database, Globe, Server, Shield, Activity, Code, FileText, TestTube } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";

interface ComponentCatalogProps {
  className?: string;
}

interface CDKComponent {
  id: string;
  name: string;
  version: string;
  type: 'lambda-api' | 'sqs-queue' | 'rds-postgres' | 'ecs-service' | 's3-bucket' | 'cloudfront-distribution' | 'vpc-network';
  description: string;
  category: 'compute' | 'storage' | 'networking' | 'database' | 'messaging' | 'security';
  compliance: {
    frameworks: string[];
    certified: boolean;
  };
  popularity: number; // download count
  rating: number; // out of 5
  tags: string[];
  author: string;
  organization: string;
  createdAt: string;
  updatedAt: string;
  files: {
    schema: boolean;
    builder: boolean;
    tests: boolean;
    docs: boolean;
    examples: boolean;
  };
  dependencies: string[];
  cdkVersion: string;
  nodeVersion?: string;
}

interface ComponentTemplate {
  id: string;
  name: string;
  description: string;
  components: string[]; // component IDs
  useCase: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  tags: string[];
}

export function ComponentCatalog({ className }: ComponentCatalogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCompliance, setSelectedCompliance] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("popularity");

  // Fetch available CDK components
  const { data: components, isLoading: componentsLoading } = useQuery({
    queryKey: ['/api/catalog/components', searchQuery, selectedCategory, selectedCompliance, sortBy],
    queryFn: async (): Promise<CDKComponent[]> => {
      await new Promise(resolve => setTimeout(resolve, 900));
      
      const mockComponents: CDKComponent[] = [
        {
          id: "lambda-api-gateway",
          name: "API Gateway + Lambda",
          version: "2.1.3",
          type: "lambda-api",
          description: "Serverless API with Lambda functions, API Gateway integration, and automatic scaling. Includes JWT authentication and request validation.",
          category: "compute",
          compliance: {
            frameworks: ["commercial", "fedramp-moderate", "fedramp-high"],
            certified: true
          },
          popularity: 2847,
          rating: 4.8,
          tags: ["serverless", "api", "jwt", "validation", "cors"],
          author: "Platform Team",
          organization: "Shinobi",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
          files: {
            schema: true,
            builder: true,
            tests: true,
            docs: true,
            examples: true
          },
          dependencies: ["aws-cdk-lib", "@aws-cdk/aws-lambda", "@aws-cdk/aws-apigateway"],
          cdkVersion: "2.100.0",
          nodeVersion: "18.x"
        },
        {
          id: "postgres-rds",
          name: "PostgreSQL RDS",
          version: "1.8.7",
          type: "rds-postgres",
          description: "Managed PostgreSQL database with automated backups, multi-AZ deployment, and encryption at rest. Optimized for production workloads.",
          category: "database",
          compliance: {
            frameworks: ["commercial", "fedramp-moderate", "fedramp-high"],
            certified: true
          },
          popularity: 1923,
          rating: 4.6,
          tags: ["database", "postgresql", "managed", "encryption", "backup"],
          author: "Database Team",
          organization: "Shinobi",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 62).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
          files: {
            schema: true,
            builder: true,
            tests: true,
            docs: true,
            examples: false
          },
          dependencies: ["aws-cdk-lib", "@aws-cdk/aws-rds", "@aws-cdk/aws-ec2"],
          cdkVersion: "2.95.0"
        },
        {
          id: "sqs-dlq",
          name: "SQS Queue with DLQ",
          version: "1.4.2", 
          type: "sqs-queue",
          description: "SQS queue with dead letter queue, message encryption, and CloudWatch monitoring. Includes automatic retry logic and alarm configuration.",
          category: "messaging",
          compliance: {
            frameworks: ["commercial", "fedramp-moderate"],
            certified: false
          },
          popularity: 1456,
          rating: 4.4,
          tags: ["messaging", "queue", "dlq", "monitoring", "retry"],
          author: "Infrastructure Team",
          organization: "Shinobi",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 29).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
          files: {
            schema: true,
            builder: true,
            tests: true,
            docs: true,
            examples: true
          },
          dependencies: ["aws-cdk-lib", "@aws-cdk/aws-sqs", "@aws-cdk/aws-cloudwatch"],
          cdkVersion: "2.98.0"
        },
        {
          id: "s3-cloudfront",
          name: "S3 + CloudFront CDN",
          version: "3.0.1",
          type: "s3-bucket",
          description: "S3 bucket with CloudFront distribution for global content delivery. Includes HTTPS, custom domains, and origin access control.",
          category: "storage",
          compliance: {
            frameworks: ["commercial", "fedramp-moderate"],
            certified: true
          },
          popularity: 3124,
          rating: 4.9,
          tags: ["storage", "cdn", "https", "global", "performance"],
          author: "Frontend Team",
          organization: "Shinobi",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
          files: {
            schema: true,
            builder: true,
            tests: false,
            docs: true,
            examples: true
          },
          dependencies: ["aws-cdk-lib", "@aws-cdk/aws-s3", "@aws-cdk/aws-cloudfront"],
          cdkVersion: "2.102.0"
        },
        {
          id: "ecs-fargate",
          name: "ECS Fargate Service",
          version: "2.3.5",
          type: "ecs-service",
          description: "Containerized service with ECS Fargate, Application Load Balancer, and auto-scaling. Includes health checks and rolling deployments.",
          category: "compute",
          compliance: {
            frameworks: ["commercial"],
            certified: false
          },
          popularity: 892,
          rating: 4.2,
          tags: ["containers", "fargate", "scaling", "loadbalancer", "health"],
          author: "Container Team",
          organization: "Shinobi",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 51).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
          files: {
            schema: true,
            builder: true,
            tests: true,
            docs: false,
            examples: false
          },
          dependencies: ["aws-cdk-lib", "@aws-cdk/aws-ecs", "@aws-cdk/aws-elasticloadbalancingv2"],
          cdkVersion: "2.89.0"
        }
      ];
      
      let filtered = mockComponents;
      
      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(comp => 
          comp.name.toLowerCase().includes(query) ||
          comp.description.toLowerCase().includes(query) ||
          comp.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      // Apply category filter
      if (selectedCategory !== "all") {
        filtered = filtered.filter(comp => comp.category === selectedCategory);
      }
      
      // Apply compliance filter
      if (selectedCompliance !== "all") {
        filtered = filtered.filter(comp => 
          comp.compliance.frameworks.includes(selectedCompliance)
        );
      }
      
      // Apply sorting
      switch (sortBy) {
        case 'popularity':
          filtered.sort((a, b) => b.popularity - a.popularity);
          break;
        case 'rating':
          filtered.sort((a, b) => b.rating - a.rating);
          break;
        case 'name':
          filtered.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'updated':
          filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          break;
      }
      
      return filtered;
    }
  });

  // Fetch component templates  
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/catalog/templates'],
    queryFn: async (): Promise<ComponentTemplate[]> => {
      await new Promise(resolve => setTimeout(resolve, 700));
      
      return [
        {
          id: "fullstack-web-app",
          name: "Full-Stack Web Application",
          description: "Complete web application stack with API Gateway, Lambda functions, RDS database, and S3 for static assets.",
          components: ["lambda-api-gateway", "postgres-rds", "s3-cloudfront"],
          useCase: "Modern web applications requiring serverless backend with persistent storage",
          difficulty: "intermediate",
          estimatedTime: "30-45 minutes",
          tags: ["fullstack", "serverless", "database", "cdn"]
        },
        {
          id: "microservice-api",
          name: "Microservice API",
          description: "Containerized microservice with load balancer, message queue, and monitoring setup.",
          components: ["ecs-fargate", "sqs-dlq"],
          useCase: "Scalable microservices that need asynchronous processing",
          difficulty: "advanced",
          estimatedTime: "45-60 minutes",
          tags: ["microservices", "containers", "messaging", "scaling"]
        },
        {
          id: "simple-api",
          name: "Simple REST API",
          description: "Basic serverless API for simple applications with authentication and validation.",
          components: ["lambda-api-gateway"],
          useCase: "Simple APIs, prototypes, or backend services for mobile apps",
          difficulty: "beginner",
          estimatedTime: "15-20 minutes",
          tags: ["api", "serverless", "simple", "auth"]
        }
      ];
    }
  });

  const getComponentTypeIcon = (type: string) => {
    switch (type) {
      case 'lambda-api': return <Zap className="w-5 h-5 text-orange-500" />;
      case 'sqs-queue': return <Activity className="w-5 h-5 text-blue-500" />;
      case 'rds-postgres': return <Database className="w-5 h-5 text-green-500" />;
      case 'ecs-service': return <Server className="w-5 h-5 text-purple-500" />;
      case 's3-bucket': return <Globe className="w-5 h-5 text-red-500" />;
      default: return <Package className="w-5 h-5 text-gray-500" />;
    }
  };

  const getCategoryBadgeVariant = (category: string) => {
    switch (category) {
      case 'compute': return 'default';
      case 'storage': return 'secondary';
      case 'networking': return 'outline';
      case 'database': return 'default';
      case 'messaging': return 'secondary';
      case 'security': return 'outline';
      default: return 'outline';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600';
      case 'intermediate': return 'text-yellow-600';
      case 'advanced': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`w-3 h-3 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">{rating}</span>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className={`space-y-6 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-catalog-title">Component Catalog</h1>
            <p className="text-muted-foreground" data-testid="text-catalog-subtitle">
              Discover and deploy pre-built CDK components with Shinobi compliance and best practices
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search components, tags, or descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-components"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-36" data-testid="select-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="compute">Compute</SelectItem>
              <SelectItem value="storage">Storage</SelectItem>
              <SelectItem value="networking">Networking</SelectItem>
              <SelectItem value="database">Database</SelectItem>
              <SelectItem value="messaging">Messaging</SelectItem>
              <SelectItem value="security">Security</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedCompliance} onValueChange={setSelectedCompliance}>
            <SelectTrigger className="w-40" data-testid="select-compliance">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Compliance</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
              <SelectItem value="fedramp-moderate">FedRAMP Moderate</SelectItem>
              <SelectItem value="fedramp-high">FedRAMP High</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-28" data-testid="select-sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularity">Popular</SelectItem>
              <SelectItem value="rating">Top Rated</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="updated">Recently Updated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="components" className="space-y-4">
          <TabsList>
            <TabsTrigger value="components" data-testid="tab-components">
              Components {components && <Badge variant="outline" className="ml-2">{components.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="templates" data-testid="tab-templates">
              Templates {templates && <Badge variant="outline" className="ml-2">{templates.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="components" className="space-y-4">
            {componentsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="loading-components">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-muted rounded w-2/3 mb-3"></div>
                      <div className="h-4 bg-muted rounded w-full mb-2"></div>
                      <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                      <div className="flex gap-2 mb-3">
                        <div className="h-6 bg-muted rounded w-16"></div>
                        <div className="h-6 bg-muted rounded w-12"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : components?.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground" data-testid="text-no-components">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold text-lg mb-2">No Components Found</h3>
                  <p>Try adjusting your search or filter criteria.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {components?.map((component) => (
                  <Card key={component.id} className="hover-elevate h-full" data-testid={`card-component-${component.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getComponentTypeIcon(component.type)}
                          <div>
                            <CardTitle className="text-lg" data-testid={`component-name-${component.id}`}>
                              {component.name}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={getCategoryBadgeVariant(component.category)} className="text-xs">
                                {component.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground" data-testid={`component-version-${component.id}`}>
                                v{component.version}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {component.compliance.certified && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Shield className="w-4 h-4 text-green-500" />
                            </TooltipTrigger>
                            <TooltipContent>Compliance Certified</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground" data-testid={`component-description-${component.id}`}>
                        {component.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        {renderStars(component.rating)}
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Download className="w-3 h-3" />
                          <span data-testid={`component-downloads-${component.id}`}>
                            {component.popularity.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {component.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs" data-testid={`component-tag-${component.id}-${tag}`}>
                            {tag}
                          </Badge>
                        ))}
                        {component.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{component.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-5 gap-1 text-xs">
                        <Tooltip>
                          <TooltipTrigger>
                            <div className={`flex items-center justify-center h-6 rounded ${component.files.schema ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                              <FileText className="w-3 h-3" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Schema</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger>
                            <div className={`flex items-center justify-center h-6 rounded ${component.files.builder ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                              <Code className="w-3 h-3" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Builder</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger>
                            <div className={`flex items-center justify-center h-6 rounded ${component.files.tests ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                              <TestTube className="w-3 h-3" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Tests</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger>
                            <div className={`flex items-center justify-center h-6 rounded ${component.files.docs ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                              <FileText className="w-3 h-3" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Documentation</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger>
                            <div className={`flex items-center justify-center h-6 rounded ${component.files.examples ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                              <ExternalLink className="w-3 h-3" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Examples</TooltipContent>
                        </Tooltip>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span data-testid={`component-author-${component.id}`}>
                          by {component.author}
                        </span>
                        <span data-testid={`component-updated-${component.id}`}>
                          {formatDistanceToNow(new Date(component.updatedAt), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="flex-1" data-testid={`button-use-${component.id}`}>
                          Use Component
                        </Button>
                        <Button variant="outline" size="sm" data-testid={`button-view-${component.id}`}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            {templatesLoading ? (
              <div className="space-y-4" data-testid="loading-templates">
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
            ) : (
              <div className="space-y-4">
                {templates?.map((template) => (
                  <Card key={template.id} className="hover-elevate" data-testid={`card-template-${template.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2" data-testid={`template-name-${template.id}`}>
                            {template.name}
                          </h3>
                          <p className="text-muted-foreground mb-3" data-testid={`template-description-${template.id}`}>
                            {template.description}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`template-usecase-${template.id}`}>
                            <strong>Use case:</strong> {template.useCase}
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <Badge 
                            variant="outline" 
                            className={getDifficultyColor(template.difficulty)}
                            data-testid={`template-difficulty-${template.id}`}
                          >
                            {template.difficulty}
                          </Badge>
                          <span className="text-xs text-muted-foreground" data-testid={`template-time-${template.id}`}>
                            {template.estimatedTime}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {template.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs" data-testid={`template-tag-${template.id}-${tag}`}>
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" data-testid={`button-preview-${template.id}`}>
                            Preview
                          </Button>
                          <Button size="sm" data-testid={`button-deploy-${template.id}`}>
                            Deploy Template
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Included Components:</p>
                        <div className="flex gap-2">
                          {template.components.map((componentId) => {
                            const component = components?.find(c => c.id === componentId);
                            return component ? (
                              <div key={componentId} className="flex items-center gap-1 text-xs bg-muted rounded px-2 py-1" data-testid={`template-component-${template.id}-${componentId}`}>
                                {getComponentTypeIcon(component.type)}
                                <span>{component.name}</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

export default ComponentCatalog;