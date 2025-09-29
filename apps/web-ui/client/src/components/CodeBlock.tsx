import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Language = 'yaml' | 'json' | 'ts' | 'bash' | 'javascript' | 'typescript';

interface CodeBlockProps {
  code: string;
  lang?: Language;
  className?: string;
  showCopy?: boolean;
}

export function CodeBlock({ code, lang = 'javascript', className, showCopy = true }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('relative group', className)}>
      <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm font-mono border border-border">
        <code className={cn('text-foreground', `language-${lang}`)}>
          {code}
        </code>
      </pre>
      {showCopy && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
          data-testid="button-copy-code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      )}
    </div>
  );
}