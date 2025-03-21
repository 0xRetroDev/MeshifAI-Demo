'use client';

import { useState, useEffect } from 'react';
import { Wallet, Cube, Sparkles } from 'lucide-react';
import ImageUploader from './components/ImageUploader';
import ModelSettings from './components/ModelSettings';
import ModelViewer from './components/ModelViewer';
import ModelGallery from './components/ModelGallery';
import { Toaster } from 'react-hot-toast';

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [generatedModel, setGeneratedModel] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'gallery'
  const [animateHeader, setAnimateHeader] = useState(false);

  // Load default model on initial render
  useEffect(() => {
    setAnimateHeader(true);
    
    // Set the example duck model as default
    setGeneratedModel({
      url: 'https://tinker.0xretro.dev/MeshifAI/ExampleModels/Rubber_Duck_textured.glb',
      filename: 'Rubber_Duck_textured.glb',
      created: new Date().toISOString()
    });
  }, []);

  const handleSignIn = () => {
    // This is purely for the demo
    alert('This is a fake button for the demo');
  };

  const handleImageUploaded = (imageData) => {
    setUploadedImage(imageData);
    // Reset generated model when a new image is uploaded
    if (generatedModel && generatedModel.url !== 'https://tinker.0xretro.dev/MeshifAI/ExampleModels/Rubber_Duck_textured.glb') {
      setGeneratedModel(null);
    }
  };
  
  const handleSelectModel = (model) => {
    setGeneratedModel(model);
    setActiveTab('create'); // Switch to create tab to show the model
  };

  return (
    <div className="min-h-screen">
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-light)',
            borderRadius: '0.75rem',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-md)',
          },
        }} 
      />
      
      {/* Enhanced Navbar */}
      <nav className="navbar">
        <div className="logo-container">
          <div className="logo-square">
            <div className="logo-inner"></div>
          </div>
          <h1 className="logo-text">MeshifAI</h1>
        </div>
        
        <button onClick={handleSignIn} className="auth-button">
          <Wallet size={18} />
          Sign in
        </button>
      </nav>
      
      <main className="main-content container">
        {/* Enhanced Header with Animation */}
        <header className={`header ${animateHeader ? 'animate-header' : ''}`} style={{
          animation: animateHeader ? 'fadeIn 0.8s ease-out forwards' : 'none',
          opacity: animateHeader ? 1 : 0
        }}>
          <h1>Transform images into 3D models</h1>
          <p>Transform any image into a detailed 3D model with MeshifAI</p>
        </header>

        {/* Custom tab buttons */}
        <div className="tab-container">
          <div className="tabs-list">
            <button
              onClick={() => setActiveTab('create')}
              className={`tab-trigger ${activeTab === 'create' ? 'active' : ''}`}
            >
              Create Model
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              className={`tab-trigger ${activeTab === 'gallery' ? 'active' : ''}`}
            >
              Model Gallery
            </button>
          </div>
        </div>

        {activeTab === 'create' ? (
          <div className="grid">
            {/* Left column */}
            <div className="space-y-4">
              <ImageUploader 
                onImageUploaded={handleImageUploaded} 
                disabled={isGenerating}
              />
              
              {uploadedImage && (
                <ModelSettings 
                  uploadedImage={uploadedImage}
                  onModelGenerated={setGeneratedModel}
                  onGeneratingChange={setIsGenerating}
                  isGenerating={isGenerating}
                />
              )}
            </div>
            
            {/* Right column - Model Viewer with enhanced container */}
            <div style={{ height: '500px', position: 'relative' }}>
              <div className="viewer-container">
                {generatedModel ? (
                  <ModelViewer 
                    model={generatedModel} 
                    onClose={() => {}} // Empty function since this isn't a modal
                  />
                ) : (
                  <div className="model-placeholder">
                    <div className="status-messages">
                      {uploadedImage ? (
                        <>
                          <h3 className="status-title">Image uploaded successfully</h3>
                          <p className="status-description">Configure and generate your 3D model</p>
                        </>
                      ) : (
                        <>
                          <h3 className="status-title">No image uploaded</h3>
                          <p className="status-description">Upload an image to get started or browse existing models</p>
                        </>
                      )}
                    </div>
                    <div className="model-grid"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <ModelGallery onSelectModel={handleSelectModel} />
        )}
      </main>
      
      {/* Enhanced Modal Overlay */}
      {isGenerating && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="loading-spinner"></div>
            <h2 className="modal-title">Generating 3D Model</h2>
            <p className="modal-description">This might take a minute or two. We're transforming your image into a detailed 3D model.</p>
          </div>
        </div>
      )}
      
      <footer className="footer">
        <p>&copy; 2025 Meshifai. All rights reserved.</p>
      </footer>
    </div>
  );
}