import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Timestamp } from '@/components/Timestamp';
import { CodeBlock } from '@/components/CodeBlock';
import { 
  Send, 
  Bot, 
  User, 
  MessageSquare, 
  Zap,
  ExternalLink,
  Copy,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: Array<{
    id: string;
    title: string;
    type: string;
    url?: string;
  }>;
  codeBlocks?: Array<{
    language: string;
    code: string;
  }>;
}

const initialMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Hello! I\'m Shinobi AI, your development platform assistant. I can help you with deployments, infrastructure management, code reviews, troubleshooting, and more. What would you like to work on today?',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    citations: [
      { id: 'ai-1', title: 'Platform Documentation', type: 'docs', url: '#' },
      { id: 'ai-2', title: 'AI Assistant Capabilities', type: 'guide' }
    ]
  },
  {
    id: '2',
    role: 'user',
    content: 'Can you help me debug a deployment issue? Our PostgreSQL migration is failing.',
    timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString()
  },
  {
    id: '3',
    role: 'assistant',
    content: 'I\'ll help you debug the PostgreSQL migration issue. Let me provide some common troubleshooting steps and a diagnostic script.',
    timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    citations: [
      { id: 'debug-1', title: 'Migration Troubleshooting Guide', type: 'docs' },
      { id: 'debug-2', title: 'PostgreSQL Error Codes', type: 'reference', url: '#' }
    ],
    codeBlocks: [
      {
        language: 'bash',
        code: `# Check migration status
kubectl exec -it postgres-pod -- psql -U admin -d myapp -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"

# Check for locks
kubectl exec -it postgres-pod -- psql -U admin -d myapp -c "SELECT * FROM pg_locks WHERE granted = false;"`
      }
    ]
  }
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: 'I understand your question. Let me help you with that. Here\'s what I recommend based on the current platform state and best practices.',
        timestamp: new Date().toISOString(),
        citations: [
          { id: 'resp-1', title: 'Best Practices Guide', type: 'docs' },
          { id: 'resp-2', title: 'API Documentation', type: 'reference' }
        ]
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const timelineContent = (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-foreground">Chat History</h3>
        <Badge variant="success" className="text-xs">Active</Badge>
      </div>
      
      <div className="space-y-3">
        {messages.slice(-3).map((message, index) => (
          <div key={message.id} className="flex items-start gap-3 p-2 rounded-md hover-elevate cursor-pointer">
            <div className="timeline-marker mt-1.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {message.role === 'assistant' ? (
                  <Bot className="w-3 h-3 text-primary" />
                ) : (
                  <User className="w-3 h-3 text-muted-foreground" />
                )}
                <Badge variant={message.role === 'assistant' ? 'info' : 'outline'} className="text-xs">
                  {message.role}
                </Badge>
              </div>
              <p className="text-sm text-foreground leading-tight line-clamp-2">{message.content}</p>
              <p className="text-xs text-muted-foreground mt-1">
                <Timestamp iso={message.timestamp} format="relative" />
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <Button variant="ghost" size="sm" className="w-full text-xs" data-testid="button-view-chat-history">
        View full history
      </Button>
    </div>
  );

  const metadataContent = (
    <div className="space-y-4">
      {/* Session Info */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Session Info</h4>
        <div className="space-y-1">
          <div className="citation-badge">AI Model: GPT-4</div>
          <div className="citation-badge">Context: Platform</div>
          <div className="citation-badge">Mode: Interactive</div>
        </div>
      </div>

      {/* Quick Capabilities */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Capabilities</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Code Review</span>
            <Badge variant="success" className="text-xs">Available</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Infrastructure</span>
            <Badge variant="success" className="text-xs">Available</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Debugging</span>
            <Badge variant="success" className="text-xs">Available</Badge>
          </div>
        </div>
      </div>

      {/* Recent Citations */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent Citations</h4>
        <div className="space-y-2">
          {messages.flatMap(m => m.citations || []).slice(-2).map((citation, index) => (
            <div key={citation.id} className="p-2 bg-muted/30 rounded border border-border/50 hover-elevate cursor-pointer">
              <div className="flex items-start gap-2">
                <span className="citation-badge">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-tight">{citation.title}</p>
                  <p className="text-xs text-accent mt-1">{citation.type}</p>
                </div>
                {citation.url && <ExternalLink className="w-3 h-3 text-muted-foreground mt-0.5" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quick Actions</h4>
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs" data-testid="button-clear-chat">
            <RefreshCw className="w-3 h-3 mr-2" />
            Clear conversation
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs" data-testid="button-export-chat">
            <Copy className="w-3 h-3 mr-2" />
            Export conversation
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <AppShell
      breadcrumbs={[{ label: 'Shinobi ADP' }, { label: 'AI Assistant' }]}
      showTimelineRail={true}
      showMetadataRail={true}
      timelineContent={timelineContent}
      metadataContent={metadataContent}
    >
      <div className="flex flex-col h-full max-h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-h1 font-bold text-foreground mb-2">AI Assistant</h1>
            <p className="text-muted-foreground">
              Get intelligent help with deployments, troubleshooting, and development tasks
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" data-testid="button-chat-settings">
              <MessageSquare className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button size="sm" data-testid="button-new-chat">
              <Zap className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <Card className="flex-1 flex flex-col chrome-minimal">
          <CardContent className="flex-1 flex flex-col p-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="flex items-start gap-4">
                  {/* Avatar & Timeline Marker */}
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <div className="timeline-marker" />
                    {message.role === 'assistant' ? (
                      <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={message.role === 'assistant' ? 'info' : 'outline'} className="text-xs">
                        {message.role === 'assistant' ? 'Shinobi AI' : 'You'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        <Timestamp iso={message.timestamp} format="absolute" />
                      </span>
                    </div>

                    <div className="prose prose-sm max-w-none text-foreground">
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    </div>

                    {/* Code Blocks */}
                    {message.codeBlocks && message.codeBlocks.map((block, index) => (
                      <CodeBlock
                        key={index}
                        code={block.code}
                        lang={block.language as any}
                        className="mt-3"
                      />
                    ))}

                    {/* Citations */}
                    {message.citations && message.citations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Sources
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {message.citations.map((citation, index) => (
                            <div
                              key={citation.id}
                              className="flex items-center gap-1 p-1.5 bg-muted/30 rounded border border-border/50 hover-elevate cursor-pointer"
                              data-testid={`citation-${citation.id}`}
                            >
                              <span className="citation-badge">{index + 1}</span>
                              <span className="text-xs text-foreground">{citation.title}</span>
                              <span className="text-xs text-accent">({citation.type})</span>
                              {citation.url && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <div className="timeline-marker" />
                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary animate-pulse" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Badge variant="info" className="text-xs mb-2">Shinobi AI is thinking...</Badge>
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-border p-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Textarea
                    placeholder="Ask about deployments, infrastructure, debugging, or any development task..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    data-testid="textarea-chat-input"
                  />
                </div>
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  size="sm"
                  className="self-end"
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}