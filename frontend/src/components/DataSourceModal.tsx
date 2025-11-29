import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import { DataSource } from '../types';

interface DataSourceModalProps {
  dataSource?: DataSource | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  type: 'api' | 'database' | 'file' | 'stream';
  connector: string;
  credentials: {
    apiKey?: string;
    username?: string;
    password?: string;
    connectionString?: string;
    [key: string]: any;
  };
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  enabled: boolean;
}

const DataSourceModal: React.FC<DataSourceModalProps> = ({
  dataSource,
  onClose,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      type: 'api',
      connector: '',
      credentials: {},
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
      },
      enabled: true,
    },
  });

  const selectedType = watch('type');

  useEffect(() => {
    if (dataSource) {
      reset({
        name: dataSource.name,
        type: dataSource.type,
        connector: dataSource.connector,
        credentials: dataSource.credentials,
        rateLimit: dataSource.rateLimit,
        enabled: dataSource.enabled,
      });
    }
  }, [dataSource, reset]);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      if (dataSource) {
        await apiService.updateDataSource(dataSource.id, data);
        toast.success('Data source updated successfully');
      } else {
        await apiService.createDataSource(data);
        toast.success('Data source created successfully');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save data source');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCredentialFields = () => {
    switch (selectedType) {
      case 'api':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                {...register('credentials.apiKey')}
                className="input"
                placeholder="Enter API key"
              />
            </div>
          </>
        );
      case 'database':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                {...register('credentials.username')}
                className="input"
                placeholder="Database username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('credentials.password')}
                  className="input pr-10"
                  placeholder="Database password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <XMarkIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Connection String
              </label>
              <input
                type="text"
                {...register('credentials.connectionString')}
                className="input"
                placeholder="Database connection string"
              />
            </div>
          </>
        );
      case 'file':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File Path
              </label>
              <input
                type="text"
                {...register('credentials.filePath')}
                className="input"
                placeholder="Path to file"
              />
            </div>
          </>
        );
      case 'stream':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stream URL
              </label>
              <input
                type="text"
                {...register('credentials.streamUrl')}
                className="input"
                placeholder="Stream endpoint URL"
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {dataSource ? 'Edit Data Source' : 'Add Data Source'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              {...register('name', { required: 'Name is required' })}
              className={`input ${errors.name ? 'border-red-500' : ''}`}
              placeholder="Enter data source name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type *
            </label>
            <select
              {...register('type', { required: 'Type is required' })}
              className={`input ${errors.type ? 'border-red-500' : ''}`}
            >
              <option value="api">API</option>
              <option value="database">Database</option>
              <option value="file">File</option>
              <option value="stream">Stream</option>
            </select>
            {errors.type && (
              <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Connector *
            </label>
            <input
              type="text"
              {...register('connector', { required: 'Connector is required' })}
              className={`input ${errors.connector ? 'border-red-500' : ''}`}
              placeholder="e.g., PostgreSQL, REST API, S3"
            />
            {errors.connector && (
              <p className="mt-1 text-sm text-red-600">{errors.connector.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Credentials
            </label>
            <div className="space-y-3">
              {renderCredentialFields()}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rate Limits
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Per Minute</label>
                <input
                  type="number"
                  {...register('rateLimit.requestsPerMinute', { valueAsNumber: true })}
                  className="input"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Per Hour</label>
                <input
                  type="number"
                  {...register('rateLimit.requestsPerHour', { valueAsNumber: true })}
                  className="input"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Per Day</label>
                <input
                  type="number"
                  {...register('rateLimit.requestsPerDay', { valueAsNumber: true })}
                  className="input"
                  min="1"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              {...register('enabled')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">
              Enable this data source
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {dataSource ? 'Updating...' : 'Creating...'}
                </div>
              ) : (
                dataSource ? 'Update' : 'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DataSourceModal;