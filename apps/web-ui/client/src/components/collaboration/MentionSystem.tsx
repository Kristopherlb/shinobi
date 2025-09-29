import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AtSign, Search, User, UserPlus, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { UserProfile, TeamMember, MentionItem } from "@shared/contracts";

interface MentionSystemProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onMention?: (user: UserProfile) => void;
}

interface MentionSuggestion extends UserProfile {
  role?: string;
  team?: string;
  isOnline?: boolean;
}

export function MentionSystem({ value, onChange, placeholder, className, onMention }: MentionSystemProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Mock data - will be replaced with real collaboration service API calls
  const { data: users } = useQuery({
    queryKey: ['/api/collaboration/users'],
    queryFn: async (): Promise<MentionSuggestion[]> => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return [
        {
          id: "user-1",
          name: "Sarah Chen",
          email: "sarah.chen@company.com",
          avatar: undefined,
          role: "Senior DevOps Engineer",
          team: "Platform Engineering",
          isOnline: true
        },
        {
          id: "user-2", 
          name: "Marcus Rodriguez",
          email: "marcus.rodriguez@company.com",
          avatar: undefined,
          role: "Staff Infrastructure Engineer",
          team: "Platform Engineering",
          isOnline: true
        },
        {
          id: "user-3",
          name: "Emily Watson",
          email: "emily.watson@company.com",
          avatar: undefined,
          role: "Cloud Security Architect",
          team: "Security",
          isOnline: false
        },
        {
          id: "user-4",
          name: "David Kim",
          email: "david.kim@company.com",
          avatar: undefined,
          role: "Platform Lead",
          team: "Platform Engineering", 
          isOnline: true
        },
        {
          id: "user-5",
          name: "Lisa Zhang",
          email: "lisa.zhang@company.com",
          avatar: undefined,
          role: "Site Reliability Engineer",
          team: "Infrastructure",
          isOnline: false
        },
        {
          id: "user-6",
          name: "Alex Thompson",
          email: "alex.thompson@company.com",
          avatar: undefined,
          role: "DevSecOps Engineer",
          team: "Security",
          isOnline: true
        }
      ];
    }
  });

  const filteredUsers = users?.filter(user => 
    user.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    user.role?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    user.team?.toLowerCase().includes(mentionQuery.toLowerCase())
  ) || [];

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    const cursorPos = event.target.selectionStart || 0;
    
    onChange(newValue);
    setCursorPosition(cursorPos);

    // Look for @ symbol before cursor
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      
      // Check if there's a space or other delimiter after @
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionStart(lastAtIndex);
        setMentionQuery(textAfterAt);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const insertMention = (user: MentionSuggestion) => {
    if (mentionStart === -1) return;

    const beforeMention = value.slice(0, mentionStart);
    const afterMention = value.slice(cursorPosition);
    const mentionText = `@${user.name} `;
    
    const newValue = beforeMention + mentionText + afterMention;
    onChange(newValue);
    
    setShowSuggestions(false);
    setMentionStart(-1);
    setMentionQuery("");
    
    // Move cursor after the mention
    const newCursorPos = mentionStart + mentionText.length;
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);

    onMention?.(user);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!showSuggestions || filteredUsers.length === 0) return;

    if (event.key === 'Escape') {
      setShowSuggestions(false);
      event.preventDefault();
    }
  };

  // Calculate suggestions position
  const getSuggestionsStyle = () => {
    if (!textareaRef.current || mentionStart === -1) return {};

    const textarea = textareaRef.current;
    const textBeforeMention = value.slice(0, mentionStart);
    const lines = textBeforeMention.split('\n');
    const currentLineLength = lines[lines.length - 1].length;
    
    // Estimate position (simplified calculation)
    const lineHeight = 24;
    const charWidth = 8;
    
    return {
      position: 'absolute' as const,
      top: (lines.length - 1) * lineHeight + 30,
      left: currentLineLength * charWidth + 12,
      zIndex: 50
    };
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusDot = (isOnline?: boolean) => {
    return (
      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
        isOnline ? 'bg-green-500' : 'bg-gray-400'
      }`} />
    );
  };

  const getTeamBadgeVariant = (team?: string) => {
    switch (team) {
      case 'Platform Engineering': return 'default';
      case 'Security': return 'destructive';
      case 'Infrastructure': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Type @ to mention someone..."}
        className="resize-none"
        data-testid="textarea-mention-input"
      />
      
      {showSuggestions && filteredUsers.length > 0 && (
        <Card 
          ref={suggestionsRef}
          className="w-80 max-h-64 shadow-lg border"
          style={getSuggestionsStyle()}
          data-testid="card-mention-suggestions"
        >
          <CardContent className="p-0">
            <div className="p-3 border-b bg-muted/50">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AtSign className="w-4 h-4" />
                Mention someone
                {mentionQuery && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">"{mentionQuery}"</span>
                  </>
                )}
              </div>
            </div>
            
            <ScrollArea className="max-h-48">
              <div className="p-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => insertMention(user)}
                    className="flex items-center gap-3 p-2 rounded-lg hover-elevate cursor-pointer"
                    data-testid={`mention-suggestion-${user.id}`}
                  >
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.avatar || undefined} />
                        <AvatarFallback className="text-xs font-medium">
                          {getUserInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      {getStatusDot(user.isOnline)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate" data-testid={`mention-name-${user.id}`}>
                          {user.name}
                        </span>
                        {user.isOnline && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1" />
                            Online
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground truncate" data-testid={`mention-email-${user.id}`}>
                          {user.email}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        {user.role && (
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                        )}
                        {user.team && (
                          <Badge variant={getTeamBadgeVariant(user.team)} className="text-xs">
                            {user.team}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="p-3 border-t bg-muted/25 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Search className="w-3 h-3" />
                Search by name, email, role, or team
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MentionSystem;