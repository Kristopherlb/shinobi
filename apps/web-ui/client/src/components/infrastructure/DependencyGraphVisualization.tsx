import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Network, GitBranch, AlertTriangle, CheckCircle, Filter, Search, Maximize, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DependencyGraph, ServiceNode, DependencyEdge, CriticalPath } from "@shared/contracts";

interface DependencyGraphVisualizationProps {
  className?: string;
}

interface GraphNode {
  id: string;
  label: string;
  status: string;
  criticality: string;
  x: number;
  y: number;
  type: 'service' | 'component';
  metadata?: any;
}

interface GraphEdge {
  source: string;
  target: string;
  strength: string;
  capability: string;
  component: string;
}

export function DependencyGraphVisualization({ className }: DependencyGraphVisualizationProps) {
  const [searchFilter, setSearchFilter] = useState("");
  const [criticalityFilter, setCriticalityFilter] = useState<string>("all");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mock data - will be replaced with real MCP API calls
  const { data: dependencyGraph, isLoading } = useQuery({
    queryKey: ['/api/admin/dependencies'],
    queryFn: async (): Promise<DependencyGraph> => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        services: [
          {
            name: "payment-service",
            owner: "payments-team",
            complianceFramework: "fedramp-moderate",
            environment: "production",
            status: "healthy",
            criticality: "critical",
            components: [
              {
                name: "payment-api",
                type: "api-gateway",
                capabilities: ["http-api", "rate-limiting"],
                bindings: [
                  { target: "payment-db", capability: "database", access: "read-write", type: "outbound" },
                  { target: "notification-service", capability: "messaging", access: "publish", type: "outbound" }
                ]
              },
              {
                name: "payment-processor",
                type: "worker",
                capabilities: ["payment-processing", "refunds"],
                bindings: [
                  { target: "payment-db", capability: "database", access: "read-write", type: "outbound" },
                  { target: "external-payment-gateway", capability: "http-api", access: "call", type: "outbound" }
                ]
              }
            ]
          },
          {
            name: "user-auth-service",
            owner: "auth-team",
            complianceFramework: "commercial",
            environment: "production",
            status: "healthy",
            criticality: "critical",
            components: [
              {
                name: "auth-api",
                type: "api-gateway",
                capabilities: ["oauth2", "jwt"],
                bindings: [
                  { target: "user-db", capability: "database", access: "read-write", type: "outbound" }
                ]
              }
            ]
          },
          {
            name: "notification-service",
            owner: "platform-team",
            complianceFramework: "commercial",
            environment: "production",
            status: "degraded",
            criticality: "medium",
            components: [
              {
                name: "notification-api",
                type: "api-gateway",
                capabilities: ["email", "sms", "push"],
                bindings: [
                  { target: "notification-queue", capability: "messaging", access: "consume", type: "inbound" },
                  { target: "external-email-service", capability: "http-api", access: "call", type: "outbound" }
                ]
              }
            ]
          }
        ],
        edges: [
          {
            source: "payment-service",
            target: "user-auth-service",
            component: "payment-api",
            capability: "authentication",
            access: "verify-token",
            strength: "critical"
          },
          {
            source: "payment-service",
            target: "notification-service",
            component: "payment-api",
            capability: "messaging",
            access: "send-notification",
            strength: "strong"
          }
        ],
        metadata: {
          totalServices: 3,
          totalBindings: 6,
          generatedAt: new Date().toISOString(),
          criticalPaths: [
            {
              path: ["user-auth-service", "payment-service", "notification-service"],
              description: "Critical payment flow requiring authentication and notifications",
              riskLevel: "high",
              impactRadius: 2
            }
          ]
        }
      };
    }
  });

  // Convert dependency graph to renderable nodes and edges
  const { nodes, edges } = (() => {
    if (!dependencyGraph) return { nodes: [], edges: [] };

    const graphNodes: GraphNode[] = [];
    const graphEdges: GraphEdge[] = [];
    
    // Create service nodes
    dependencyGraph.services.forEach((service, index) => {
      const angle = (index / dependencyGraph.services.length) * 2 * Math.PI;
      const radius = 200;
      
      graphNodes.push({
        id: service.name,
        label: service.name,
        status: service.status,
        criticality: service.criticality,
        x: 300 + radius * Math.cos(angle),
        y: 300 + radius * Math.sin(angle),
        type: 'service',
        metadata: service
      });
    });

    // Create edges from dependency graph edges
    dependencyGraph.edges.forEach(edge => {
      graphEdges.push({
        source: edge.source,
        target: edge.target,
        strength: edge.strength,
        capability: edge.capability,
        component: edge.component
      });
    });

    return { nodes: graphNodes, edges: graphEdges };
  })();

  // Filter nodes based on search and criticality
  const filteredNodes = nodes.filter(node => {
    const matchesSearch = node.label.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCriticality = criticalityFilter === "all" || node.criticality === criticalityFilter;
    return matchesSearch && matchesCriticality;
  });

  const filteredEdges = edges.filter(edge => 
    filteredNodes.some(n => n.id === edge.source) && 
    filteredNodes.some(n => n.id === edge.target)
  );

  // Canvas drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || filteredNodes.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // Apply zoom
    ctx.scale(zoomLevel, zoomLevel);

    // Draw edges
    filteredEdges.forEach(edge => {
      const sourceNode = filteredNodes.find(n => n.id === edge.source);
      const targetNode = filteredNodes.find(n => n.id === edge.target);
      
      if (!sourceNode || !targetNode) return;

      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y);
      ctx.lineTo(targetNode.x, targetNode.y);
      
      // Style based on strength
      switch (edge.strength) {
        case 'critical':
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          break;
        case 'strong':
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2;
          break;
        default:
          ctx.strokeStyle = '#6b7280';
          ctx.lineWidth = 1;
      }
      
      ctx.stroke();

      // Draw arrow
      const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
      const arrowLength = 10;
      const arrowX = targetNode.x - arrowLength * Math.cos(angle);
      const arrowY = targetNode.y - arrowLength * Math.sin(angle);
      
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - arrowLength * Math.cos(angle - Math.PI / 6),
        arrowY - arrowLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - arrowLength * Math.cos(angle + Math.PI / 6),
        arrowY - arrowLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    });

    // Draw nodes
    filteredNodes.forEach(node => {
      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, 30, 0, 2 * Math.PI);
      
      // Color based on status and criticality
      let fillColor = '#6b7280';
      if (node.status === 'healthy') fillColor = '#10b981';
      else if (node.status === 'degraded') fillColor = '#f59e0b';
      else if (node.status === 'unhealthy') fillColor = '#ef4444';
      
      ctx.fillStyle = fillColor;
      ctx.fill();
      
      // Border for selected node
      if (selectedNode === node.id) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Node label
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(node.label.split('-')[0], node.x, node.y + 4);
      
      // Criticality indicator
      if (node.criticality === 'critical') {
        ctx.beginPath();
        ctx.arc(node.x + 20, node.y - 20, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
      }
    });

    ctx.restore();
  }, [filteredNodes, filteredEdges, selectedNode, zoomLevel]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoomLevel;
    const y = (event.clientY - rect.top) / zoomLevel;

    // Find clicked node
    const clickedNode = filteredNodes.find(node => {
      const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
      return distance <= 30;
    });

    setSelectedNode(clickedNode ? clickedNode.id : null);
  };

  const selectedNodeData = selectedNode ? filteredNodes.find(n => n.id === selectedNode) : null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "degraded": return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "unhealthy": return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCriticalityBadgeVariant = (criticality: string) => {
    switch (criticality) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "critical": return "text-red-500";
      case "strong": return "text-orange-500";
      case "weak": return "text-gray-500";
      default: return "text-gray-500";
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-dependency-title">Service Dependency Graph</h1>
          <p className="text-muted-foreground" data-testid="text-dependency-subtitle">
            Visualize service dependencies and critical paths across {dependencyGraph?.metadata.totalServices || 0} services
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} data-testid="button-zoom-out">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZoomLevel(z => Math.min(2, z + 0.1))} data-testid="button-zoom-in">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZoomLevel(1)} data-testid="button-reset-zoom">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9"
            data-testid="input-dependency-search"
          />
        </div>
        
        <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
          <SelectTrigger className="w-40" data-testid="select-criticality-filter">
            <SelectValue placeholder="Criticality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Criticality</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph Visualization */}
        <div className="lg:col-span-2">
          <Card className="h-[600px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Dependency Graph
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div ref={containerRef} className="relative w-full h-[520px] overflow-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full" data-testid="loading-graph">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={520}
                    className="cursor-pointer"
                    onClick={handleCanvasClick}
                    data-testid="dependency-canvas"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Selected Node Details */}
          {selectedNodeData ? (
            <Card data-testid="card-selected-node">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {getStatusIcon(selectedNodeData.status)}
                  {selectedNodeData.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge variant={selectedNodeData.status === "healthy" ? "outline" : "destructive"}>
                      {selectedNodeData.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Criticality</p>
                    <Badge variant={getCriticalityBadgeVariant(selectedNodeData.criticality)}>
                      {selectedNodeData.criticality}
                    </Badge>
                  </div>
                </div>
                
                {selectedNodeData.metadata && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Details</p>
                    <div className="space-y-1 text-sm">
                      <div>Owner: {selectedNodeData.metadata.owner}</div>
                      <div>Environment: {selectedNodeData.metadata.environment}</div>
                      <div>Framework: {selectedNodeData.metadata.complianceFramework}</div>
                      <div>Components: {selectedNodeData.metadata.components?.length || 0}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card data-testid="card-no-selection">
              <CardContent className="p-6 text-center text-muted-foreground">
                Click on a service node to view details
              </CardContent>
            </Card>
          )}

          {/* Graph Statistics */}
          <Card data-testid="card-graph-stats">
            <CardHeader>
              <CardTitle className="text-base">Graph Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Services</span>
                <span className="text-sm font-medium">{dependencyGraph?.metadata.totalServices || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Dependencies</span>
                <span className="text-sm font-medium">{dependencyGraph?.metadata.totalBindings || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Critical Paths</span>
                <span className="text-sm font-medium">{dependencyGraph?.metadata.criticalPaths.length || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Critical Paths */}
          {dependencyGraph && dependencyGraph.metadata.criticalPaths.length > 0 && (
            <Card data-testid="card-critical-paths">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Critical Paths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  <div className="space-y-3">
                    {dependencyGraph.metadata.criticalPaths.map((path, index) => (
                      <div key={index} className="p-3 border rounded-lg" data-testid={`card-critical-path-${index}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={path.riskLevel === "high" ? "destructive" : "secondary"} className="text-xs">
                            {path.riskLevel} risk
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Impact: {path.impactRadius} services
                          </span>
                        </div>
                        <p className="text-sm mb-2">{path.description}</p>
                        <div className="text-xs text-muted-foreground">
                          {path.path.join(' → ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dependency List */}
      <Card data-testid="card-dependency-list">
        <CardHeader>
          <CardTitle>Service Dependencies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredEdges.map((edge, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover-elevate" data-testid={`card-dependency-${index}`}>
                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    <span className="font-medium">{edge.source}</span>
                    <span className="text-muted-foreground mx-2">→</span>
                    <span className="font-medium">{edge.target}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {edge.capability}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${getStrengthColor(edge.strength)}`}>
                    {edge.strength}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {edge.component}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DependencyGraphVisualization;