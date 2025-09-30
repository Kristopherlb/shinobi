import { useState } from 'react';
import { ManifestEditor } from '@/components/manifest/ManifestEditor';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/Badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  FileText, 
  Download, 
  Upload, 
  History, 
  Settings, 
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';

interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export default function ManifestEditorPage() {
  const [isValid, setIsValid] = useState(true);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const { toast } = useToast();

  const handleSave = async (content: string) => {
    try {
      // Validate with platform service (simulated endpoint)
      // In real implementation, this would call the MCP platform/validate endpoint
      console.log('Validating manifest with platform service...');
      
      // Save the manifest (simulated endpoint)
      // In real implementation, this would save to the platform storage
      console.log('Saving manifest content...');

      return Promise.resolve();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to save manifest');
    }
  };

  const handleValidationChange = (valid: boolean, errors: ValidationError[]) => {
    setIsValid(valid);
    setValidationErrors(errors);
  };

  const handleDownload = () => {
    // Get current manifest content (this would be from the editor)
    const manifestContent = "# Current manifest content would go here";
    const blob = new Blob([manifestContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'service.yml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.yml,.yaml';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          // This would update the editor content
          toast({
            title: "File Loaded",
            description: `Loaded ${file.name} into the editor`,
          });
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const errorCount = validationErrors.filter(e => e.severity === 'error').length;
  const warningCount = validationErrors.filter(e => e.severity === 'warning').length;
  const infoCount = validationErrors.filter(e => e.severity === 'info').length;

  const metadataContent = (
    <div className="space-y-4">
      {/* Validation Summary */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Validation Status
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Schema Validation</span>
            {isValid ? (
              <Badge variant="success" className="text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Passed
              </Badge>
            ) : (
              <Badge variant="danger" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Failed
              </Badge>
            )}
          </div>
          
          {errorCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">Errors</span>
              <Badge variant="danger" className="text-xs">{errorCount}</Badge>
            </div>
          )}
          
          {warningCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">Warnings</span>
              <Badge variant="warn" className="text-xs">{warningCount}</Badge>
            </div>
          )}
          
          {infoCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">Info</span>
              <Badge variant="info" className="text-xs">{infoCount}</Badge>
            </div>
          )}
        </div>
      </div>

      {/* Schema Information */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Schema Info
        </h4>
        <div className="space-y-1">
          <div className="citation-badge">JSON Schema Draft 7</div>
          <div className="citation-badge">Shinobi IDP v1.0</div>
          <div className="citation-badge">Auto-completion enabled</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Quick Actions
        </h4>
        <div className="space-y-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-xs h-7"
            onClick={handleDownload}
            data-testid="button-download-manifest"
          >
            <Download className="w-3 h-3 mr-2" />
            Download YAML
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-xs h-7"
            onClick={handleUpload}
            data-testid="button-upload-manifest"
          >
            <Upload className="w-3 h-3 mr-2" />
            Upload File
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-xs h-7"
            data-testid="button-view-history"
          >
            <History className="w-3 h-3 mr-2" />
            View History
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-xs h-7"
            data-testid="button-editor-settings"
          >
            <Settings className="w-3 h-3 mr-2" />
            Editor Settings
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <AppShell 
      breadcrumbs={[
        { label: 'Shinobi ADP' }, 
        { label: 'Development Tools' },
        { label: 'Manifest Editor' }
      ]}
      showTimelineRail={false}
      showMetadataRail={true}
      metadataContent={metadataContent}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-h2 font-bold text-foreground">
                Service Manifest Editor
              </h1>
              <p className="text-muted-foreground">
                Schema-aware YAML editor with real-time validation for service.yml manifests
              </p>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <Card className="border border-info/20 bg-info/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-info flex items-center gap-2">
              <Info className="w-4 h-4" />
              Getting Started
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              This editor provides real-time validation against the Shinobi service manifest schema.
              Use <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Ctrl+Space</kbd> for 
              auto-completion and hover over properties for documentation.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="info" className="text-xs">Schema validation</Badge>
              <Badge variant="info" className="text-xs">Auto-completion</Badge>
              <Badge variant="info" className="text-xs">Inline documentation</Badge>
              <Badge variant="info" className="text-xs">Policy enforcement</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Manifest Editor */}
        <ManifestEditor 
          onSave={handleSave}
          onValidationChange={handleValidationChange}
        />
      </div>
    </AppShell>
  );
}