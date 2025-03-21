'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { X, Download, ZoomIn, ZoomOut, RotateCw, Layers, Maximize2 } from 'lucide-react';
import { formatFileSize } from '../lib/utils';

const ModelViewer = ({ model, onClose, isModal = false }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const frameRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(8);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [modelDetails, setModelDetails] = useState({
    filename: model?.filename || 'Unknown',
    size: model?.size || 0,
    created: model?.created || new Date().toISOString(),
  });

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Setup the scene
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current || !model?.url) return;

    const setupScene = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      
      // Create scene, camera, and renderer
      const scene = new THREE.Scene();
      sceneRef.current = scene;
      
      // Set a gradient background
      scene.background = new THREE.Color('#0f172a');
      
      // Add lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
      directionalLight.position.set(5, 10, 7.5);
      directionalLight.castShadow = true;
      
      // Enhance shadow settings
      if (directionalLight.shadow) {
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.bias = -0.0001;
      }
      
      scene.add(directionalLight);
      
      // Add a rim light for better definition
      const rimLight = new THREE.DirectionalLight(0x4f46e5, 0.8);
      rimLight.position.set(-5, 5, -5);
      scene.add(rimLight);
      
      // Add a soft fill light from below
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
      fillLight.position.set(0, -5, 0);
      scene.add(fillLight);
      
      // Camera setup with responsive aspect ratio
      const width = container.clientWidth;
      const height = container.clientHeight;
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 0, 8); 
      cameraRef.current = camera;
      
      // Create renderer with antialiasing and HDR
      const renderer = new THREE.WebGLRenderer({ 
        canvas,
        antialias: true,
        alpha: true,
      });
      
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      rendererRef.current = renderer;
      
      // Add ground grid
      if (showGrid) {
        const grid = new THREE.GridHelper(20, 20, 0x4f46e5, 0x334155);
        grid.position.y = -2;
        grid.material.opacity = 0.5;
        grid.material.transparent = true;
        scene.add(grid);
        
        // Add a ground plane that receives shadows
        const groundGeometry = new THREE.PlaneGeometry(40, 40);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
          color: 0x111827,
          roughness: 0.8,
          metalness: 0.2,
          transparent: true,
          opacity: 0.6
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -2;
        ground.receiveShadow = true;
        scene.add(ground);
      }
      
      // Add orbit controls with smooth damping
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.rotateSpeed = 0.8;
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 1.5;
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.minDistance = 2;
      controls.maxDistance = 20;
      controlsRef.current = controls;
      
      // Show loading indicator
      setIsLoading(true);
      
      // Load the 3D model
      const loader = new GLTFLoader();
      loader.load(
        model.url,
        (gltf) => {
          const loadedModel = gltf.scene;
          modelRef.current = loadedModel;
          
          // Center and scale the model
          const box = new THREE.Box3().setFromObject(loadedModel);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 4 / maxDim;
          loadedModel.scale.set(scale, scale, scale);
          
          loadedModel.position.x = -center.x * scale;
          loadedModel.position.y = -center.y * scale;
          loadedModel.position.z = -center.z * scale;
          
          // Setup materials and shadows
          loadedModel.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              
              // Enhance materials
              if (child.material) {
                child.material.needsUpdate = true;
                child.material.side = THREE.DoubleSide;
                
                // Add environment map for reflections
                if (model.filename.includes('white')) {
                  // For white models, add subtle environment reflections
                  child.material.metalness = 0.1;
                  child.material.roughness = 0.8;
                  child.material.envMapIntensity = 0.5;
                }
              }
            }
          });
          
          scene.add(loadedModel);
          setIsLoading(false);
        },
        (progress) => {
          // Progress reporting could be added here
        },
        (err) => {
          console.error('Error loading model:', err);
          setError('Failed to load 3D model');
          setIsLoading(false);
        }
      );
      
      // Animation loop
      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        
        // Update controls
        if (controlsRef.current) {
          controlsRef.current.update();
        }
        
        // Render the scene
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(scene, cameraRef.current);
        }
      };
      
      animate();
    };
    
    // Set small timeout to ensure the container is rendered and positioned
    const timeoutId = setTimeout(() => {
      setupScene();
    }, 100);
    
    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
        
        // Dispose of event listeners
        if (controlsRef.current) {
          controlsRef.current.dispose();
        }
      }
      
      if (sceneRef.current) {
        // Dispose of geometries and materials to prevent memory leaks
        sceneRef.current.traverse((object) => {
          if (object.geometry) {
            object.geometry.dispose();
          }
          
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
    };
  }, [model?.url, zoom, autoRotate, showGrid]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && rendererRef.current && cameraRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        // Update camera aspect ratio
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        
        // Update renderer size
        rendererRef.current.setSize(width, height);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle keyboard shortcuts (only when in modal mode)
  useEffect(() => {
    if (!isModal) return;
    
    const handleKeyDown = (e) => {
      // Close on escape key
      if (e.key === 'Escape') {
        onClose();
      }
      
      // Rotation toggle on 'r' key
      if (e.key === 'r' || e.key === 'R') {
        toggleAutoRotate();
      }
      
      // Grid toggle on 'g' key
      if (e.key === 'g' || e.key === 'G') {
        toggleGrid();
      }
      
      // Zoom in/out with + and -
      if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      }
      if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom, isModal, onClose]);

  // Handle download
  const downloadModel = () => {
    if (model?.url) {
      const link = document.createElement('a');
      link.href = model.url;
      link.download = model.filename || 'model.glb';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Handle zoom
  const handleZoomIn = () => {
    setZoom(prev => {
      const newZoom = Math.max(prev - 1, 2);
      if (cameraRef.current) {
        cameraRef.current.position.z = newZoom;
      }
      return newZoom;
    });
  };

  const handleZoomOut = () => {
    setZoom(prev => {
      const newZoom = Math.min(prev + 1, 10);
      if (cameraRef.current) {
        cameraRef.current.position.z = newZoom;
      }
      return newZoom;
    });
  };

  // Toggle auto-rotation
  const toggleAutoRotate = () => {
    setAutoRotate(prev => {
      if (controlsRef.current) {
        controlsRef.current.autoRotate = !prev;
      }
      return !prev;
    });
  };

  // Toggle grid
  const toggleGrid = () => {
    setShowGrid(prev => !prev);
  };

  // Reset view
  const resetView = () => {
    setZoom(4);
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 0, 4);
      cameraRef.current.lookAt(0, 0, 0);
    }
    
    setAutoRotate(true);
    if (controlsRef.current) {
      controlsRef.current.autoRotate = true;
      controlsRef.current.reset();
    }
    
    setShowGrid(true);
  };

  // Render different component based on whether it's in modal mode or inline mode
  if (isModal) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div 
          className="model-viewer-modal"
          onClick={e => e.stopPropagation()}  
        >
          {/* Close button for modal mode */}
          <button 
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
          
          <div 
            className="model-viewer-container" 
            ref={containerRef}
          >
            <canvas
              ref={canvasRef}
              className="model-canvas"
            />
            
            {isLoading && (
              <div className="loading-overlay">
                <div className="loading-spinner"></div>
                <p className="loading-text">Loading 3D model...</p>
              </div>
            )}
            
            {error && (
              <div className="error-overlay">
                <div className="error-icon">
                  <X size={32} />
                </div>
                <p className="error-text">{error}</p>
              </div>
            )}
            
            {/* Controls */}
            <div className="viewer-controls-container">
              <button
                onClick={downloadModel}
                className="control-button"
                title="Download model"
              >
                <Download size={20} />
              </button>
              <button
                onClick={toggleAutoRotate}
                className={`control-button ${autoRotate ? 'active' : ''}`}
                title={autoRotate ? 'Stop rotation' : 'Auto rotate'}
              >
                <RotateCw size={20} />
              </button>
              <button
                onClick={toggleGrid}
                className={`control-button ${showGrid ? 'active' : ''}`}
                title={showGrid ? 'Hide grid' : 'Show grid'}
              >
                <Layers size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Regular (non-modal) viewer
  return (
    <div 
      className="model-container" 
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    >
      <canvas
        ref={canvasRef}
        className="model-canvas"
        style={{ width: '100%', height: '100%' }}
      />
      
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading 3D model...</p>
        </div>
      )}
      
      {error && (
        <div className="error-overlay">
          <div className="error-icon">
            <X size={32} />
          </div>
          <p className="error-text">{error}</p>
        </div>
      )}
      
      {/* Controls */}
      <div className="viewer-controls-container">
        <button
          onClick={downloadModel}
          className="control-button"
          title="Download model"
        >
          <Download size={20} />
        </button>
        <button
          onClick={toggleAutoRotate}
          className={`control-button ${autoRotate ? 'active' : ''}`}
          title={autoRotate ? 'Stop rotation' : 'Auto rotate'}
        >
          <RotateCw size={20} />
        </button>
        <button
          onClick={toggleGrid}
          className={`control-button ${showGrid ? 'active' : ''}`}
          title={showGrid ? 'Hide grid' : 'Show grid'}
        >
          <Layers size={20} />
        </button>
      </div>
      
      {/* Optional model info overlay */}
      {model.isExample && (
        <div className="example-model-badge">
          Example Model - Upload an image to create your own
        </div>
      )}
    </div>
  );
};

export default ModelViewer;