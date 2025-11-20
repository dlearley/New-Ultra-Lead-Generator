import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { territoryStore } from '@/stores/territoryStore';

interface AlertFormProps {
  onSubmit: (data: any) => Promise<void>;
}

export const AlertForm: React.FC<AlertFormProps> = ({ onSubmit }) => {
  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      name: '',
      description: '',
      territoryId: '',
      cadence: 'daily',
      deliveryChannels: ['email'],
    },
  });

  const { territories } = territoryStore();
  const [isLoading, setIsLoading] = useState(false);

  const onSubmitForm = async (data: any) => {
    setIsLoading(true);
    try {
      // Mock saved search for demo
      const payload = {
        ...data,
        savedSearch: {
          id: 'search-' + Math.random().toString(36).substr(2, 9),
          name: 'Default Search',
          criteria: {},
        },
        deliveryChannels: ['email', 'in_app'],
      };
      await onSubmit(payload);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="alert-form">
      <div className="form-group">
        <label htmlFor="name">Alert Name</label>
        <input
          id="name"
          type="text"
          {...register('name', { required: true })}
          placeholder="Enter alert name"
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          {...register('description')}
          placeholder="Enter alert description"
        />
      </div>

      <div className="form-group">
        <label htmlFor="territoryId">Territory</label>
        <select id="territoryId" {...register('territoryId', { required: true })}>
          <option value="">Select a territory</option>
          {territories.map((territory: any) => (
            <option key={territory.id} value={territory.id}>
              {territory.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="cadence">Cadence</label>
        <select id="cadence" {...register('cadence')}>
          <option value="real_time">Real-time</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn btn-primary"
      >
        {isLoading ? 'Creating...' : 'Create Alert'}
      </button>
    </form>
  );
};
