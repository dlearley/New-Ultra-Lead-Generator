'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery, useMutation } from 'react-query';
import { PlusIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { 
  getStandardBusinessLeadFields, 
  getAvailableCrmFields,
  createFieldMappings,
  validateFieldMappings 
} from '@/lib/api';
import { FieldMappingData } from '@/types';

interface FieldMappingFormProps {
  crmType: 'SALESFORCE' | 'HUBSPOT' | 'PIPEDRIVE';
  onSave: () => void;
  onCancel: () => void;
}

const fieldTypes = [
  'STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'EMAIL', 'PHONE', 'PICKLIST', 'TEXTAREA'
];

export function FieldMappingForm({ crmType, onSave, onCancel }: FieldMappingFormProps) {
  const { control, handleSubmit, watch, reset } = useForm<{
    mappings: FieldMappingData[];
  }>({
    defaultValues: {
      mappings: [
        {
          sourceField: '',
          targetField: '',
          fieldType: 'STRING',
          isRequired: false,
          defaultValue: '',
        }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'mappings'
  });

  const { data: standardFields } = useQuery('standardFields', getStandardBusinessLeadFields);
  const { data: crmFields, refetch: refetchCrmFields } = useQuery(
    ['crmFields', crmType],
    () => getAvailableCrmFields(crmType),
    { enabled: false }
  );

  const createMutation = useMutation(createFieldMappings, {
    onSuccess: () => {
      onSave();
    },
    onError: (error: any) => {
      console.error('Error creating field mappings:', error);
    }
  });

  const validateMutation = useMutation(validateFieldMappings);

  useEffect(() => {
    if (crmType) {
      refetchCrmFields();
    }
  }, [crmType, refetchCrmFields]);

  const onSubmit = async (data: { mappings: FieldMappingData[] }) => {
    try {
      // First validate the mappings
      const validationResult = await validateMutation.mutateAsync({
        crmType,
        mappings: data.mappings
      });

      if (!validationResult.success) {
        alert(`Validation failed: ${validationResult.errors.join(', ')}`);
        return;
      }

      // If validation passes, create the mappings
      await createMutation.mutateAsync({
        crmType,
        mappings: data.mappings
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const addMapping = () => {
    append({
      sourceField: '',
      targetField: '',
      fieldType: 'STRING',
      isRequired: false,
      defaultValue: '',
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Mappings */}
      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-12 gap-4 items-start p-4 border border-gray-200 rounded-lg">
            <div className="col-span-3">
              <label className="form-label">Source Field</label>
              <select
                {...control.register(`mappings.${index}.sourceField`)}
                className="form-input"
              >
                <option value="">Select field</option>
                {standardFields?.map((fieldName: string) => (
                  <option key={fieldName} value={fieldName}>
                    {fieldName}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-3">
              <label className="form-label">Target Field</label>
              <select
                {...control.register(`mappings.${index}.targetField`)}
                className="form-input"
              >
                <option value="">Select field</option>
                {crmFields?.fields?.map((fieldName: string) => (
                  <option key={fieldName} value={fieldName}>
                    {fieldName}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="form-label">Field Type</label>
              <select
                {...control.register(`mappings.${index}.fieldType`)}
                className="form-input"
              >
                {fieldTypes.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="form-label">Default Value</label>
              <input
                type="text"
                {...control.register(`mappings.${index}.defaultValue`)}
                className="form-input"
                placeholder="Optional"
              />
            </div>

            <div className="col-span-1 flex items-center space-x-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...control.register(`mappings.${index}.isRequired`)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">Required</label>
              </div>
            </div>

            <div className="col-span-1 flex justify-end">
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="p-2 text-red-600 hover:text-red-800"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={addMapping}
            className="btn-outline"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Mapping
          </button>
          
          <button
            type="button"
            onClick={() => refetchCrmFields()}
            className="btn-outline"
            disabled={crmFields?.fields?.length > 0}
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh CRM Fields
          </button>
        </div>

        <div className="flex space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn-outline"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className="btn-primary"
            disabled={createMutation.isLoading}
          >
            {createMutation.isLoading ? 'Saving...' : 'Save Mappings'}
          </button>
        </div>
      </div>
    </form>
  );
}