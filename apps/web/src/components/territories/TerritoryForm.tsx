import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

interface TerritoryFormProps {
  onSubmit: (data: any) => Promise<void>;
}

export const TerritoryForm: React.FC<TerritoryFormProps> = ({ onSubmit }) => {
  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      name: '',
      type: 'polygon',
      stateCode: '',
      countyCode: '',
    },
  });

  const territoryType = watch('type');
  const [isLoading, setIsLoading] = useState(false);

  const onSubmitForm = async (data: any) => {
    setIsLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="territory-form">
      <div className="form-group">
        <label htmlFor="name">Territory Name</label>
        <input
          id="name"
          type="text"
          {...register('name', { required: true })}
          placeholder="Enter territory name"
        />
      </div>

      <div className="form-group">
        <label htmlFor="type">Territory Type</label>
        <select id="type" {...register('type')}>
          <option value="polygon">Polygon</option>
          <option value="radius">Radius</option>
          <option value="state">State</option>
          <option value="county">County</option>
        </select>
      </div>

      {territoryType === 'state' && (
        <div className="form-group">
          <label htmlFor="stateCode">State Code</label>
          <input
            id="stateCode"
            type="text"
            {...register('stateCode')}
            placeholder="e.g., CA, NY"
          />
        </div>
      )}

      {territoryType === 'county' && (
        <div className="form-group">
          <label htmlFor="countyCode">County Code</label>
          <input
            id="countyCode"
            type="text"
            {...register('countyCode')}
            placeholder="Enter county code"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="btn btn-primary"
      >
        {isLoading ? 'Creating...' : 'Create Territory'}
      </button>
    </form>
  );
};
