import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Eye, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiffViewerProps {
  diff: string;
  view?: 'unified' | 'split';
  onCopy?: () => void;
  className?: string;
}

export function DiffViewer({ diff, view = 'unified', onCopy, className }: DiffViewerProps) {
  const [viewMode, setViewMode] = useState(view);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(diff);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  const renderDiffLine = (line: string, index: number) => {
    const lineNumber = index + 1;
    let lineClass = 'px-4 py-1 font-mono text-sm border-l-2';
    let lineType = '';
    
    if (line.startsWith('+')) {
      lineClass += ' bg-green-500/10 border-l-green-500 text-green-400';
      lineType = '+';
    } else if (line.startsWith('-')) {
      lineClass += ' bg-red-500/10 border-l-red-500 text-red-400';
      lineType = '-';
    } else if (line.startsWith('@@')) {
      lineClass += ' bg-blue-500/10 border-l-blue-500 text-blue-400 font-semibold';
      lineType = '@@';
    } else {
      lineClass += ' border-l-border text-muted-foreground';
    }

    return (
      <div key={index} className={lineClass}>
        <span className="inline-block w-8 text-right mr-4 text-muted-foreground text-xs">
          {lineNumber}
        </span>
        <span className="mr-2 w-4 inline-block text-center">
          {lineType}
        </span>
        <span>{line.slice(1) || ' '}</span>
      </div>
    );
  };

  const lines = diff.split('\n');

  return (
    <div className={cn('border border-border rounded-lg overflow-hidden', className)}>
      <div className="flex items-center justify-between p-3 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Diff View</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setViewMode(viewMode === 'unified' ? 'split' : 'unified')}
            data-testid="button-toggle-diff-view"
          >
            <Eye className="w-4 h-4 mr-1" />
            {viewMode === 'unified' ? 'Split' : 'Unified'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            data-testid="button-copy-diff"
          >
            <Copy className="w-4 h-4 mr-1" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </div>
      
      <div className="bg-background overflow-x-auto max-h-96">
        {lines.map((line, index) => renderDiffLine(line, index))}
      </div>
    </div>
  );
}