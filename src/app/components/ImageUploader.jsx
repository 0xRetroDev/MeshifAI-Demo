'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatFileSize } from '../lib/utils';

const ImageUploader = ({ onImageUploaded, disabled = false }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const uploadImage = async (file) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      // First, check if the API is available with a preflight request
      try {
        await fetch('https://tinker.0xretro.dev/MeshifAI/api/upload.php', {
          method: 'OPTIONS',
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors',
        });
      } catch (preflightError) {
        console.warn('Preflight check failed:', preflightError);
        // Continue anyway, the actual request might still work
      }
      
      // Now make the actual upload request
      const response = await fetch(
        'https://tinker.0xretro.dev/MeshifAI/api/upload.php',
        {
          method: 'POST',
          body: formData,
          // Don't set Content-Type header - fetch will set it with the correct boundary
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors',
          credentials: 'omit', // Don't send cookies for cross-origin requests
        }
      );

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        const imageData = {
          url: URL.createObjectURL(file), // Local blob URL for preview
          serverUrl: data.url, // Server URL for API calls
          filename: data.filename,
          size: file.size,
          type: file.type,
          originalName: file.name
        };
        
        setPreviewImage({
          url: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
        });
        
        onImageUploaded(imageData);
        toast.success('Image uploaded successfully!');
      } else {
        toast.error(data.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      // More specific error handling
      if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
        toast.error('Network error: Could not connect to the server. Please check your internet connection.');
      } else {
        toast.error('Failed to upload image: ' + error.message);
      }
      
      // Try a fallback method if regular upload fails - simulating the upload for development
      if (process.env.NODE_ENV === 'development') {
        // Note: this is for development only - in production, we need a real server URL
        const mockServerUrl = "https://example.com/fake-upload-path/" + file.name;
        
        const mockImageData = {
          url: URL.createObjectURL(file), // Local preview URL
          serverUrl: mockServerUrl, // Fake server URL
          filename: file.name,
          size: file.size,
          type: file.type,
          originalName: file.name
        };
        
        setPreviewImage({
          url: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
        });
        
        onImageUploaded(mockImageData);
        toast.success('Using local preview (development mode)');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        if (file.type.startsWith('image/')) {
          uploadImage(file);
        } else {
          toast.error('Please upload an image file');
        }
      }
    },
    [onImageUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
    },
    maxFiles: 1,
    disabled: isUploading || disabled,
  });

  const clearImage = () => {
    setPreviewImage(null);
    onImageUploaded(null);
  };

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="card-title">
          <ImageIcon size={20} />
          Upload Image
        </h2>
        
        {!previewImage ? (
          <div
            {...getRootProps()}
            className={`upload-area ${isDragActive ? 'active' : ''} ${disabled || isUploading ? 'disabled' : ''}`}
            style={{ opacity: disabled || isUploading ? 0.6 : 1, cursor: disabled || isUploading ? 'not-allowed' : 'pointer' }}
          >
            <input {...getInputProps()} />
            <div className="upload-icon">
              <Upload size={24} color="var(--primary-color)" />
            </div>
            <p className="primary">
              {isDragActive ? 'Drop the image here' : 'Drag & drop an image, or click to browse'}
            </p>
            <p className="secondary">
              Supports JPEG, JPG, PNG (max 10MB)
            </p>
            {isUploading && (
              <div className="mt-4">
                <div className="spinner" style={{ margin: '0 auto' }}></div>
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Uploading...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="uploader-preview">
            <div className="uploader-img-container">
              <img
                src={previewImage.url}
                alt="Preview"
              />
            </div>
            <div className="uploader-details">
              <p className="uploader-filename">{previewImage.name}</p>
              <p className="uploader-filesize">{formatFileSize(previewImage.size)}</p>
              <div className="uploader-badge">
                Ready for conversion
              </div>
            </div>
            <button
              type="button"
              onClick={clearImage}
              disabled={disabled || isUploading}
              className="uploader-remove"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;