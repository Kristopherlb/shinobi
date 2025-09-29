import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Settings, Lock, Globe, Eye, MoreHorizontal, UserPlus, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { WorkspaceInfo, TeamMember } from "@shared/contracts";

interface TeamWorkspacesProps {
  className?: string;
}

interface WorkspaceCreateRequest {
  name: string;
  description?: string;
  visibility: 'private' | 'team' | 'organization';
}

export function TeamWorkspaces({ className }: TeamWorkspacesProps) {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState<WorkspaceCreateRequest>({
    name: "",
    description: "",
    visibility: "team"
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data - will be replaced with real collaboration service API calls
  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['/api/collaboration/workspaces'],
    queryFn: async (): Promise<WorkspaceInfo[]> => {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return [
        {
          id: "ws-1",
          name: "Platform Engineering",
          description: "Core infrastructure and platform development",
          owner: "user-4",
          visibility: "team",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          members: [
            {
              id: "user-1",
              name: "Sarah Chen",
              email: "sarah.chen@company.com",
              avatar: undefined,
              role: "Senior DevOps Engineer",
              team: "Platform Engineering",
              permissions: ["read", "write", "admin"]
            },
            {
              id: "user-2",
              name: "Marcus Rodriguez",
              email: "marcus.rodriguez@company.com", 
              avatar: undefined,
              role: "Staff Infrastructure Engineer",
              team: "Platform Engineering",
              permissions: ["read", "write", "admin"]
            },
            {
              id: "user-4",
              name: "David Kim",
              email: "david.kim@company.com",
              avatar: undefined,
              role: "Platform Lead",
              team: "Platform Engineering",
              permissions: ["read", "write", "admin", "owner"]
            }
          ]
        },
        {
          id: "ws-2",
          name: "Security & Compliance",
          description: "Security reviews, compliance audits, and incident response",
          owner: "user-3",
          visibility: "organization",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
          members: [
            {
              id: "user-3",
              name: "Emily Watson",
              email: "emily.watson@company.com",
              avatar: undefined,
              role: "Cloud Security Architect",
              team: "Security",
              permissions: ["read", "write", "admin", "owner"]
            },
            {
              id: "user-6",
              name: "Alex Thompson", 
              email: "alex.thompson@company.com",
              avatar: undefined,
              role: "DevSecOps Engineer",
              team: "Security",
              permissions: ["read", "write"]
            }
          ]
        },
        {
          id: "ws-3",
          name: "Infrastructure Operations",
          description: "Day-to-day infrastructure operations and monitoring",
          owner: "user-5",
          visibility: "team",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          members: [
            {
              id: "user-5",
              name: "Lisa Zhang",
              email: "lisa.zhang@company.com",
              avatar: undefined,
              role: "Site Reliability Engineer",
              team: "Infrastructure",
              permissions: ["read", "write", "admin", "owner"]
            },
            {
              id: "user-1",
              name: "Sarah Chen",
              email: "sarah.chen@company.com",
              avatar: undefined,
              role: "Senior DevOps Engineer", 
              team: "Platform Engineering",
              permissions: ["read", "write"]
            }
          ]
        }
      ];
    }
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: async (workspace: WorkspaceCreateRequest): Promise<WorkspaceInfo> => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newWorkspaceData: WorkspaceInfo = {
        id: `ws-${Date.now()}`,
        name: workspace.name,
        description: workspace.description,
        owner: "current-user", // Would be actual current user ID
        visibility: workspace.visibility,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        members: [
          {
            id: "current-user",
            name: "Current User",
            email: "current.user@company.com",
            avatar: undefined,
            role: "Owner",
            team: "Platform",
            permissions: ["read", "write", "admin", "owner"]
          }
        ]
      };
      
      return newWorkspaceData;
    },
    onSuccess: (newWorkspace) => {
      queryClient.invalidateQueries({ queryKey: ['/api/collaboration/workspaces'] });
      setShowCreateDialog(false);
      setNewWorkspace({ name: "", description: "", visibility: "team" });
      toast({
        title: "Workspace created",
        description: `${newWorkspace.name} workspace has been created successfully.`,
      });
    }
  });

  const handleCreateWorkspace = () => {
    if (!newWorkspace.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a workspace name.",
        variant: "destructive"
      });
      return;
    }
    
    createWorkspaceMutation.mutate(newWorkspace);
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'private': return <Lock className="w-4 h-4 text-gray-500" />;
      case 'team': return <Users className="w-4 h-4 text-blue-500" />;
      case 'organization': return <Globe className="w-4 h-4 text-green-500" />;
      default: return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const getVisibilityBadgeVariant = (visibility: string) => {
    switch (visibility) {
      case 'private': return 'outline';
      case 'team': return 'default';
      case 'organization': return 'secondary';
      default: return 'outline';
    }
  };

  const selectedWorkspaceData = selectedWorkspace ? 
    workspaces?.find(ws => ws.id === selectedWorkspace) : null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-workspaces-title">Team Workspaces</h1>
          <p className="text-muted-foreground" data-testid="text-workspaces-subtitle">
            Collaborate with your team on infrastructure projects and operations
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-workspace">
              <Plus className="w-4 h-4 mr-2" />
              Create Workspace
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Workspace</DialogTitle>
              <DialogDescription>
                Create a new workspace for your team to collaborate on infrastructure projects
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace-name">Workspace Name *</Label>
                <Input
                  id="workspace-name"
                  placeholder="e.g., Platform Engineering"
                  value={newWorkspace.name}
                  onChange={(e) => setNewWorkspace(prev => ({ ...prev, name: e.target.value }))}
                  data-testid="input-workspace-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="workspace-description">Description</Label>
                <Input
                  id="workspace-description"
                  placeholder="Brief description of the workspace..."
                  value={newWorkspace.description}
                  onChange={(e) => setNewWorkspace(prev => ({ ...prev, description: e.target.value }))}
                  data-testid="input-workspace-description"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="workspace-visibility">Visibility</Label>
                <Select 
                  value={newWorkspace.visibility} 
                  onValueChange={(value) => setNewWorkspace(prev => ({ ...prev, visibility: value as any }))}
                >
                  <SelectTrigger data-testid="select-workspace-visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private - Only invited members</SelectItem>
                    <SelectItem value="team">Team - Team members can join</SelectItem>
                    <SelectItem value="organization">Organization - All employees can join</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateWorkspace}
                  disabled={createWorkspaceMutation.isPending}
                  data-testid="button-confirm-create-workspace"
                >
                  {createWorkspaceMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workspaces List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Workspaces</h2>
            <Badge variant="outline">
              {workspaces?.length || 0} workspace{(workspaces?.length || 0) !== 1 ? 's' : ''}
            </Badge>
          </div>
          
          {isLoading ? (
            <div className="space-y-4" data-testid="loading-workspaces">
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
          ) : workspaces?.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground" data-testid="text-no-workspaces">
                No workspaces found. Create your first workspace to get started!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {workspaces?.map((workspace) => (
                <Card 
                  key={workspace.id} 
                  className={`hover-elevate cursor-pointer transition-all ${
                    selectedWorkspace === workspace.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedWorkspace(workspace.id)}
                  data-testid={`card-workspace-${workspace.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getVisibilityIcon(workspace.visibility)}
                          <h3 className="font-semibold text-lg" data-testid={`text-workspace-name-${workspace.id}`}>
                            {workspace.name}
                          </h3>
                          <Badge variant={getVisibilityBadgeVariant(workspace.visibility)} className="text-xs">
                            {workspace.visibility}
                          </Badge>
                        </div>
                        
                        {workspace.description && (
                          <p className="text-muted-foreground mb-3" data-testid={`text-workspace-description-${workspace.id}`}>
                            {workspace.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {workspace.members.length} member{workspace.members.length !== 1 ? 's' : ''}
                          </div>
                          <div data-testid={`text-workspace-updated-${workspace.id}`}>
                            Updated {formatDistanceToNow(new Date(workspace.updatedAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`button-workspace-menu-${workspace.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Invite Members
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Workspace Details */}
        <div className="space-y-4">
          {selectedWorkspaceData ? (
            <Card data-testid="card-workspace-details">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getVisibilityIcon(selectedWorkspaceData.visibility)}
                  {selectedWorkspaceData.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedWorkspaceData.description && (
                  <p className="text-sm text-muted-foreground" data-testid="text-selected-workspace-description">
                    {selectedWorkspaceData.description}
                  </p>
                )}
                
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Members ({selectedWorkspaceData.members.length})</h4>
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {selectedWorkspaceData.members.map((member) => (
                        <div key={member.id} className="flex items-center gap-2" data-testid={`member-${member.id}`}>
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={member.avatar || undefined} />
                            <AvatarFallback className="text-xs">
                              {getUserInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" data-testid={`member-name-${member.id}`}>
                              {member.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate" data-testid={`member-role-${member.id}`}>
                              {member.role}
                            </p>
                          </div>
                          {member.permissions?.includes('owner') && (
                            <Crown className="w-3 h-3 text-yellow-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                
                <div className="pt-3 border-t space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Created</span>
                    <span data-testid="text-selected-workspace-created">
                      {formatDistanceToNow(new Date(selectedWorkspaceData.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Last updated</span>
                    <span data-testid="text-selected-workspace-updated">
                      {formatDistanceToNow(new Date(selectedWorkspaceData.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground" data-testid="text-no-workspace-selected">
                Select a workspace to view details
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamWorkspaces;