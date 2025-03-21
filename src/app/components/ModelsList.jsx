'use client';

import { useState, useEffect } from 'react';
import { Cube, RefreshCw, AlertCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatFileSize } from '../lib/utils';

const ModelsList = ({ onSelectModel }) => {
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchModels = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(
        'https://tinker.0xretro.dev/MeshifAI/api/generateModel.php?action=list'
      );
      
      if (response.data.success) {
        setModels(response.data.models || []);
      } else {
        throw new Error(response.data.error || 'Failed to fetch models');
      }
    } catch (error) {
      console.error('Fetch models error:', error);
      setError('Failed to load models: ' + (error.response?.data?.error || error.message));
      toast.error('Failed to load models');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Your 3D Models</h2>
        <button
          onClick={fetchModels}
          disabled={isLoading}
          className="flex items-center p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {isLoading && models.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-gray-500">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
          <p>Loading models...</p>
        </div>
      ) : models.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-gray-500">
          <Cube className="h-16 w-16 mb-4" />
          <p className="text-lg mb-2">No models found</p>
          <p className="text-sm text-center max-w-md">
            Upload an image and generate your first 3D model to see it here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => (
            <div 
              key={model.filename}
              className="border border-gray-200 rounded-md overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectModel(model)}
            >
              <div className="bg-gray-100 h-32 flex items-center justify-center">
                <Cube className="h-16 w-16 text-gray-400" />
              </div>
              <div className="p-3">
                <h3 className="font-medium text-gray-900 truncate" title={model.filename}>
                  {model.filename}
                </h3>
                <div className="mt-1 flex justify-between text-sm text-gray-500">
                  <span>{formatFileSize(model.size)}</span>
                  <span>{formatDate(model.created)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModelsList;