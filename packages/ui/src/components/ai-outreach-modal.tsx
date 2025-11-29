"use client";

import { useState, useEffect } from "react";
import { Copy, Mail, Loader2, Send, MessageSquare, Sparkles } from "lucide-react";
import { 
  Modal, 
  ModalContent, 
  ModalDescription, 
  ModalHeader, 
  ModalTitle, 
  ModalTrigger 
} from "./modal";
import { Button } from "./button";
import { cn } from "../lib/utils";

interface AIOutreachModalProps {
  prospectIds: string[];
  trigger?: React.ReactNode;
  onOutreachGenerated?: (content: string, type: 'email' | 'linkedin') => void;
}

interface StreamingState {
  isStreaming: boolean;
  content: string;
  error?: string;
}

interface OutreachTemplate {
  id: string;
  name: string;
  type: 'email' | 'linkedin';
  description: string;
}

const outreachTemplates: OutreachTemplate[] = [
  {
    id: 'cold-email',
    name: 'Cold Email',
    type: 'email',
    description: 'Professional introduction and value proposition'
  },
  {
    id: 'followup-email',
    name: 'Follow-up Email',
    type: 'email',
    description: 'Gentle reminder with additional context'
  },
  {
    id: 'linkedin-message',
    name: 'LinkedIn Message',
    type: 'linkedin',
    description: 'Casual connection request with personalized note'
  },
  {
    id: 'linkedin-inmail',
    name: 'LinkedIn InMail',
    type: 'linkedin',
    description: 'Direct message for premium LinkedIn outreach'
  },
];

export function AIOutreachModal({ 
  prospectIds, 
  trigger,
  onOutreachGenerated 
}: AIOutreachModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<OutreachTemplate>(outreachTemplates[0]);
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    content: "",
  });

  const generateOutreach = async () => {
    setStreamingState({ isStreaming: true, content: "" });
    
    try {
      // Simulate streaming AI response
      const response = await fetch('/api/ai/outreach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prospectIds,
          template: selectedTemplate.id,
          type: selectedTemplate.type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate outreach content');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response body');
      }

      let accumulatedContent = "";
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulatedContent += parsed.content;
                setStreamingState({
                  isStreaming: true,
                  content: accumulatedContent,
                });
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
      
      setStreamingState({
        isStreaming: false,
        content: accumulatedContent,
      });
      
      onOutreachGenerated?.(accumulatedContent, selectedTemplate.type);
      
    } catch (error) {
      setStreamingState({
        isStreaming: false,
        content: "",
        error: error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(streamingState.content);
      // Toast notification would be handled by the consuming component
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleSend = () => {
    // This would integrate with email/LinkedIn APIs
    console.log('Sending outreach:', streamingState.content);
  };

  useEffect(() => {
    if (isOpen && !streamingState.content && !streamingState.isStreaming) {
      generateOutreach();
    }
  }, [isOpen, selectedTemplate]);

  return (
    <Modal open={isOpen} onOpenChange={setIsOpen}>
      <ModalTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <MessageSquare className="mr-2 h-4 w-4" />
            AI Outreach
          </Button>
        )}
      </ModalTrigger>
      <ModalContent className="max-w-3xl max-h-[80vh] overflow-hidden">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI-Powered Outreach
          </ModalTitle>
          <ModalDescription>
            Generate personalized outreach messages for your prospects
          </ModalDescription>
        </ModalHeader>
        
        <div className="space-y-4">
          {/* Template Selection */}
          <div className="grid grid-cols-2 gap-3">
            {outreachTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={cn(
                  "p-3 text-left rounded-lg border transition-colors",
                  selectedTemplate.id === template.id
                    ? "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950"
                    : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {template.type === 'email' ? (
                    <Mail className="h-4 w-4" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                  <span className="font-medium text-sm">{template.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{template.description}</p>
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px]">
            {streamingState.isStreaming && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating personalized outreach...
              </div>
            )}
            
            {streamingState.error && (
              <div className="rounded-md bg-red-50 p-4 text-red-800 dark:bg-red-950 dark:text-red-200">
                <p className="font-medium">Error</p>
                <p className="text-sm">{streamingState.error}</p>
              </div>
            )}
            
            {streamingState.content && (
              <div className="space-y-4">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                    {streamingState.content}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          {streamingState.content && (
            <div className="flex items-center gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!streamingState.content}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!streamingState.content}
              >
                <Send className="mr-2 h-4 w-4" />
                {selectedTemplate.type === 'email' ? 'Send Email' : 'Send Message'}
              </Button>
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}