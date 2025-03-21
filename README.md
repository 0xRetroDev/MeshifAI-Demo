# MeshifAI - Image to 3D Model Converter

## Overview

MeshifAI is a web application that transforms 2D images into detailed 3D models using Tencent's **HunYuan3D-2** AI model. This project demonstrates the capabilities of modern AI-powered 3D conversion technology in a user-friendly interface.

**Live Demo:** [MeshifAI Demo](https://meshifai.example.com)

![image](https://github.com/user-attachments/assets/5bd9e4b4-b3dc-4dbe-8765-ca619bfefe14)

## Features

- **Easy Image Upload** - Upload any image up to 10MB (JPEG, JPG, PNG,)
- **Customizable Generation Settings**:
  - Model Quality Control (steps)
  - Guidance Scale for creative vs precise outputs
  - Background Removal
  - Resolution Selection
  - Optional text captions for improved results
- **3D Model Viewer** with:
  - Auto-rotation
  - Grid Toggle
  - Download Capability
- **Gallery of Generated Models** - Browse, filter, and reuse previously generated models

## Technology

The application is built with:

- **Frontend**: Next.js & React with basic CSS
- **3D Rendering**: Three.js for browser-based model viewing
- **Backend**: PHP API that interfaces with Tencent's HunYuan3D-2 model
- **Authentication**: Simple API key system for demo access control

## How it Works

MeshifAI transforms 2D images into 3D models through this process:

1. **Upload** - User uploads an image to the server
2. **Configure** - User adjusts generation parameters
3. **Generate** - The application sends the image to Tencent's HunYuan3D-2 API
4. **Process** - The AI analyzes the image and creates a detailed 3D mesh
5. **View & Download** - The resulting 3D model is displayed in the browser and available for download

## API Usage

The MeshifAI demo uses a simple API key system for access control. To generate models:

1. Enter the API key in the settings panel
2. Configure your generation settings
3. Click "Generate 3D Model"

For demo access, feel free to reach out to me on my [website](https://0xretro.dev)

## Credits

- 3D Model Generation: [Tencent HunYuan3D-2](https://hunyuan.tencent.com/)
- SVG Illustrations: Custom designed for MeshifAI
- UI Design: Custom implementation inspired by modern design systems

## Project Purpose

This project was created as a demonstration of the capabilities of Tencent's HunYuan3D-2 image-to-3D model technology. It showcases how AI can be used to quickly generate 3D assets from simple 2D images, which has applications in:

- Game development
- Architectural visualization
- E-commerce product displays
- Educational tools
- AR/VR content creation

## License

This project is for demonstration purposes only. The HunYuan3D-2 model is owned by Tencent and subject to their terms of service.
