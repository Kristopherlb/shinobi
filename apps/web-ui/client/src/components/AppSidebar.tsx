import { 
  Activity, 
  CheckSquare, 
  MessageSquare, 
  Settings, 
  Layout, 
  AlertTriangle, 
  GitBranch, 
  BookOpen,
  Zap,
  Database,
  Server,
  BarChart3,
  Users,
  Wand2,
  Rocket,
  FileText,
  Settings2,
  Laptop
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Create New Service",
    url: "/onboarding",
    icon: Rocket,
    description: "Guided service creation wizard",
  },
  {
    title: "Edit Service Manifest",
    url: "/manifest-editor",
    icon: FileText,
    description: "Schema-aware YAML editor",
  },
  {
    title: "Configuration Precedence",
    url: "/configuration-precedence",
    icon: Settings2,
    description: "5-layer configuration resolver",
  },
  {
    title: "Local Development",
    url: "/local-development",
    icon: Laptop,
    description: "One-click local environment",
  },
  {
    title: "Infrastructure Operations",
    url: "/operations",
    icon: Server,
    description: "Deploy and manage CDK services",
  },
  {
    title: "Service Monitoring",
    url: "/monitoring",
    icon: BarChart3,
    description: "Health metrics and compliance",
  },
  {
    title: "Component Catalog",
    url: "/catalog",
    icon: BookOpen,
    description: "CDK components and templates",
  },
  {
    title: "Team Collaboration",
    url: "/collaboration", 
    icon: Users,
    description: "Workspaces and team management",
  },
  {
    title: "AI Component Generator",
    url: "/ai-tools",
    icon: Wand2,
    description: "Generate CDK components with AI",
  },
  {
    title: "Activity Feed",
    url: "/feed",
    icon: Activity,
    description: "Platform-wide events",
  },
  {
    title: "Tasks",
    url: "/tasks",
    icon: CheckSquare,
    description: "Pending approvals & automation",
  },
  {
    title: "AI Chat",
    url: "/chat",
    icon: MessageSquare,
    description: "AI assistant conversations",
  },
];

const settingsItems = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    description: "Platform configuration",
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold text-muted-foreground">
            Platform
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold text-muted-foreground">
            Configuration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}