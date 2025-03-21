'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Sliders, Play, RotateCcw, Settings2, Sparkles, Zap, Key } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { delay } from '../lib/utils';

const ModelSettings = ({ 
  uploadedImage, 
  onModelGenerated, 
  onGeneratingChange,
  isGenerating 
}) => {
  const [pollInterval, setPollInterval] = useState(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [predictionId, setPredictionId] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm({
    defaultValues: {
      steps: 30,
      guidance_scale: 5.5,
      check_box_rembg: true,
      octree_resolution: '256',
      caption: '',
      api_key: '',
    }
  });

  // Watch values for real-time display
  const stepsValue = watch('steps');
  const guidanceValue = watch('guidance_scale');
  const resolutionValue = watch('octree_resolution');
  const removeBackground = watch('check_box_rembg');
  const apiKey = watch('api_key');

  useEffect(() => {
    // Reset form when image changes
    if (uploadedImage) {
      reset();
    }
    
    return () => {
      // Clear polling interval when component unmounts
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [uploadedImage, reset, pollInterval]);

  const onSubmit = async (data) => {
    if (!uploadedImage) {
      toast.error('Please upload an image first');
      return;
    }
    
    if (!data.api_key) {
      setShowApiKey(true);
      toast.error('API key is required to generate models');
      return;
    }
  
    // Make sure we're using the server-side image URL, not a blob URL
    const imageUrl = uploadedImage.serverUrl || uploadedImage.url;
    
    // Check if it's a blob URL and show an error if it is
    if (imageUrl.startsWith('blob:')) {
      toast.error('Invalid image URL. Please ensure the image was properly uploaded to the server.');
      return;
    }
  
    try {
      onGeneratingChange(true);
      setGenerationProgress(5);
  
      // Create data object with fixed URLs
      const requestData = {
        image: imageUrl,
        model: "tencent/hunyuan3d-2", // Correct format for model name 
        steps: parseInt(data.steps),
        guidance_scale: parseFloat(data.guidance_scale),
        check_box_rembg: Boolean(data.check_box_rembg),
        octree_resolution: data.octree_resolution,
        caption: data.caption,
        seed: Math.floor(Math.random() * 1000000),
        api_key: data.api_key  // Include API key in the request
      };
      
      // Convert the data to a properly formatted JSON string
      const jsonString = JSON.stringify(requestData)
        .replace(/\\"/g, '"') // Remove escaped quotes
        .replace(/\\\//g, '/'); // Remove escaped slashes
      
      // Send the properly formatted JSON string with API key in header
      const response = await axios.post(
        'https://tinker.0xretro.dev/MeshifAI/api/generateModel.php?action=create',
        JSON.parse(jsonString), // Parse back to ensure proper format
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': data.api_key  // Include API key in header
          }
        }
      );
  
      if (response.data.id) {
        setPredictionId(response.data.id);
        setGenerationProgress(10);
        startPolling(response.data.id, data.api_key);
      } else {
        throw new Error(response.data.error || 'Failed to start generation');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate model: ' + (error.response?.data?.error || error.message));
      onGeneratingChange(false);
      setGenerationProgress(0);
    }
  };

  const startPolling = (id, apiKey) => {
    // Clear any existing polling
    if (pollInterval) {
      clearInterval(pollInterval);
    }

    // Start polling for status
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(
          `https://tinker.0xretro.dev/MeshifAI/api/generateModel.php?action=status&id=${id}`,
          {
            headers: {
              'X-API-Key': apiKey // Use API key in header for status checks too
            }
          }
        );

        const status = response.data.status;
        
        // Update progress based on status
        if (status === 'processing') {
          setGenerationProgress(prevProgress => 
            prevProgress < 90 ? prevProgress + 5 : prevProgress
          );
        } else if (status === 'succeeded') {
          clearInterval(interval);
          setPollInterval(null);
          setGenerationProgress(100);
          
          // Download the model files
          await downloadModelFiles(response.data.output, apiKey);
        } else if (status === 'failed') {
          clearInterval(interval);
          setPollInterval(null);
          throw new Error(response.data.error || 'Generation failed');
        }
      } catch (error) {
        clearInterval(interval);
        setPollInterval(null);
        console.error('Polling error:', error);
        toast.error('Error checking model status: ' + error.message);
        onGeneratingChange(false);
        setGenerationProgress(0);
      }
    }, 5000); // Poll every 5 seconds

    setPollInterval(interval);
  };

  const downloadModelFiles = async (output, apiKey) => {
    if (!output || !Array.isArray(output)) {
      throw new Error('No output files found');
    }
    
    try {
      // Extract URLs - prioritize textured models
      const texturedModels = output.filter(url => url.includes('textured_mesh.glb'));
      const allModels = output.filter(url => url.endsWith('.glb'));
      
      // Use textured models if available, otherwise use all models
      const urls = texturedModels.length > 0 ? texturedModels : allModels;
      
      if (urls.length === 0) {
        throw new Error('No GLB model files found in output');
      }
      
      // Create a request object with the URLs array
      const downloadRequest = { 
        urls
      };
      
      // Convert the data to a properly formatted JSON string
      const jsonString = JSON.stringify(downloadRequest)
        .replace(/\\"/g, '"')
        .replace(/\\\//g, '/');
      
      // Download the files with properly formatted URLs
      const response = await axios.post(
        'https://tinker.0xretro.dev/MeshifAI/api/generateModel.php?action=download',
        JSON.parse(jsonString)
      );
      
      if (response.data.success && response.data.downloaded.length > 0) {
        const modelData = response.data.downloaded[0];
        
        // Set the generated model
        onModelGenerated({
          id: predictionId,
          url: modelData.download_url,
          filename: modelData.filename,
          created: new Date().toISOString()
        });
        
        toast.success('3D model generated successfully!');
      } else {
        throw new Error('Failed to download model files');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download model: ' + error.message);
    } finally {
      onGeneratingChange(false);
      setGenerationProgress(0);
      setPredictionId(null);
    }
  };
  
  const cancelGeneration = async () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
    
    onGeneratingChange(false);
    setGenerationProgress(0);
    setPredictionId(null);
    toast.success('Generation cancelled');
  };

  const toggleApiKeyVisibility = () => {
    setShowApiKey(!showApiKey);
  };

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="card-title">
          <Settings2 size={20} />
          Model Settings
        </h2>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* API Key input field */}
            <div className="form-group">
              <label className="form-label">
                <Key size={16} />
                Access Key
              </label>
              <div className="api-key-container">
                <input
                  type={showApiKey ? "text" : "password"}
                  {...register('api_key', { required: true })}
                  placeholder="Enter your Access key"
                  className={`form-input ${errors.api_key ? 'input-error' : ''}`}
                  disabled={isGenerating}
                />
                <button 
                  type="button" 
                  className="toggle-visibility-btn"
                  onClick={toggleApiKeyVisibility}
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.api_key && (
                <p className="form-error">API key is required</p>
              )}
              <p className="form-description">Required to access the 3D model generation service</p>
            </div>
            
            <div className="form-group">
              <label className="form-label">
                <Sparkles size={16} />
                Caption (optional)
              </label>
              <input
                type="text"
                {...register('caption')}
                placeholder="Describe the object in the image"
                className="form-input"
                disabled={isGenerating}
              />
              <p className="form-description">Adding a detailed caption can improve the 3D model quality</p>
            </div>
            
            <div className="form-group range-container">
              <label className="form-label">
                <Zap size={16} />
                Steps: <span className="value">{stepsValue}</span>
              </label>
              
              <input
                type="range"
                min="20"
                max="50"
                step="1"
                {...register('steps', { valueAsNumber: true })}
                className="range-input"
                disabled={isGenerating}
              />
              <div className="form-hint">
                <span>Faster (20)</span>
                <span>Better Quality (50)</span>
              </div>
            </div>

            <div className="form-group range-container">
              <label className="form-label">
                <Sliders size={16} />
                Guidance Scale: <span className="value">{guidanceValue}</span>
              </label>
              
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                {...register('guidance_scale', { valueAsNumber: true })}
                className="range-input"
                disabled={isGenerating}
              />
              <div className="form-hint">
                <span>More Creative</span>
                <span>More Precise</span>
              </div>
            </div>
            
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <label className="switch">
                  <input
                    type="checkbox"
                    id="check_box_rembg"
                    {...register('check_box_rembg')}
                    disabled={isGenerating}
                  />
                  <span className="switch-slider"></span>
                </label>
                <label htmlFor="check_box_rembg" className="switch-label">
                  Remove Background
                </label>
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">
                Resolution: <span className="value">{resolutionValue}</span>
              </label>
              <select
                {...register('octree_resolution')}
                className="form-select"
                disabled={isGenerating}
              >
                <option value="256">Low (256)</option>
                <option value="384">Medium (384)</option>
                <option value="512">High (512)</option>
              </select>
              <p className="form-description">Higher resolution gives more detail but takes longer</p>
            </div>
            
            <button
              type="submit"
              className="button"
              disabled={!uploadedImage || isGenerating}
            >
              <Play size={20} />
              Generate 3D Model
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModelSettings;