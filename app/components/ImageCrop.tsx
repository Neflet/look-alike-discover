"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Crop, RotateCcw } from 'lucide-react';
import { cropImage, type CropArea } from '../../lib/image-crop';

interface ImageCropProps {
  imageFile: File;
  imageUrl: string;
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
}

type ActiveHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'move' | null;

export function ImageCrop({ imageFile, imageUrl, onCropComplete, onCancel }: ImageCropProps) {
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [activeHandle, setActiveHandle] = useState<ActiveHandle>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [startCrop, setStartCrop] = useState<CropArea | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    const updateDisplaySize = () => {
      if (imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect();
        setDisplaySize({ width: rect.width, height: rect.height });
      }
    };

    updateDisplaySize();
    window.addEventListener('resize', updateDisplaySize);
    return () => window.removeEventListener('resize', updateDisplaySize);
  }, [imageSize]);

  useEffect(() => {
    if (displaySize && imageSize && !cropArea) {
      // Set initial crop area to center 60% of image
      const scaleX = displaySize.width / imageSize.width;
      const scaleY = displaySize.height / imageSize.height;
      const initialX = displaySize.width * 0.2;
      const initialY = displaySize.height * 0.2;
      const initialWidth = displaySize.width * 0.6;
      const initialHeight = displaySize.height * 0.6;
      
      setCropArea({
        x: initialX / scaleX,
        y: initialY / scaleY,
        width: initialWidth / scaleX,
        height: initialHeight / scaleY,
      });
    }
  }, [displaySize, imageSize, cropArea]);

  // Get handle at point (in image coordinates)
  // Use larger hit area (6px in display coordinates = ~12px scaled)
  const getHandleAtPoint = (x: number, y: number, crop: CropArea, hitRadius: number = 6): ActiveHandle => {
    const scaleX = imageSize!.width / displaySize!.width;
    const scaleY = imageSize!.height / displaySize!.height;
    const hitRadiusScaled = hitRadius * Math.max(scaleX, scaleY);

    const left = crop.x;
    const right = crop.x + crop.width;
    const top = crop.y;
    const bottom = crop.y + crop.height;

    // Check corners first (more specific)
    if (Math.abs(x - left) < hitRadiusScaled && Math.abs(y - top) < hitRadiusScaled) return 'nw';
    if (Math.abs(x - right) < hitRadiusScaled && Math.abs(y - top) < hitRadiusScaled) return 'ne';
    if (Math.abs(x - left) < hitRadiusScaled && Math.abs(y - bottom) < hitRadiusScaled) return 'sw';
    if (Math.abs(x - right) < hitRadiusScaled && Math.abs(y - bottom) < hitRadiusScaled) return 'se';

    // Check edges
    if (Math.abs(x - left) < hitRadiusScaled && y >= top && y <= bottom) return 'w';
    if (Math.abs(x - right) < hitRadiusScaled && y >= top && y <= bottom) return 'e';
    if (Math.abs(y - top) < hitRadiusScaled && x >= left && x <= right) return 'n';
    if (Math.abs(y - bottom) < hitRadiusScaled && x >= left && x <= right) return 's';

    // Check if inside crop box
    if (x >= left && x <= right && y >= top && y <= bottom) return 'move';

    return null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!imageRef.current || !containerRef.current || !displaySize || !imageSize || !cropArea) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const imgRect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - imgRect.left;
    const y = e.clientY - imgRect.top;
    
    // Only allow interaction if click is on the image
    if (x < 0 || y < 0 || x > imgRect.width || y > imgRect.height) return;
    
    // Convert to original image coordinates
    const scaleX = imageSize.width / displaySize.width;
    const scaleY = imageSize.height / displaySize.height;
    const imgX = x * scaleX;
    const imgY = y * scaleY;
    
    // Check if clicking on handle or inside crop box
    const handle = getHandleAtPoint(imgX, imgY, cropArea);
    
    if (handle) {
      setActiveHandle(handle);
      setStartPos({ x: imgX, y: imgY });
      setStartCrop({ ...cropArea });
      
      // Capture pointer for smooth dragging (works on both desktop and mobile)
      if (e.currentTarget instanceof HTMLElement) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) {
          // Fallback if setPointerCapture fails
          console.warn('setPointerCapture failed:', err);
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeHandle || !startPos || !startCrop || !imageSize || !displaySize || !imageRef.current) return;
    
    e.preventDefault();
    
    const imgRect = imageRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(e.clientX - imgRect.left, imgRect.width));
    const currentY = Math.max(0, Math.min(e.clientY - imgRect.top, imgRect.height));
    
    // Convert to original image coordinates
    const scaleX = imageSize.width / displaySize.width;
    const scaleY = imageSize.height / displaySize.height;
    const imgX = currentX * scaleX;
    const imgY = currentY * scaleY;
    
    const deltaX = imgX - startPos.x;
    const deltaY = imgY - startPos.y;
    
    let newCrop: CropArea = { ...startCrop };
    
    if (activeHandle === 'move') {
      // Move the entire crop box
      newCrop.x = Math.max(0, Math.min(startCrop.x + deltaX, imageSize.width - startCrop.width));
      newCrop.y = Math.max(0, Math.min(startCrop.y + deltaY, imageSize.height - startCrop.height));
    } else {
      // Resize based on handle
      if (activeHandle.includes('w')) {
        const newX = Math.max(0, Math.min(startCrop.x + deltaX, startCrop.x + startCrop.width - 10));
        const newWidth = startCrop.width - (newX - startCrop.x);
        newCrop.x = newX;
        newCrop.width = newWidth;
      }
      if (activeHandle.includes('e')) {
        newCrop.width = Math.max(10, Math.min(startCrop.width + deltaX, imageSize.width - startCrop.x));
      }
      if (activeHandle.includes('n')) {
        const newY = Math.max(0, Math.min(startCrop.y + deltaY, startCrop.y + startCrop.height - 10));
        const newHeight = startCrop.height - (newY - startCrop.y);
        newCrop.y = newY;
        newCrop.height = newHeight;
      }
      if (activeHandle.includes('s')) {
        newCrop.height = Math.max(10, Math.min(startCrop.height + deltaY, imageSize.height - startCrop.y));
      }
      
      // Clamp to image bounds
      newCrop.x = Math.max(0, Math.min(newCrop.x, imageSize.width - newCrop.width));
      newCrop.y = Math.max(0, Math.min(newCrop.y, imageSize.height - newCrop.height));
      newCrop.width = Math.min(newCrop.width, imageSize.width - newCrop.x);
      newCrop.height = Math.min(newCrop.height, imageSize.height - newCrop.y);
    }
    
    setCropArea(newCrop);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeHandle && e.currentTarget instanceof HTMLElement) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setActiveHandle(null);
    setStartPos(null);
    setStartCrop(null);
  };

  const handleCrop = async () => {
    if (!cropArea || !imageSize) return;
    
    // Validate crop area
    if (cropArea.width < 10 || cropArea.height < 10) {
      alert('Crop area too small. Please select a larger area.');
      return;
    }
    
    try {
      const croppedFile = await cropImage(imageFile, cropArea);
      onCropComplete(croppedFile);
    } catch (error) {
      console.error('Crop error:', error);
      alert('Failed to crop image. Please try again.');
    }
  };

  const handleSearchFull = () => {
    onCropComplete(imageFile);
  };

  if (!imageSize) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading image...</div>
      </div>
    );
  }

  const getCursor = (): string => {
    if (!activeHandle) return 'default';
    switch (activeHandle) {
      case 'move': return 'move';
      case 'n':
      case 's': return 'ns-resize';
      case 'e':
      case 'w': return 'ew-resize';
      case 'ne':
      case 'sw': return 'nesw-resize';
      case 'nw':
      case 'se': return 'nwse-resize';
      default: return 'default';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Select Area to Search</h2>
          <p className="text-sm opacity-60">
            Drag to move or resize the selection box
          </p>
        </div>

        {/* Crop Container */}
        <div
          ref={containerRef}
          className="relative border-2 border-foreground/20 rounded-lg overflow-hidden bg-background crop-container"
          style={{ 
            cursor: getCursor(),
            maxHeight: '70vh',
            touchAction: 'none',
            userSelect: 'none',
          }}
        >
          <div className="relative inline-block">
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Crop preview"
              className="max-w-full max-h-[70vh] object-contain"
              draggable={false}
              style={{ touchAction: 'none', pointerEvents: 'auto' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
            
            {/* Crop Overlay */}
            {cropArea && cropArea.width > 0 && cropArea.height > 0 && displaySize && imageSize && (
              <>
                {/* Dark overlay covering entire image */}
                <div
                  className="absolute inset-0 pointer-events-none bg-black/50"
                  style={{
                    clipPath: `polygon(
                      0% 0%, 
                      0% 100%, 
                      ${(cropArea.x / imageSize.width) * 100}% 100%, 
                      ${(cropArea.x / imageSize.width) * 100}% ${(cropArea.y / imageSize.height) * 100}%, 
                      ${((cropArea.x + cropArea.width) / imageSize.width) * 100}% ${(cropArea.y / imageSize.height) * 100}%, 
                      ${((cropArea.x + cropArea.width) / imageSize.width) * 100}% ${((cropArea.y + cropArea.height) / imageSize.height) * 100}%, 
                      ${(cropArea.x / imageSize.width) * 100}% ${((cropArea.y + cropArea.height) / imageSize.height) * 100}%, 
                      ${(cropArea.x / imageSize.width) * 100}% 100%, 
                      100% 100%, 
                      100% 0%
                    )`,
                  }}
                />
                
                {/* Crop border with handles */}
                <div
                  className="absolute border-2 border-foreground"
                  style={{
                    left: `${(cropArea.x / imageSize.width) * 100}%`,
                    top: `${(cropArea.y / imageSize.height) * 100}%`,
                    width: `${(cropArea.width / imageSize.width) * 100}%`,
                    height: `${(cropArea.height / imageSize.height) * 100}%`,
                    pointerEvents: 'none',
                  }}
                >
                  {/* Corner handles - larger and more visible */}
                  <div 
                    className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-background border-2 border-foreground rounded-sm cursor-nwse-resize z-10"
                    style={{ pointerEvents: 'auto' }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const imgRect = imageRef.current!.getBoundingClientRect();
                      const x = e.clientX - imgRect.left;
                      const y = e.clientY - imgRect.top;
                      const scaleX = imageSize!.width / displaySize!.width;
                      const scaleY = imageSize!.height / displaySize!.height;
                      setActiveHandle('nw');
                      setStartPos({ x: x * scaleX, y: y * scaleY });
                      setStartCrop({ ...cropArea });
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                  />
                  <div 
                    className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-background border-2 border-foreground rounded-sm cursor-nesw-resize z-10"
                    style={{ pointerEvents: 'auto' }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const imgRect = imageRef.current!.getBoundingClientRect();
                      const x = e.clientX - imgRect.left;
                      const y = e.clientY - imgRect.top;
                      const scaleX = imageSize!.width / displaySize!.width;
                      const scaleY = imageSize!.height / displaySize!.height;
                      setActiveHandle('ne');
                      setStartPos({ x: x * scaleX, y: y * scaleY });
                      setStartCrop({ ...cropArea });
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                  />
                  <div 
                    className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-background border-2 border-foreground rounded-sm cursor-nesw-resize z-10"
                    style={{ pointerEvents: 'auto' }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const imgRect = imageRef.current!.getBoundingClientRect();
                      const x = e.clientX - imgRect.left;
                      const y = e.clientY - imgRect.top;
                      const scaleX = imageSize!.width / displaySize!.width;
                      const scaleY = imageSize!.height / displaySize!.height;
                      setActiveHandle('sw');
                      setStartPos({ x: x * scaleX, y: y * scaleY });
                      setStartCrop({ ...cropArea });
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                  />
                  <div 
                    className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-background border-2 border-foreground rounded-sm cursor-nwse-resize z-10"
                    style={{ pointerEvents: 'auto' }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const imgRect = imageRef.current!.getBoundingClientRect();
                      const x = e.clientX - imgRect.left;
                      const y = e.clientY - imgRect.top;
                      const scaleX = imageSize!.width / displaySize!.width;
                      const scaleY = imageSize!.height / displaySize!.height;
                      setActiveHandle('se');
                      setStartPos({ x: x * scaleX, y: y * scaleY });
                      setStartCrop({ ...cropArea });
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                  />
                  
                  {/* Edge handles - larger and more visible */}
                  <div 
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-background border-2 border-foreground rounded-sm cursor-ns-resize z-10"
                    style={{ pointerEvents: 'auto' }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const imgRect = imageRef.current!.getBoundingClientRect();
                      const x = e.clientX - imgRect.left;
                      const y = e.clientY - imgRect.top;
                      const scaleX = imageSize!.width / displaySize!.width;
                      const scaleY = imageSize!.height / displaySize!.height;
                      setActiveHandle('n');
                      setStartPos({ x: x * scaleX, y: y * scaleY });
                      setStartCrop({ ...cropArea });
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                  />
                  <div 
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-background border-2 border-foreground rounded-sm cursor-ns-resize z-10"
                    style={{ pointerEvents: 'auto' }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const imgRect = imageRef.current!.getBoundingClientRect();
                      const x = e.clientX - imgRect.left;
                      const y = e.clientY - imgRect.top;
                      const scaleX = imageSize!.width / displaySize!.width;
                      const scaleY = imageSize!.height / displaySize!.height;
                      setActiveHandle('s');
                      setStartPos({ x: x * scaleX, y: y * scaleY });
                      setStartCrop({ ...cropArea });
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                  />
                  <div 
                    className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-background border-2 border-foreground rounded-sm cursor-ew-resize z-10"
                    style={{ pointerEvents: 'auto' }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const imgRect = imageRef.current!.getBoundingClientRect();
                      const x = e.clientX - imgRect.left;
                      const y = e.clientY - imgRect.top;
                      const scaleX = imageSize!.width / displaySize!.width;
                      const scaleY = imageSize!.height / displaySize!.height;
                      setActiveHandle('w');
                      setStartPos({ x: x * scaleX, y: y * scaleY });
                      setStartCrop({ ...cropArea });
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                  />
                  <div 
                    className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-background border-2 border-foreground rounded-sm cursor-ew-resize z-10"
                    style={{ pointerEvents: 'auto' }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const imgRect = imageRef.current!.getBoundingClientRect();
                      const x = e.clientX - imgRect.left;
                      const y = e.clientY - imgRect.top;
                      const scaleX = imageSize!.width / displaySize!.width;
                      const scaleY = imageSize!.height / displaySize!.height;
                      setActiveHandle('e');
                      setStartPos({ x: x * scaleX, y: y * scaleY });
                      setStartCrop({ ...cropArea });
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={handleCrop}
            disabled={!cropArea || cropArea.width < 10 || cropArea.height < 10}
            className="h-12 px-8 text-xs tracking-[0.2em] uppercase"
          >
            <Crop className="w-4 h-4 mr-2" />
            Search Selected Area
          </Button>
          
          <Button
            onClick={handleSearchFull}
            variant="outline"
            className="h-12 px-8 text-xs tracking-[0.2em] uppercase"
          >
            Search Entire Image
          </Button>
          
          <Button
            onClick={onCancel}
            variant="ghost"
            className="h-12 px-8 text-xs tracking-[0.2em] uppercase"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>

        {cropArea && cropArea.width > 0 && cropArea.height > 0 && (
          <div className="text-center text-xs opacity-60">
            Selection: {Math.round((cropArea.width * cropArea.height) / (imageSize.width * imageSize.height) * 100)}% of image
          </div>
        )}
      </div>
    </div>
  );
}
