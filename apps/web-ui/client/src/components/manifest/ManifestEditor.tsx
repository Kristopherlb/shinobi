import { useEffect, useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { configureMonacoYaml } from 'monaco-yaml';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/Badge';
import { useToast } from '@/hooks/use-toast';
import { serviceManifestSchema } from '@/lib/serviceManifestSchema';
import { AlertTriangle, CheckCircle2, Save, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import yaml from 'js-yaml';

interface ManifestEditorProps {
  initialValue?: string;
  onSave?: (content: string) => void;
  onValidationChange?: (isValid: boolean, errors: ValidationError[]) => void;
  readonly?: boolean;
  className?: string;
}

interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

const defaultManifest = `# Shinobi Service Manifest
service: my-service
owner: team-platform
complianceFramework: commercial

components:
  - name: api
    type: lambda-api
    config:
      runtime: nodejs18.x
      memory: 512
      timeout: 30
    binds:
      - capability: db:postgres
        access: write
    triggers:
      - type: http
        config:
          path: /api/*
          method: ANY

  - name: database
    type: rds-postgres
    config:
      instance_class: db.t3.micro
      allocated_storage: 20
      backup_retention: 7

labels:
  environment: development
  team: platform
`;

export function ManifestEditor({ 
  initialValue = defaultManifest, 
  onSave, 
  onValidationChange,
  readonly = false,
  className 
}: ManifestEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { toast } = useToast();

  // Configure Monaco YAML when editor mounts
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: any) => {
    editorRef.current = editor;
    
    // Configure YAML with our schema
    configureMonacoYaml(monacoInstance, {
      enableSchemaRequest: true,
      hover: true,
      completion: true,
      validate: true,
      format: true,
      schemas: [
        {
          uri: 'https://shinobi.internal/service-manifest-schema.json',
          fileMatch: ['**/*.yml', '**/*.yaml', '**/service.yml', '**/service.yaml', '*'],
          schema: serviceManifestSchema
        }
      ]
    });

    // Set the model with proper YAML file path to trigger schema association
    const model = editor.getModel();
    if (model) {
      monacoInstance.editor.setModelLanguage(model, 'yaml');
      // Set a proper URI that matches our schema fileMatch patterns
      const yamlModel = monacoInstance.editor.createModel(
        value,
        'yaml',
        monacoInstance.Uri.parse('file:///service.yml')
      );
      editor.setModel(yamlModel);
    }

    // Set up validation listener
    editor.onDidChangeModelContent(() => {
      validateContent(editor.getValue());
    });

    // Initial validation
    setTimeout(() => validateContent(value), 500); // Delay to allow schema to load
  };

  const validateContent = async (content: string) => {
    const errors: ValidationError[] = [];
    
    try {
      // Parse YAML to check syntax
      const parsed = yaml.load(content);
      
      // Get Monaco validation markers with a delay to allow schema validation
      setTimeout(() => {
        if (editorRef.current) {
          const model = editorRef.current.getModel();
          if (model && monaco?.editor) {
            const markers = monaco.editor.getModelMarkers({ resource: model.uri });
            
            const newErrors: ValidationError[] = [];
            markers.forEach(marker => {
              newErrors.push({
                line: marker.startLineNumber,
                column: marker.startColumn,
                message: marker.message,
                severity: marker.severity === 1 ? 'error' : 
                         marker.severity === 2 ? 'warning' : 'info'
              });
            });

            const newIsValid = newErrors.filter(e => e.severity === 'error').length === 0;
            setValidationErrors(newErrors);
            setIsValid(newIsValid);
            onValidationChange?.(newIsValid, newErrors);
          }
        }
      }, 300); // Allow time for Monaco YAML validation to process
      
    } catch (yamlError: any) {
      // YAML syntax error
      const errorLine = yamlError.mark?.line || 0;
      const errorColumn = yamlError.mark?.column || 0;
      
      errors.push({
        line: errorLine + 1,
        column: errorColumn + 1,
        message: yamlError.message || 'YAML syntax error',
        severity: 'error'
      });

      const newIsValid = false;
      setValidationErrors(errors);
      setIsValid(newIsValid);
      onValidationChange?.(newIsValid, errors);
    }
  };

  const handleSave = async () => {
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fix validation errors before saving",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave?.(value);
      toast({
        title: "Manifest Saved",
        description: "Service manifest has been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save manifest",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const errorCount = validationErrors.filter(e => e.severity === 'error').length;
  const warningCount = validationErrors.filter(e => e.severity === 'warning').length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Validation Status Bar */}
      <Card className="border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4" />
              Service Manifest Editor
            </CardTitle>
            <div className="flex items-center gap-3">
              {/* Validation Status */}
              <div className="flex items-center gap-2">
                {isValid ? (
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <Badge variant="success" className="text-xs">Valid</Badge>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <Badge variant="danger" className="text-xs">
                      {errorCount} Error{errorCount !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
                
                {warningCount > 0 && (
                  <Badge variant="warn" className="text-xs">
                    {warningCount} Warning{warningCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              {/* Save Button */}
              {!readonly && onSave && (
                <Button 
                  onClick={handleSave}
                  disabled={!isValid || isSaving}
                  size="sm"
                  data-testid="button-save-manifest"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  Save
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Editor */}
      <Card className="border">
        <CardContent className="p-0">
          <div className="h-[600px] rounded-lg overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="yaml"
              defaultPath="service.yml"
              value={value}
              onChange={(newValue) => setValue(newValue || '')}
              onMount={handleEditorDidMount}
              options={{
                readOnly: readonly,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineNumbers: 'on',
                rulers: [120],
                wordWrap: 'on',
                tabSize: 2,
                insertSpaces: true,
                automaticLayout: true,
                bracketPairColorization: {
                  enabled: true
                },
                suggest: {
                  showKeywords: true,
                  showSnippets: true,
                  insertMode: 'replace'
                }
              }}
              theme="vs-dark"
            />
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card className="border border-destructive/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Validation Issues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {validationErrors.map((error, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-2 rounded bg-muted/30 border border-border/50 text-sm"
              >
                <Badge 
                  variant={error.severity === 'error' ? 'danger' : 
                          error.severity === 'warning' ? 'warn' : 'info'}
                  className="text-xs"
                >
                  {error.severity}
                </Badge>
                <div className="flex-1">
                  <div className="text-foreground">
                    Line {error.line}, Column {error.column}
                  </div>
                  <div className="text-muted-foreground mt-1">
                    {error.message}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}