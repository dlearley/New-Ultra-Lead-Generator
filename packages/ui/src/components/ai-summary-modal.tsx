"use client";

import { useState, useEffect } from "react";
import { Copy, Download, Loader2, Brain, FileText, Share2 } from "lucide-react";
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

interface AISummaryModalProps {
  prospectIds: string[];
  trigger?: React.ReactNode;
  onSummaryGenerated?: (summary: string) => void;
}

interface StreamingState {
  isStreaming: boolean;
  content: string;
  error?: string;
}

export function AISummaryModal({ 
  prospectIds, 
  trigger,
  onSummaryGenerated 
}: AISummaryModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    content: "",
  });

  const generateSummary = async () => {
    setStreamingState({ isStreaming: true, content: "" });
    
    try {
      // Simulate streaming AI response
      const response = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prospectIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
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
      
      onSummaryGenerated?.(accumulatedContent);
      
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

  const handleDownload = () => {
    const blob = new Blob([streamingState.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-summary.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI Summary',
          text: streamingState.content,
        });
      } catch (error) {
        console.error('Failed to share:', error);
      }
    }
  };

  useEffect(() => {
    if (isOpen && !streamingState.content && !streamingState.isStreaming) {
      generateSummary();
    }
  }, [isOpen]);

  return (
    <Modal open={isOpen} onOpenChange={setIsOpen}>
      <ModalTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Brain className="mr-2 h-4 w-4" />
            AI Summary
          </Button>
        )}
      </ModalTrigger>
      <ModalContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI-Powered Summary
          </ModalTitle>
          <ModalDescription>
            Generate an intelligent summary of the selected prospects
          </ModalDescription>
        </ModalHeader>
        
        <div className="flex-1 overflow-y-auto">
          {streamingState.isStreaming && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating AI summary...
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
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {streamingState.content}
                </div>
              </div>
              
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
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  disabled={!streamingState.content}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                
                {typeof navigator !== 'undefined' && navigator.share && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                    disabled={!streamingState.content}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}