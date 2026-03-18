'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Smartphone, 
  Monitor,
  Save,
  Check,
  Plus,
  Trash2,
  GripVertical,
  Type,
  Image,
  Video,
  FormInput,
  Quote,
  List,
  MousePointer
} from 'lucide-react';

// Block Types for Landing Pages
const BLOCK_TYPES = [
  { type: 'hero', label: 'Hero Section', icon: Type, description: 'Large headline with CTA' },
  { type: 'text', label: 'Text Block', icon: Type, description: 'Rich text content' },
  { type: 'image', label: 'Image', icon: Image, description: 'Single image' },
  { type: 'video', label: 'Video', icon: Video, description: 'Embed video' },
  { type: 'form', label: 'Lead Form', icon: FormInput, description: 'Capture leads' },
  { type: 'testimonial', label: 'Testimonial', icon: Quote, description: 'Customer quote' },
  { type: 'features', label: 'Features', icon: List, description: 'Feature grid' },
  { type: 'cta', label: 'Call to Action', icon: MousePointer, description: 'CTA button' },
  { type: 'divider', label: 'Divider', icon: Type, description: 'Section separator' },
  { type: 'footer', label: 'Footer', icon: Type, description: 'Page footer' },
];

// Pre-built Templates
const LANDING_TEMPLATES = [
  {
    id: 'webinar',
    name: 'Webinar Registration',
    description: 'Register attendees for your webinar',
    blocks: [
      { type: 'hero', content: { headline: 'Join Our Free Webinar', subheadline: 'Learn the secrets to...', cta: 'Register Now' } },
      { type: 'text', content: { text: 'In this webinar, you will learn...' } },
      { type: 'form', content: { formId: 'webinar-form' } },
      { type: 'testimonial', content: { quote: 'Best webinar ever!', author: 'John D.' } },
    ],
  },
  {
    id: 'ebook',
    name: 'Ebook Download',
    description: 'Gate content behind email capture',
    blocks: [
      { type: 'hero', content: { headline: 'Get Your Free Ebook', subheadline: 'The complete guide to...', cta: 'Download Now' } },
      { type: 'image', content: { src: '/ebook-cover.jpg', alt: 'Ebook cover' } },
      { type: 'features', content: { features: ['Chapter 1: Introduction', 'Chapter 2: Strategy', 'Chapter 3: Implementation'] } },
      { type: 'form', content: { formId: 'ebook-form', buttonText: 'Send Me The Ebook' } },
    ],
  },
  {
    id: 'demo',
    name: 'Book a Demo',
    description: 'Schedule product demonstrations',
    blocks: [
      { type: 'hero', content: { headline: 'See It In Action', subheadline: 'Book a personalized demo', cta: 'Schedule Demo' } },
      { type: 'video', content: { url: 'https://youtube.com/...' } },
      { type: 'features', content: { features: ['30-minute call', 'Live product tour', 'Q&A session'] } },
      { type: 'form', content: { formId: 'demo-form' } },
    ],
  },
];

export function LandingPageBuilder({ initialPage, onSave, onCancel }) {
  const [pageName, setPageName] = useState(initialPage?.name || 'New Landing Page');
  const [pageTitle, setPageTitle] = useState(initialPage?.title || '');
  const [pageDescription, setPageDescription] = useState(initialPage?.description || '');
  const [blocks, setBlocks] = useState(initialPage?.blocks || []);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [devicePreview, setDevicePreview] = useState('desktop');
  const [showTemplates, setShowTemplates] = useState(false);
  const [saved, setSaved] = useState(false);

  const addBlock = (type: string) => {
    const defaultContent: Record<string, any> = {
      hero: { headline: 'Headline Here', subheadline: 'Subheadline text', cta: 'Get Started', backgroundColor: '#3b82f6' },
      text: { text: 'Enter your text content here...', align: 'left' },
      image: { src: '', alt: '', caption: '' },
      video: { url: '', provider: 'youtube' },
      form: { formId: '', buttonText: 'Submit', showTitle: true },
      testimonial: { quote: '', author: '', company: '', image: '' },
      features: { features: [{ title: 'Feature 1', description: 'Description' }] },
      cta: { text: 'Call to Action', buttonText: 'Click Here', url: '#', backgroundColor: '#f3f4f6' },
      divider: { style: 'solid', color: '#e5e7eb' },
      footer: { text: '© 2024 Your Company', links: [] },
    };

    const newBlock = {
      id: generateId(),
      type,
      content: defaultContent[type] || {},
    };
    setBlocks([...blocks, newBlock]);
    setSelectedBlockIndex(blocks.length);
  };

  const removeBlock = (index: number) => {
    const newBlocks = [...blocks];
    newBlocks.splice(index, 1);
    setBlocks(newBlocks);
    if (selectedBlockIndex === index) {
      setSelectedBlockIndex(null);
    }
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;

    const newBlocks = [...blocks];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]];
    setBlocks(newBlocks);
    setSelectedBlockIndex(swapIndex);
  };

  const updateBlock = (updatedBlock: any) => {
    if (selectedBlockIndex === null) return;
    const newBlocks = [...blocks];
    newBlocks[selectedBlockIndex] = updatedBlock;
    setBlocks(newBlocks);
  };

  const applyTemplate = (template: any) => {
    setPageName(template.name);
    setPageTitle(template.name);
    setPageDescription(template.description);
    setBlocks(template.blocks.map((b: any) => ({ ...b, id: generateId() })));
    setShowTemplates(false);
  };

  const handleSave = () => {
    onSave({
      name: pageName,
      title: pageTitle,
      description: pageDescription,
      blocks,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const selectedBlock = selectedBlockIndex !== null ? blocks[selectedBlockIndex] : null;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Input
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              className="text-xl font-semibold border-0 bg-transparent focus-visible:ring-0 px-0 w-64"
              placeholder="Page Name"
            />
            <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
              Use Template
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button
                variant={devicePreview === 'desktop' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDevicePreview('desktop')}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={devicePreview === 'mobile' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDevicePreview('mobile')}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              variant={previewMode ? 'secondary' : 'outline'}
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
            
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            
            <Button onClick={handleSave} className={saved ? 'bg-green-600' : ''}>
              {saved ? <><Check className="h-4 w-4 mr-2" />Saved!</> : <><Save className="h-4 w-4 mr-2" />Save</>}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {!previewMode ? (
          <>
            {/* Left Sidebar - Block Library */}
            <div className="w-64 bg-white border-r p-4 overflow-y-auto">
              <h3 className="font-semibold mb-4">Add Blocks</h3>
              <div className="space-y-2">
                {BLOCK_TYPES.map((block) => {
                  const Icon = block.icon;
                  return (
                    <Button
                      key={block.type}
                      variant="ghost"
                      className="w-full justify-start text-left"
                      onClick={() => addBlock(block.type)}
                    >
                      <Icon className="h-4 w-4 mr-3 text-gray-500" />
                      <div>
                        <div className="font-medium">{block.label}</div>
                        <div className="text-xs text-gray-500">{block.description}</div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Center - Page Canvas */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className={`mx-auto ${devicePreview === 'mobile' ? 'max-w-sm' : 'max-w-4xl'}`}>
                <Card className="min-h-[600px]">
                  <CardContent className="p-0">
                    {blocks.length === 0 ? (
                      <div className="text-center py-20 text-gray-400">
                        <Plus className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg">Start building your landing page</p>
                        <p>Click a block type from the sidebar</p>
                      </div>
                    ) : (
                      blocks.map((block, index) => (
                        <div
                          key={block.id}
                          className={`relative border-b p-6 transition-all ${
                            selectedBlockIndex === index ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedBlockIndex(index)}
                        >
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); moveBlock(index, 'up'); }}
                              disabled={index === 0}
                            >
                              ↑
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); moveBlock(index, 'down'); }}
                              disabled={index === blocks.length - 1}
                            >
                              ↓
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500"
                              onClick={(e) => { e.stopPropagation(); removeBlock(index); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Block Preview */}
                          <BlockPreview block={block} />
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right Sidebar - Properties */}
            <div className="w-80 bg-white border-l p-4 overflow-y-auto">
              <Tabs defaultValue="content">
                <TabsList className="w-full">
                  <TabsTrigger value="content" className="flex-1">Content</TabsTrigger>
                  <TabsTrigger value="settings" className="flex-1">Page</TabsTrigger>
                </TabsList>
                
                <TabsContent value="content" className="mt-4">
                  {selectedBlock ? (
                    <BlockProperties block={selectedBlock} updateBlock={updateBlock} />
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      Select a block to edit its properties
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="settings" className="mt-4 space-y-4">
                  <div>
                    <Label>Page Title</Label>
                    <Input
                      value={pageTitle}
                      onChange={(e) => setPageTitle(e.target.value)}
                      placeholder="Page title for SEO"
                    />
                  </div>
                  
                  <div>
                    <Label>Meta Description</Label>
                    <Textarea
                      value={pageDescription}
                      onChange={(e) => setPageDescription(e.target.value)}
                      placeholder="SEO description"
                      rows={3}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto bg-white">
            <div className={`mx-auto ${devicePreview === 'mobile' ? 'max-w-sm' : 'max-w-4xl'}`}>
              {blocks.map((block) => (
                <BlockRender key={block.id} block={block} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-auto m-4">
            <CardHeader>
              <CardTitle>Choose a Template</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {LANDING_TEMPLATES.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:border-blue-500"
                    onClick={() => applyTemplate(template)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-500">{template.description}</p>
                      <div className="text-xs text-gray-400 mt-2">{template.blocks.length} blocks</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button className="mt-6" variant="outline" onClick={() => setShowTemplates(false)}>Cancel</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Block Preview Component
function BlockPreview({ block }: { block: any }) {
  switch (block.type) {
    case 'hero':
      return (
        <div className="text-center py-8" style={{ backgroundColor: block.content.backgroundColor || '#3b82f6', color: 'white' }}>
          <h2 className="text-3xl font-bold mb-2">{block.content.headline}</h2>
          <p className="text-lg opacity-90">{block.content.subheadline}</p>
          {block.content.cta && <Button className="mt-4">{block.content.cta}</Button>}
        </div>
      );
    case 'text':
      return (
        <div className="prose max-w-none">
          <p className={`text-${block.content.align || 'left'}`}>{block.content.text}</p>
        </div>
      );
    case 'image':
      return block.content.src ? (
        <img src={block.content.src} alt={block.content.alt} className="w-full rounded" />
      ) : (
        <div className="bg-gray-200 h-48 rounded flex items-center justify-center text-gray-400">No Image</div>
      );
    case 'form':
      return <div className="bg-gray-100 p-4 rounded"><Badge>Form Block</Badge></div>;
    case 'testimonial':
      return (
        <blockquote className="border-l-4 border-blue-500 pl-4 italic">
          "{block.content.quote}"
          <footer className="mt-2 not-italic">— {block.content.author}</footer>
        </blockquote>
      );
    default:
      return <Badge>{block.type}</Badge>;
  }
}

// Block Properties Component
function BlockProperties({ block, updateBlock }: { block: any; updateBlock: (b: any) => void }) {
  if (!block) return null;

  const updateContent = (key: string, value: any) => {
    updateBlock({ ...block, content: { ...block.content, [key]: value } });
  };

  switch (block.type) {
    case 'hero':
      return (
        <div className="space-y-4">
          <div>
            <Label>Headline</Label>
            <Input value={block.content.headline} onChange={(e) => updateContent('headline', e.target.value)} />
          </div>
          <div>
            <Label>Subheadline</Label>
            <Input value={block.content.subheadline} onChange={(e) => updateContent('subheadline', e.target.value)} />
          </div>
          <div>
            <Label>CTA Button</Label>
            <Input value={block.content.cta} onChange={(e) => updateContent('cta', e.target.value)} />
          </div>
          <div>
            <Label>Background Color</Label>
            <Input type="color" value={block.content.backgroundColor} onChange={(e) => updateContent('backgroundColor', e.target.value)} />
          </div>
        </div>
      );
    case 'text':
      return (
        <div className="space-y-4">
          <div>
            <Label>Text Content</Label>
            <Textarea
              value={block.content.text}
              onChange={(e) => updateContent('text', e.target.value)}
              rows={5}
            />
          </div>
          <div>
            <Label>Alignment</Label>
            <Select value={block.content.align} onValueChange={(v) => updateContent('align', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    default:
      return <div className="text-gray-500">Edit properties for {block.type} block</div>;
  }
}

// Block Render for Preview
function BlockRender({ block }: { block: any }) {
  switch (block.type) {
    case 'hero':
      return (
        <div className="py-20 px-8 text-center" style={{ backgroundColor: block.content.backgroundColor || '#3b82f6', color: 'white' }}>
          <h1 className="text-4xl font-bold mb-4">{block.content.headline}</h1>
          <p className="text-xl mb-6">{block.content.subheadline}</p>
          {block.content.cta && <Button size="lg" className="bg-white text-blue-600">{block.content.cta}</Button>}
        </div>
      );
    case 'text':
      return (
        <div className="py-12 px-8 max-w-3xl mx-auto">
          <p className={`text-lg text-${block.content.align || 'left'}`}>{block.content.text}</p>
        </div>
      );
    case 'form':
      return (
        <div className="py-12 px-8 max-w-md mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Input placeholder="Name" />
                <Input type="email" placeholder="Email" />
                <Button className="w-full">{block.content.buttonText || 'Submit'}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    default:
      return <div className="py-8 px-8">Block: {block.type}</div>;
  }
}

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}
