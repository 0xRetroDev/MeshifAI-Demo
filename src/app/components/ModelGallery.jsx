'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Box, RefreshCw, Filter, Download, Search, ChevronDown, X, Calendar, Database, SortAsc, SortDesc, ZoomIn, ZoomOut, RotateCw, Layers, Maximize2 } from 'lucide-react';
import { formatFileSize } from '../lib/utils';

// Enhanced model card with better 3D preview
function ModelCard({ model, onSelect, index }) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const frameRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hovered, setHovered] = useState(false);

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Get shortened filename for display
  const getShortFilename = (filename) => {
    // Show first 8 characters, then ... and the extension if present
    const nameParts = filename.split('.');
    if (nameParts.length > 1) {
      const ext = nameParts.pop();
      const baseName = nameParts.join('.');
      if (baseName.length > 8) {
        return `${baseName.substring(0, 8)}...${ext}`;
      }
      return `${baseName}.${ext}`;
    } else if (filename.length > 10) {
      return `${filename.substring(0, 8)}...`;
    }
    return filename;
  };

  // Initialize the 3D scene
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Animation delay based on index for staggered effect
    const delay = index * 100; 
    setTimeout(() => {
      setupScene();
    }, delay);

    function setupScene() {
      // Get the canvas element
      const canvas = canvasRef.current;
      
      // Create scene, camera, and renderer
      const scene = new THREE.Scene();
      sceneRef.current = scene;
      
      // Create a subtle gradient background
      const bgColor1 = new THREE.Color('#0f172a');
      const bgColor2 = new THREE.Color('#070d1e');
      
      const bgTexture = new THREE.CanvasTexture(createGradientBackground(bgColor1, bgColor2));
      scene.background = bgTexture;
      
      // Add ambient and directional lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
      directionalLight.position.set(5, 10, 7.5);
      directionalLight.castShadow = true;
      scene.add(directionalLight);
      
      // Add a subtle rim light for better definition
      const rimLight = new THREE.DirectionalLight(0x4f46e5, 0.8);
      rimLight.position.set(-5, 5, -5);
      scene.add(rimLight);
      
      // Camera setup
      const aspect = canvas.clientWidth / canvas.clientHeight;
      const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
      camera.position.set(0, 0, 8);
      
      // Renderer with antialiasing and correct pixel ratio
      const renderer = new THREE.WebGLRenderer({ 
        canvas, 
        antialias: true,
        alpha: true
      });
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      // For newer versions of Three.js, use outputColorSpace instead of outputEncoding
      // renderer.outputColorSpace = THREE.SRGBColorSpace;
      // For older versions, use outputEncoding
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;
      
      // Set up orbit controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.rotateSpeed = 0.8;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 3;
      controlsRef.current = controls;
      
      // Handle initial loading state
      setIsLoading(true);
      
      // Add placeholder geometry while model loads
      const placeholderGroup = new THREE.Group();
      
      const geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x4f46e5,
        transparent: true, 
        opacity: 0.8 
      });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      
      // Add a filled cube inside the wireframe
      const cubeMaterial = new THREE.MeshPhongMaterial({
        color: 0x4f46e5,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
      });
      const cube = new THREE.Mesh(geometry, cubeMaterial);
      
      placeholderGroup.add(wireframe);
      placeholderGroup.add(cube);
      scene.add(placeholderGroup);
      
      // Animate the placeholder
      const animatePlaceholder = () => {
        if (isLoading && placeholderGroup) {
          placeholderGroup.rotation.x += 0.01;
          placeholderGroup.rotation.y += 0.01;
        }
      };
      
      // Load the actual model if available
      if (model.url) {
        const loader = new GLTFLoader();
        loader.load(
          model.url,
          (gltf) => {
            // Remove the placeholder
            scene.remove(placeholderGroup);
            
            // Add the loaded model
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
            
            loadedModel.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Enhance materials
                if (child.material) {
                  child.material.needsUpdate = true;
                  if (model.filename.includes('white')) {
                    // For white models, add some subtle environment reflections
                    child.material.envMapIntensity = 0.5;
                  }
                }
              }
            });
            
            scene.add(loadedModel);
            setIsLoading(false);
          },
          (progress) => {
            // Loading progress if needed
          },
          (err) => {
            console.error('Error loading model:', err);
            setError(err);
            setIsLoading(false);
          }
        );
      }
      
      // Animation loop
      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        
        // Animate placeholder if model is still loading
        animatePlaceholder();
        
        // Update controls
        if (controlsRef.current) {
          controlsRef.current.update();
        }
        
        // Render the scene
        if (rendererRef.current && sceneRef.current) {
          rendererRef.current.render(scene, camera);
        }
      };
      
      animate();
    }
    
    // Create a gradient canvas background
    function createGradientBackground(colorTop, colorBottom) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      
      const context = canvas.getContext('2d');
      const gradient = context.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, colorTop.getStyle());
      gradient.addColorStop(1, colorBottom.getStyle());
      
      context.fillStyle = gradient;
      context.fillRect(0, 0, 256, 256);
      
      return canvas;
    }
    
    // Cleanup
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      
      if (sceneRef.current) {
        // Dispose of all geometries and materials
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
  }, [model.url, index]);

  // Handle window resize to maintain aspect ratio
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && rendererRef.current) {
        const canvas = canvasRef.current;
        const renderer = rendererRef.current;
        
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        
        const camera = controlsRef.current.object;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        
        renderer.setSize(width, height);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Control autorotation based on hover state
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = !hovered;
    }
  }, [hovered]);

  return (
    <div 
      className={`model-card ${hovered ? 'hovered' : ''}`}
      onClick={() => onSelect(model)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        animationDelay: `${index * 100}ms`
      }}
    >
      <div className="model-thumbnail">
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
        
        {isLoading && (
          <div className="model-loading-indicator">
            <div className="model-spinner"></div>
          </div>
        )}
        
        {error && (
          <div className="model-error">
            <X size={24} />
          </div>
        )}
        
        {model.filename.includes('textured') ? (
          <div className="model-badge">Textured</div>
        ) : model.filename.includes('white') ? (
          <div className="model-badge white">White</div>
        ) : null}
      </div>
      
      <div className="model-info">
        <div className="model-name" title={model.filename}>
          {getShortFilename(model.filename)}
        </div>
        <div className="model-meta">
          <span className="model-size">{formatFileSize(model.size)}</span>
          <span className="model-date">{formatDate(model.created)}</span>
        </div>
      </div>
    </div>
  );
}

// ModelViewerModal component for dedicated gallery model viewing
function ModelViewerModal({ model, onClose }) {
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
  const [zoom, setZoom] = useState(4);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

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
      const bgColor1 = new THREE.Color('#0f172a');
      const bgColor2 = new THREE.Color('#070d1e');
      
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
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
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
      
      renderer.setSize(width + 500, height + 500);
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
            } else if (model.filename.includes('textured')) {
                // For textured models, brighten them up
                child.material.emissive = new THREE.Color(0x333333);
                child.material.emissiveIntensity = 0.2;
                child.material.needsUpdate = true;
              }
            }
          });
          
          scene.add(loadedModel);
          setIsLoading(false);
        },
        (progress) => {
          // You could add progress reporting here
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
    
    // Set small timeout to ensure the modal is rendered and positioned
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

  // Handle keyboard shortcuts
  useEffect(() => {
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
  }, [zoom]);

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="model-viewer-modal"
        onClick={e => e.stopPropagation()}  
      >
        <div className="modal-header">
          <div className="modal-title-container">
            <div className="modal-meta">
            </div>
          </div>
          
          <button 
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>
        
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
          </div>
        </div>
      </div>
    </div>
  );
}

// Main ModelGallery component
function ModelGallery({ onSelectModel }) {
  const [models, setModels] = useState([]);
  const [filteredModels, setFilteredModels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'textured', 'white'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'size', 'name'
  const [sortDirection, setSortDirection] = useState('desc');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null); // For modal viewer
  
  const searchInputRef = useRef(null);

  // Fetch models on initial load
  useEffect(() => {
    fetchModels();
  }, []);

  // Apply filters and sorting whenever data or filters change
  useEffect(() => {
    if (!models.length) return;
    
    let filtered = [...models];
    
    // Apply type filter
    if (filter === 'textured') {
      filtered = filtered.filter(model => model.filename.includes('textured'));
    } else if (filter === 'white') {
      filtered = filtered.filter(model => model.filename.includes('white'));
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(model => 
        model.filename.toLowerCase().includes(

            model.filename.toLowerCase().includes(query)
      ));
    }
    
    // Apply sorting
    filtered = sortModels(filtered, sortBy, sortDirection);
    
    setFilteredModels(filtered);
  }, [models, filter, searchQuery, sortBy, sortDirection]);

  // Sort models based on current criteria
  const sortModels = (models, sortBy, direction) => {
    return [...models].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'newest':
          comparison = new Date(b.created) - new Date(a.created);
          break;
        case 'oldest':
          comparison = new Date(a.created) - new Date(b.created);
          break;
        case 'size':
          comparison = b.size - a.size;
          break;
        case 'name':
          comparison = a.filename.localeCompare(b.filename);
          break;
        default:
          comparison = new Date(b.created) - new Date(a.created);
      }
      
      return direction === 'asc' ? -comparison : comparison;
    });
  };

  // Fetch models from the API
  const fetchModels = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(
        'https://tinker.0xretro.dev/MeshifAI/api/generateModel.php?action=list'
      );
      
      if (response.data.success) {
        const modelData = response.data.models || [];
        setModels(modelData);
        setFilteredModels(sortModels(modelData, sortBy, sortDirection));
        
        // Show success message if models were loaded
        if (modelData.length > 0) {
            // Remove this toast for the time being because it's ugly
         //  toast.success(`Loaded ${modelData.length} models`);
        }
      } else {
        throw new Error(response.data.error || 'Failed to fetch models');
      }
    } catch (error) {
      console.error('Fetch models error:', error);
      setError('Failed to load models. Please try again.');
      toast.error('Failed to load models');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  // Get the appropriate sort icon
  const getSortIcon = () => {
    return sortDirection === 'desc' ? (
      <SortDesc size={16} className="sort-icon" />
    ) : (
      <SortAsc size={16} className="sort-icon" />
    );
  };

  // Handle search input
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Clear search input
  const clearSearch = () => {
    setSearchQuery('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Toggle filter dropdown
  const toggleFilterDropdown = () => {
    setIsFilterOpen(prev => !prev);
  };

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const filterElement = document.getElementById('filter-dropdown');
      if (filterElement && !filterElement.contains(event.target) && 
          !event.target.classList.contains('filter-toggle')) {
        setIsFilterOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Refresh models with animation
  const handleRefresh = () => {
    // Add rotation animation to the refresh icon
    const refreshIcon = document.querySelector('.refresh-icon');
    if (refreshIcon) {
      refreshIcon.classList.add('refreshing');
      setTimeout(() => {
        refreshIcon.classList.remove('refreshing');
      }, 1000);
    }
    
    fetchModels();
  };

  // Handle model selection and modal display
  const handleModelSelect = (model) => {
    setSelectedModel(model);
    // Don't call the parent onSelectModel yet - wait until user confirms in modal
  };

  // Close modal and optionally select the model for the main viewer
  const handleCloseModal = (selectForMainViewer = false) => {
    if (selectForMainViewer && selectedModel) {
      onSelectModel(selectedModel);
    }
    setSelectedModel(null);
  };

  return (
    <div className="model-gallery-container">
      <div className="gallery-header">
        
        <div className="gallery-actions">
          
          {/* Refresh button */}
          <button 
            onClick={handleRefresh}
            disabled={isLoading}
            className="refresh-btn"
            aria-label="Refresh models"
          >
            <RefreshCw size={16} className="refresh-icon" />
            <span className="sm-hidden">Refresh</span>
          </button>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="error-message">
          <X size={20} />
          <p>{error}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && filteredModels.length === 0 ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your 3D models...</p>
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="empty-state">
          <Box size={48} color="var(--primary)" strokeWidth={1.5} />
          <h3>No models found</h3>
          {searchQuery ? (
            <p>No results match your search. Try different keywords or clear the search.</p>
          ) : filter !== 'all' ? (
            <p>No {filter} models found. Try a different filter or create a new model.</p>
          ) : (
            <p>Upload an image and generate your first 3D model to see it here.</p>
          )}
        </div>
      ) : (
        <>
          {/* Models count */}
          <div className="models-count">
            Showing {filteredModels.length} {filteredModels.length === 1 ? 'model' : 'models'}
            {filter !== 'all' && ` (filter: ${filter})`}
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
          
          {/* Models grid */}
          <div className="models-grid">
            {filteredModels.map((model, index) => (
              <ModelCard 
                key={model.filename} 
                model={model} 
                onSelect={handleModelSelect}
                index={index}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal viewer */}
      {selectedModel && (
        <ModelViewerModal 
          model={selectedModel} 
          onClose={() => handleCloseModal(false)}
        />
      )}
    </div>
  );
}

export default ModelGallery;