'use client';

import React, { useState, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  Settings, 
  Eye, 
  Smartphone, 
  Monitor,
  Save,
  Copy,
  Check,
  Type,
  Mail,
  Phone,
  AlignLeft,
  List,
  CircleDot,
  CheckSquare,
  Calendar,
  FileText,
  Hash,
  Star
} from 'lucide-react';

// Type Definitions
interface FormField {
  id: string;
  type: string;
  label: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
  options?: string[] | undefined;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  mapping?: string;
  min?: number;
  max?: number;
}

interface DraggableFieldProps {
  field: FormField;
  index: number;
  moveField: (dragIndex: number, hoverIndex: number) => void;
  updateField: (index: number, field: FormField) => void;
  removeField: (index: number) => void;
  isSelected: boolean;
  onSelect: (index: number) => void;
}

interface FormBuilderProps {
  initialForm?: {
    name?: string;
    title?: string;
    description?: string;
    fields?: FormField[];
  };
  onSave: (form: any) => void;
  onCancel: () => void;
}

// Field Types
const FIELD_TYPES = [
  { type: 'text', label: 'Text Input', icon: Type, description: 'Single line text' },
  { type: 'email', label: 'Email', icon: Mail, description: 'Email address' },
  { type: 'phone', label: 'Phone', icon: Phone, description: 'Phone number' },
  { type: 'textarea', label: 'Text Area', icon: AlignLeft, description: 'Multi-line text' },
  { type: 'select', label: 'Dropdown', icon: List, description: 'Select one option' },
  { type: 'radio', label: 'Radio Buttons', icon: CircleDot, description: 'Single choice' },
  { type: 'checkbox', label: 'Checkboxes', icon: CheckSquare, description: 'Multiple choices' },
  { type: 'number', label: 'Number', icon: Hash, description: 'Numeric input' },
  { type: 'date', label: 'Date', icon: Calendar, description: 'Date picker' },
  { type: 'file', label: 'File Upload', icon: FileText, description: 'Upload files' },
  { type: 'rating', label: 'Rating', icon: Star, description: 'Star rating' },
  { type: 'hidden', label: 'Hidden Field', icon: Type, description: 'Hidden from user' },
];

// Draggable Field Component
function DraggableField({ field, index, moveField, updateField, removeField, isSelected, onSelect }: DraggableFieldProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'field',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'field',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveField(item.index, index);
        item.index = index;
      }
    },
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`relative border rounded-lg p-4 mb-3 transition-all ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      } ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      onClick={() => onSelect(index)}
    >
      <div className="flex items-start gap-3">
        <div className="cursor-move pt-1">
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium">{field.label || 'Untitled Field'}</span>
            {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
            {field.type === 'hidden' && <Badge variant="secondary" className="text-xs">Hidden</Badge>}
          </div>
          
          {/* Field Preview */}
          <div className="mt-2">
            {field.type === 'text' && (
              <Input placeholder={field.placeholder} disabled className="bg-gray-50" />
            )}
            {field.type === 'email' && (
              <Input type="email" placeholder={field.placeholder || 'email@example.com'} disabled className="bg-gray-50" />
            )}
            {field.type === 'phone' && (
              <Input type="tel" placeholder={field.placeholder || '+1 (555) 000-0000'} disabled className="bg-gray-50" />
            )}
            {field.type === 'textarea' && (
              <Textarea placeholder={field.placeholder} disabled className="bg-gray-50" rows={3} />
            )}
            {field.type === 'select' && (
              <Select disabled>
                <SelectTrigger className="bg-gray-50">
                  <SelectValue placeholder={field.placeholder || 'Select an option'} />
                </SelectTrigger>
              </Select>
            )}
            {field.type === 'radio' && (
              <div className="space-y-2">
                {field.options?.map((option: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border border-gray-300" />
                    <span className="text-sm text-gray-600">{option}</span>
                  </div>
                )) || <span className="text-sm text-gray-400">No options defined</span>}
              </div>
            )}
            {field.type === 'checkbox' && (
              <div className="space-y-2">
                {field.options?.map((option: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded border border-gray-300" />
                    <span className="text-sm text-gray-600">{option}</span>
                  </div>
                )) || <span className="text-sm text-gray-400">No options defined</span>}
              </div>
            )}
            {field.type === 'number' && (
              <Input type="number" placeholder={field.placeholder} disabled className="bg-gray-50" />
            )}
            {field.type === 'date' && (
              <Input type="date" disabled className="bg-gray-50" />
            )}
            {field.type === 'file' && (
              <Input type="file" disabled className="bg-gray-50" />
            )}
            {field.type === 'rating' && (
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-6 w-6 text-gray-300" />
                ))}
              </div>
            )}
            {field.type === 'hidden' && (
              <div className="text-sm text-gray-400 italic">Hidden field: {field.name}</div>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-red-500 hover:text-red-700"
          onClick={(e) => {
            e.stopPropagation();
            removeField(index);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Field Properties Panel
function FieldProperties({ field, updateField }: { field: FormField | null; updateField: (field: FormField) => void }) {
  if (!field) {
    return (
      <div className="text-center text-gray-500 py-8">
        <Settings className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>Select a field to edit its properties</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Field Label</Label>
        <Input
          value={field.label}
          onChange={(e) => updateField({ ...field, label: e.target.value })}
          placeholder="Enter field label"
        />
      </div>

      <div>
        <Label>Field Name (Key)</Label>
        <Input
          value={field.name}
          onChange={(e) => updateField({ ...field, name: e.target.value })}
          placeholder="e.g., firstName"
        />
        <p className="text-xs text-gray-500 mt-1">Used as the key in form data</p>
      </div>

      <div>
        <Label>Placeholder Text</Label>
        <Input
          value={field.placeholder || ''}
          onChange={(e) => updateField({ ...field, placeholder: e.target.value })}
          placeholder="e.g., Enter your name"
        />
      </div>

      <div>
        <Label>Help Text</Label>
        <Input
          value={field.helpText || ''}
          onChange={(e) => updateField({ ...field, helpText: e.target.value })}
          placeholder="Additional information for users"
        />
      </div>

      {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
        <div>
          <Label>Options (one per line)</Label>
          <Textarea
            value={field.options?.join('\n') || ''}
            onChange={(e) => updateField({ ...field, options: e.target.value.split('\n').filter(Boolean) })}
            placeholder="Option 1&#10;Option 2&#10;Option 3"
            rows={5}
          />
        </div>
      )}

      {field.type === 'number' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Minimum</Label>
            <Input
              type="number"
              value={field.min || ''}
              onChange={(e) => updateField({ ...field, min: e.target.value ? parseInt(e.target.value) : undefined })}
            />
          </div>
          <div>
            <Label>Maximum</Label>
            <Input
              type="number"
              value={field.max || ''}
              onChange={(e) => updateField({ ...field, max: e.target.value ? parseInt(e.target.value) : undefined })}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t">
        <Label>Required Field</Label>
        <Switch
          checked={field.required || false}
          onCheckedChange={(checked: boolean) => updateField({ ...field, required: checked })}
        />
      </div>
    </div>
  );
}

// Form Templates
const FORM_TEMPLATES = [
  {
    id: 'newsletter',
    name: 'Newsletter Signup',
    description: 'Simple email capture form',
    fields: [
      { type: 'email', label: 'Email Address', name: 'email', required: true, placeholder: 'Enter your email' },
      { type: 'text', label: 'First Name', name: 'firstName', required: false, placeholder: 'Optional' },
    ],
  },
  {
    id: 'contact',
    name: 'Contact Form',
    description: 'Full contact information',
    fields: [
      { type: 'text', label: 'Full Name', name: 'name', required: true },
      { type: 'email', label: 'Email', name: 'email', required: true },
      { type: 'phone', label: 'Phone', name: 'phone', required: false },
      { type: 'text', label: 'Company', name: 'company', required: false },
      { type: 'textarea', label: 'Message', name: 'message', required: true },
    ],
  },
  {
    id: 'demo',
    name: 'Demo Request',
    description: 'Schedule a product demo',
    fields: [
      { type: 'text', label: 'Full Name', name: 'name', required: true },
      { type: 'email', label: 'Work Email', name: 'email', required: true },
      { type: 'text', label: 'Company', name: 'company', required: true },
      { type: 'select', label: 'Company Size', name: 'companySize', required: false, options: ['1-10', '11-50', '51-200', '201-500', '500+'] },
      { type: 'select', label: 'Best Time to Call', name: 'callTime', required: false, options: ['Morning', 'Afternoon', 'Evening'] },
    ],
  },
  {
    id: 'survey',
    name: 'Quick Survey',
    description: 'Customer feedback survey',
    fields: [
      { type: 'text', label: 'Your Name', name: 'name', required: false },
      { type: 'rating', label: 'How satisfied are you?', name: 'satisfaction', required: true },
      { type: 'radio', label: 'Would you recommend us?', name: 'recommend', required: true, options: ['Yes', 'No', 'Maybe'] },
      { type: 'textarea', label: 'Additional Feedback', name: 'feedback', required: false },
    ],
  },
];

// Main Form Builder Component
export function FormBuilder({ initialForm, onSave, onCancel }: FormBuilderProps) {
  const [formName, setFormName] = useState(initialForm?.name || 'New Form');
  const [formDescription, setFormDescription] = useState(initialForm?.description || '');
  const [fields, setFields] = useState(initialForm?.fields || []);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('builder');
  const [previewMode, setPreviewMode] = useState(false);
  const [devicePreview, setDevicePreview] = useState('desktop');
  const [showTemplates, setShowTemplates] = useState(false);
  const [saved, setSaved] = useState(false);

  const addField = (type: string) => {
    const fieldType = FIELD_TYPES.find(f => f.type === type);
    const newField: FormField = {
      id: generateId(),
      type,
      label: fieldType?.label || 'New Field',
      name: `field_${fields.length + 1}`,
      required: false,
      placeholder: '',
      helpText: '',
      options: type === 'select' || type === 'radio' || type === 'checkbox' ? ['Option 1', 'Option 2'] : undefined,
    };
    setFields([...fields, newField]);
    setSelectedFieldIndex(fields.length);
  };

  const removeField = (index: number) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);
    if (selectedFieldIndex === index) {
      setSelectedFieldIndex(null);
    } else if (selectedFieldIndex !== null && selectedFieldIndex > index) {
      setSelectedFieldIndex(selectedFieldIndex - 1);
    }
  };

  const moveField = useCallback((dragIndex: number, hoverIndex: number) => {
    const draggedField = fields[dragIndex];
    if (!draggedField) return;
    const newFields = [...fields];
    newFields.splice(dragIndex, 1);
    newFields.splice(hoverIndex, 0, draggedField);
    setFields(newFields);
  }, [fields]);

  const updateField = (updatedField: any) => {
    if (selectedFieldIndex === null) return;
    const newFields = [...fields];
    newFields[selectedFieldIndex] = updatedField;
    setFields(newFields);
  };

  const applyTemplate = (template: any) => {
    setFields(template.fields.map((f: any) => ({ ...f, id: generateId() })));
    setFormName(template.name);
    setFormDescription(template.description);
    setShowTemplates(false);
  };

  const handleSave = () => {
    onSave({
      name: formName,
      description: formDescription,
      fields,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const selectedField: FormField | null = selectedFieldIndex !== null ? fields[selectedFieldIndex] || null : null;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="text-xl font-semibold border-0 bg-transparent focus-visible:ring-0 px-0 w-64"
                placeholder="Form Name"
              />
              <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
                <Copy className="h-4 w-4 mr-2" />
                Templates
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
              
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              
              <Button onClick={handleSave} className={saved ? 'bg-green-600' : ''}>
                {saved ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Form
                  </>
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {!previewMode ? (
            <>
              {/* Left Sidebar - Field Library */}
              <div className="w-64 bg-white border-r p-4 overflow-y-auto">
                <h3 className="font-semibold mb-4">Field Library</h3>
                <div className="space-y-2">
                  {FIELD_TYPES.map((fieldType) => {
                    const IconComponent = fieldType.icon as React.FC<React.SVGProps<SVGSVGElement>>;
                    return (
                      <Button
                        key={fieldType.type}
                        variant="ghost"
                        className="w-full justify-start text-left"
                        onClick={() => addField(fieldType.type)}
                      >
                        <IconComponent className="h-4 w-4 mr-3 text-gray-500" />
                        <div>
                          <div className="font-medium">{fieldType.label}</div>
                          <div className="text-xs text-gray-500">{fieldType.description}</div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Center - Form Canvas */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className={`mx-auto ${devicePreview === 'mobile' ? 'max-w-sm' : 'max-w-2xl'}`}>
                  <Card>
                    <CardHeader>
                      <CardTitle>{formName}</CardTitle>
                      {formDescription && (
                        <p className="text-sm text-gray-500">{formDescription}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      {fields.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-lg">
                          <Plus className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p>Click a field type from the sidebar to add it to your form</p>
                        </div>
                      ) : (
                        fields.map((field: FormField, index: number) => (
                          <DraggableField
                            key={field.id}
                            field={field}
                            index={index}
                            moveField={moveField}
                            updateField={updateField}
                            removeField={removeField}
                            isSelected={selectedFieldIndex === index}
                            onSelect={setSelectedFieldIndex}
                          />
                        ))
                      )}
                      
                      {fields.length > 0 && (
                        <Button className="w-full mt-6" disabled>
                          Submit
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Right Sidebar - Properties */}
              <div className="w-80 bg-white border-l p-4 overflow-y-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="builder" className="flex-1">Properties</TabsTrigger>
                    <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="builder" className="mt-4">
                    <FieldProperties
                      field={selectedField}
                      updateField={updateField}
                    />
                  </TabsContent>
                  
                  <TabsContent value="settings" className="mt-4 space-y-4">
                    <div>
                      <Label>Form Description</Label>
                      <Textarea
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Describe what this form is for"
                        rows={3}
                      />
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-3">Form Stats</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Fields</span>
                          <span>{fields.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Required Fields</span>
                          <span>{fields.filter(f => f.required).length}</span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          ) : (
            /* Preview Mode */
            <div className="flex-1 flex items-center justify-center p-6 bg-gray-100">
              <div className={`${devicePreview === 'mobile' ? 'w-80' : 'w-full max-w-lg'}`}>
                <Card>
                  <CardHeader>
                    <CardTitle>{formName}</CardTitle>
                    {formDescription && (
                      <p className="text-sm text-gray-500">{formDescription}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {fields.map((field: FormField) => (
                      <div key={field.id}>
                        <Label className={field.required ? 'after:content-["*"] after:text-red-500 after:ml-1' : ''}>
                          {field.label}
                        </Label>
                        {field.helpText && (
                          <p className="text-xs text-gray-500 mb-1">{field.helpText}</p>
                        )}
                        
                        {field.type === 'text' && (
                          <Input placeholder={field.placeholder} />
                        )}
                        {field.type === 'email' && (
                          <Input type="email" placeholder={field.placeholder} />
                        )}
                        {field.type === 'phone' && (
                          <Input type="tel" placeholder={field.placeholder} />
                        )}
                        {field.type === 'textarea' && (
                          <Textarea placeholder={field.placeholder} rows={3} />
                        )}
                        {field.type === 'select' && (
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder={field.placeholder || 'Select...'} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((opt: string, i: number) => (
                                <SelectItem key={i} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {field.type === 'radio' && (
                          <div className="space-y-2 mt-2">
                            {field.options?.map((opt: string, i: number) => (
                              <div key={i} className="flex items-center gap-2">
                                <input type="radio" name={field.name} value={opt} className="h-4 w-4" />
                                <Label className="font-normal">{opt}</Label>
                              </div>
                            ))}
                          </div>
                        )}
                        {field.type === 'number' && (
                          <Input type="number" placeholder={field.placeholder} />
                        )}
                      </div>
                    ))}
                    
                    <Button className="w-full">Submit</Button>
                  </CardContent>
                </Card>
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
                <div className="grid grid-cols-2 gap-4">
                  {FORM_TEMPLATES.map((template) => (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:border-blue-500 transition-colors"
                      onClick={() => applyTemplate(template)}
                    >
                      <CardHeader>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-500 mb-3">{template.description}</p>
                        <div className="text-xs text-gray-400">
                          {template.fields.length} fields
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <Button variant="outline" onClick={() => setShowTemplates(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DndProvider>
  );
}

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}
