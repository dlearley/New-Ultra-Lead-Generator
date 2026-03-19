'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, MessageCircle, Bot, Save } from 'lucide-react';

// Type cast for React 18 compatibility
const BotIcon = Bot as React.FC<React.SVGProps<SVGSVGElement>>;
const SaveIcon = Save as React.FC<React.SVGProps<SVGSVGElement>>;
const PlusIcon = Plus as React.FC<React.SVGProps<SVGSVGElement>>;
const TrashIcon = Trash2 as React.FC<React.SVGProps<SVGSVGElement>>;
const MessageIcon = MessageCircle as React.FC<React.SVGProps<SVGSVGElement>>;

// Simple chatbot builder
export function ChatbotBuilder({ onSave, onCancel }: { onSave: (data: any) => void; onCancel: () => void }) {
  const [botName, setBotName] = useState('My Chatbot');
  const [welcomeMessage, setWelcomeMessage] = useState('Hi! How can I help you today?');
  const [flows, setFlows] = useState([
    {
      id: 'welcome',
      trigger: 'start',
      messages: ['Hi! How can I help you today?'],
      options: [
        { label: 'Learn more', nextFlow: 'learn_more' },
        { label: 'Talk to sales', nextFlow: 'sales' },
        { label: 'Get support', nextFlow: 'support' },
      ],
    },
  ]);
  const [activeFlow, setActiveFlow] = useState<string | null>('welcome');

  const addFlow = () => {
    const newFlow = {
      id: `flow_${flows.length + 1}`,
      trigger: 'manual',
      messages: ['New message'],
      options: [],
    };
    setFlows([...flows, newFlow]);
    setActiveFlow(newFlow.id);
  };

  const updateFlow = (flowId: string, updates: any) => {
    setFlows(flows.map(f => f.id === flowId ? { ...f, ...updates } : f));
  };

  const removeFlow = (flowId: string) => {
    setFlows(flows.filter(f => f.id !== flowId));
    if (activeFlow === flowId) setActiveFlow(flows[0]?.id || null);
  };

  const handleSave = () => {
    onSave({
      name: botName,
      welcomeMessage,
      flows,
    });
  };

  const currentFlow = flows.find(f => f.id === activeFlow);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BotIcon className="h-6 w-6 text-blue-600" />
            <Input
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              className="text-xl font-semibold border-0 bg-transparent focus-visible:ring-0 px-0 w-64"
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleSave}>
              <SaveIcon className="h-4 w-4 mr-2" />Save Chatbot
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Flow List */}
        <div className="w-64 bg-white border-r p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Conversation Flows</h3>
            <Button size="sm" variant="ghost" onClick={addFlow}>
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            {flows.map((flow) => (
              <div
                key={flow.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  activeFlow === flow.id ? 'bg-blue-50 border-blue-200 border' : 'hover:bg-gray-50 border border-transparent'
                }`}
                onClick={() => setActiveFlow(flow.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{flow.id}</span>
                  {flow.id !== 'welcome' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-red-500"
                      onClick={(e) => { e.stopPropagation(); removeFlow(flow.id); }}
                    >
                      <TrashIcon className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">{flow.messages.length} messages</div>
              </div>
            ))}
          </div>
        </div>

        {/* Flow Editor */}
        <div className="flex-1 p-6 overflow-y-auto">
          {currentFlow ? (
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageIcon className="h-5 w-5" />
                  Edit Flow: {currentFlow.id}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Messages */}
                <div>
                  <Label>Bot Messages</Label>
                  <div className="space-y-2 mt-2">
                    {currentFlow.messages.map((msg: string, idx: number) => (
                      <div key={idx} className="flex gap-2">
                        <Textarea
                          value={msg}
                          onChange={(e) => {
                            const newMessages = [...currentFlow.messages];
                            newMessages[idx] = e.target.value;
                            updateFlow(currentFlow.id, { messages: newMessages });
                          }}
                          rows={2}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500"
                          onClick={() => {
                            const newMessages = currentFlow.messages.filter((_: string, i: number) => i !== idx);
                            updateFlow(currentFlow.id, { messages: newMessages });
                          }}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => updateFlow(currentFlow.id, { 
                        messages: [...currentFlow.messages, ''] 
                      })}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />Add Message
                    </Button>
                  </div>
                </div>

                {/* Options */}
                <div className="pt-4 border-t">
                  <Label>User Options</Label>
                  <div className="space-y-2 mt-2">
                    {currentFlow.options?.map((opt: any, idx: number) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <Input
                            value={opt.label}
                            onChange={(e) => {
                              const newOptions = [...currentFlow.options];
                              newOptions[idx] = { ...opt, label: e.target.value };
                              updateFlow(currentFlow.id, { options: newOptions });
                            }}
                            placeholder="Option label"
                          />
                          <select
                            value={opt.nextFlow}
                            onChange={(e) => {
                              const newOptions = [...currentFlow.options];
                              newOptions[idx] = { ...opt, nextFlow: e.target.value };
                              updateFlow(currentFlow.id, { options: newOptions });
                            }}
                            className="w-full p-2 border rounded"
                          >
                            <option value="">Select next flow...</option>
                            {flows.map(f => (
                              <option key={f.id} value={f.id}>{f.id}</option>
                            ))}
                          </select>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 mt-1"
                          onClick={() => {
                            const newOptions = currentFlow.options.filter((_: any, i: number) => i !== idx);
                            updateFlow(currentFlow.id, { options: newOptions });
                          }}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => updateFlow(currentFlow.id, {
                        options: [...(currentFlow.options || []), { label: '', nextFlow: '' }]
                      })}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />Add Option
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center text-gray-500 mt-20">
              <Bot className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>Select a flow to edit</p>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="w-96 bg-white border-l p-4">
          <h3 className="font-semibold mb-4">Preview</h3>
          
          <div className="bg-gray-100 rounded-lg h-[500px] flex flex-col">
            {/* Chat Header */}
            <div className="bg-blue-600 text-white p-4 rounded-t-lg">
              <div className="font-semibold">{botName}</div>
              <div className="text-xs opacity-75">Online</div>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {currentFlow?.messages.map((msg: string, idx: number) => (
                <div key={idx} className="flex justify-start">
                  <div className="bg-white rounded-lg p-3 max-w-[80%] shadow-sm">
                    {msg}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Options */}
            <div className="p-4 border-t bg-white rounded-b-lg">
              <div className="space-y-2">
                {currentFlow?.options?.map((opt: any, idx: number) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                  >
                    {opt.label || 'Option'}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
