'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { FieldMappingForm } from '@/components/field-mappings/FieldMappingForm';
import { FieldMappingList } from '@/components/field-mappings/FieldMappingList';
import { getCrmTypes } from '@/lib/api';

export default function FieldMappingsPage() {
  const [selectedCrmType, setSelectedCrmType] = useState<string>('SALESFORCE');
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: crmTypes } = useQuery('crmTypes', getCrmTypes);

  const handleCreateMapping = () => {
    setShowForm(true);
  };

  const handleMappingSaved = () => {
    setShowForm(false);
    queryClient.invalidateQueries(['fieldMappings', selectedCrmType]);
    toast.success('Field mappings saved successfully!');
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Field Mappings</h1>
          <p className="mt-1 text-sm text-gray-600">
            Map your business lead fields to CRM fields for accurate data synchronization
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* CRM Type Selector */}
          <select
            value={selectedCrmType}
            onChange={(e) => setSelectedCrmType(e.target.value)}
            className="form-input"
          >
            {crmTypes?.map((type: string) => (
              <option key={type} value={type}>
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </option>
            ))}
          </select>

          <button
            onClick={handleCreateMapping}
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Mapping
          </button>
        </div>
      </div>

      {/* Field Mapping Form */}
      {showForm && (
        <div className="card mb-6 animate-fade-in">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">
              Configure Field Mappings for {selectedCrmType}
            </h3>
          </div>
          <div className="card-body">
            <FieldMappingForm
              crmType={selectedCrmType as any}
              onSave={handleMappingSaved}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Field Mappings List */}
      <FieldMappingList crmType={selectedCrmType as any} />
    </div>
  );
}