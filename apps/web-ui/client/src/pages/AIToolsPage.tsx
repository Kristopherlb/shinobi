import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MCPToolsDiscovery } from "@/components/ai-tools/MCPToolsDiscovery";
import { ComponentGenerator } from "@/components/ai-tools/ComponentGenerator";

export default function AIToolsPage() {
  return (
    <AppShell 
      breadcrumbs={[
        { label: 'Shinobi ADP' }, 
        { label: 'AI Tools' },
        { label: 'Platform Intelligence' }
      ]}
      showTimelineRail={true}
      showMetadataRail={true}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-ai-tools-title">AI-Powered Tools</h1>
          <p className="text-muted-foreground text-lg" data-testid="text-ai-tools-subtitle">
            Discover and execute intelligent tools for infrastructure management, component generation, and platform optimization
          </p>
        </div>

        <Tabs defaultValue="discovery" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="discovery" data-testid="tab-tool-discovery">
              Tool Discovery & Execution
            </TabsTrigger>
            <TabsTrigger value="generator" data-testid="tab-component-generator">
              Component Generator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discovery" className="space-y-4">
            <MCPToolsDiscovery />
          </TabsContent>

          <TabsContent value="generator" className="space-y-4">
            <ComponentGenerator />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}