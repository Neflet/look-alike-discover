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

export function ImageCrop({ imageFile, imageUrl, onCropComplete, onCancel }: ImageCropProps) {
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
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
    if (displaySize && imageSize) {
      // Set initial crop area to center 60% of image (in display coordinates)
      const scaleX = displaySize.width / imageSize.width;
      const scaleY = displaySize.height / imageSize.height;
      const initialX = displaySize.width * 0.2;
      const initialY = displaySize.height * 0.2;
      const initialWidth = displaySize.width * 0.6;
      const initialHeight = displaySize.height * 0.6;
      
      // Convert back to original image coordinates for crop
      setCropArea({
        x: initialX / scaleX,
        y: initialY / scaleY,
        width: initialWidth / scaleX,
        height: initialHeight / scaleY,
      });
    }
  }, [displaySize, imageSize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageRef.current || !containerRef.current || !displaySize || !imageSize) return;
    
    const imgRect = imageRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Get click position relative to image (not container)
    const x = e.clientX - imgRect.left;
    const y = e.clientY - imgRect.top;
    
    // Only allow crop if click is on the image
    if (x < 0 || y < 0 || x > imgRect.width || y > imgRect.height) return;
    
    // Convert to original image coordinates
    const scaleX = imageSize.width / displaySize.width;
    const scaleY = imageSize.height / displaySize.height;
    
    setIsDragging(true);
    setStartPos({ x, y });
    
    // Start new crop area (in display coordinates for visual feedback)
    setCropArea({
      x: x * scaleX,
      y: y * scaleY,
      width: 0,
      height: 0,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !startPos || !imageSize || !displaySize || !imageRef.current) return;
    
    const imgRect = imageRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(e.clientX - imgRect.left, imgRect.width));
    const currentY = Math.max(0, Math.min(e.clientY - imgRect.top, imgRect.height));
    
    // Convert to original image coordinates
    const scaleX = imageSize.width / displaySize.width;
    const scaleY = imageSize.height / displaySize.height;
    
    const startX = startPos.x * scaleX;
    const startY = startPos.y * scaleY;
    const endX = currentX * scaleX;
    const endY = currentY * scaleY;
    
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    
    // Constrain to image bounds
    const constrainedX = Math.max(0, Math.min(x, imageSize.width - width));
    const constrainedY = Math.max(0, Math.min(y, imageSize.height - height));
    const constrainedWidth = Math.min(width, imageSize.width - constrainedX);
    const constrainedHeight = Math.min(height, imageSize.height - constrainedY);
    
    setCropArea({
      x: constrainedX,
      y: constrainedY,
      width: constrainedWidth,
      height: constrainedHeight,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setStartPos(null);
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Select Area to Search</h2>
          <p className="text-sm opacity-60">
            Drag to select the portion of the image you want to search
          </p>
        </div>

        {/* Crop Container */}
        <div
          ref={containerRef}
          className="relative border-2 border-foreground/20 rounded-lg overflow-hidden bg-background"
          style={{ 
            cursor: isDragging ? 'crosshair' : 'default',
            maxHeight: '70vh',
          }}
        >
          <div className="relative inline-block">
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Crop preview"
              className="max-w-full max-h-[70vh] object-contain"
              draggable={false}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
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
                
                {/* Crop border */}
                <div
                  className="absolute border-2 border-foreground pointer-events-none"
                  style={{
                    left: `${(cropArea.x / imageSize.width) * 100}%`,
                    top: `${(cropArea.y / imageSize.height) * 100}%`,
                    width: `${(cropArea.width / imageSize.width) * 100}%`,
                    height: `${(cropArea.height / imageSize.height) * 100}%`,
                  }}
                >
                  {/* Corner handles */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-2 border-foreground bg-background" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-2 border-foreground bg-background" />
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 border-2 border-foreground bg-background" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-2 border-foreground bg-background" />
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

