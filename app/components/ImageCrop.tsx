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

type HandlePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null;
type DragMode = 'move' | 'resize' | null;

export function ImageCrop({ imageFile, imageUrl, onCropComplete, onCancel }: ImageCropProps) {
  const [crop, setCrop] = useState<CropArea | null>(null);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [activeHandle, setActiveHandle] = useState<HandlePosition>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [startCrop, setStartCrop] = useState<CropArea | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cropBoxRef = useRef<HTMLDivElement>(null);

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
    if (displaySize && imageSize && !crop) {
      // Set initial crop area to center 60% of image
      const scaleX = displaySize.width / imageSize.width;
      const scaleY = displaySize.height / imageSize.height;
      const initialX = displaySize.width * 0.2;
      const initialY = displaySize.height * 0.2;
      const initialWidth = displaySize.width * 0.6;
      const initialHeight = displaySize.height * 0.6;
      
      setCrop({
        x: initialX / scaleX,
        y: initialY / scaleY,
        width: initialWidth / scaleX,
        height: initialHeight / scaleY,
      });
    }
  }, [displaySize, imageSize, crop]);

  // Convert display coordinates to image coordinates
  const displayToImage = (displayX: number, displayY: number): { x: number; y: number } => {
    if (!imageSize || !displaySize || !imageRef.current) return { x: 0, y: 0 };
    const imgRect = imageRef.current.getBoundingClientRect();
    const scaleX = imageSize.width / displaySize.width;
    const scaleY = imageSize.height / displaySize.height;
    const x = (displayX - imgRect.left) * scaleX;
    const y = (displayY - imgRect.top) * scaleY;
    return { x, y };
  };

  // Clamp crop to image bounds
  const clampCrop = (cropArea: CropArea): CropArea => {
    if (!imageSize) return cropArea;
    
    let { x, y, width, height } = cropArea;
    
    // Ensure minimum size
    width = Math.max(10, width);
    height = Math.max(10, height);
    
    // Clamp position and size to image bounds
    x = Math.max(0, Math.min(x, imageSize.width - width));
    y = Math.max(0, Math.min(y, imageSize.height - height));
    width = Math.min(width, imageSize.width - x);
    height = Math.min(height, imageSize.height - y);
    
    return { x, y, width, height };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!imageRef.current || !displaySize || !imageSize || !crop) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const imgRect = imageRef.current.getBoundingClientRect();
    const displayX = e.clientX;
    const displayY = e.clientY;
    
    // Only allow interaction if click is on the image
    if (displayX < imgRect.left || displayY < imgRect.top || 
        displayX > imgRect.right || displayY > imgRect.bottom) return;
    
    const imgPos = displayToImage(displayX, displayY);
    const startImgPos = imgPos;
    
    // Check if clicking on a resize handle
    const handleSize = 12; // Hit area for handles in image coordinates
    const scaleX = imageSize.width / displaySize.width;
    const scaleY = imageSize.height / displaySize.height;
    const handleSizeScaled = handleSize * Math.max(scaleX, scaleY);
    
    const left = crop.x;
    const right = crop.x + crop.width;
    const top = crop.y;
    const bottom = crop.y + crop.height;
    
    let handle: HandlePosition = null;
    
    // Check corners
    if (Math.abs(imgPos.x - left) < handleSizeScaled && Math.abs(imgPos.y - top) < handleSizeScaled) {
      handle = 'top-left';
    } else if (Math.abs(imgPos.x - right) < handleSizeScaled && Math.abs(imgPos.y - top) < handleSizeScaled) {
      handle = 'top-right';
    } else if (Math.abs(imgPos.x - left) < handleSizeScaled && Math.abs(imgPos.y - bottom) < handleSizeScaled) {
      handle = 'bottom-left';
    } else if (Math.abs(imgPos.x - right) < handleSizeScaled && Math.abs(imgPos.y - bottom) < handleSizeScaled) {
      handle = 'bottom-right';
    }
    
    // Check if inside crop box
    const isInside = imgPos.x >= left && imgPos.x <= right && imgPos.y >= top && imgPos.y <= bottom;
    
    if (handle) {
      setDragMode('resize');
      setActiveHandle(handle);
    } else if (isInside) {
      setDragMode('move');
      setActiveHandle(null);
    } else {
      return; // Clicked outside crop box
    }
    
    setStartPos(startImgPos);
    setStartCrop({ ...crop });
    
    // Capture pointer on the crop box
    if (cropBoxRef.current) {
      try {
        cropBoxRef.current.setPointerCapture(e.pointerId);
      } catch (err) {
        console.warn('setPointerCapture failed:', err);
      }
    }
  };

  useEffect(() => {
    if (!dragMode || !startPos || !startCrop || !imageSize || !displaySize) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!imageRef.current) return;
      
      e.preventDefault();
      
      const imgRect = imageRef.current.getBoundingClientRect();
      const displayX = Math.max(imgRect.left, Math.min(e.clientX, imgRect.right));
      const displayY = Math.max(imgRect.top, Math.min(e.clientY, imgRect.bottom));
      
      const currentImgPos = displayToImage(displayX, displayY);
      const deltaX = currentImgPos.x - startPos.x;
      const deltaY = currentImgPos.y - startPos.y;
      
      let newCrop: CropArea = { ...startCrop };
      
      if (dragMode === 'move') {
        // Move the entire crop box
        newCrop.x = startCrop.x + deltaX;
        newCrop.y = startCrop.y + deltaY;
      } else if (dragMode === 'resize' && activeHandle) {
        // Resize based on handle
        switch (activeHandle) {
          case 'top-left':
            newCrop.x = startCrop.x + deltaX;
            newCrop.y = startCrop.y + deltaY;
            newCrop.width = startCrop.width - deltaX;
            newCrop.height = startCrop.height - deltaY;
            break;
          case 'top-right':
            newCrop.y = startCrop.y + deltaY;
            newCrop.width = startCrop.width + deltaX;
            newCrop.height = startCrop.height - deltaY;
            break;
          case 'bottom-left':
            newCrop.x = startCrop.x + deltaX;
            newCrop.width = startCrop.width - deltaX;
            newCrop.height = startCrop.height + deltaY;
            break;
          case 'bottom-right':
            newCrop.width = startCrop.width + deltaX;
            newCrop.height = startCrop.height + deltaY;
            break;
        }
      }
      
      // Clamp to image bounds
      newCrop = clampCrop(newCrop);
      setCrop(newCrop);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (cropBoxRef.current) {
        try {
          cropBoxRef.current.releasePointerCapture(e.pointerId);
        } catch (err) {
          // Ignore if already released
        }
      }
      setDragMode(null);
      setActiveHandle(null);
      setStartPos(null);
      setStartCrop(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [dragMode, startPos, startCrop, imageSize, displaySize, activeHandle]);

  const handleCrop = async () => {
    if (!crop || !imageSize) return;
    
    // Validate crop area
    if (crop.width < 10 || crop.height < 10) {
      alert('Crop area too small. Please select a larger area.');
      return;
    }
    
    try {
      const croppedFile = await cropImage(imageFile, crop);
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
    if (dragMode === 'move') return 'move';
    if (dragMode === 'resize') {
      switch (activeHandle) {
        case 'top-left':
        case 'bottom-right':
          return 'nwse-resize';
        case 'top-right':
        case 'bottom-left':
          return 'nesw-resize';
        default:
          return 'default';
      }
    }
    return 'default';
  };

  const scaleX = imageSize.width / (displaySize?.width || 1);
  const scaleY = imageSize.height / (displaySize?.height || 1);
  const cropDisplayX = crop ? (crop.x / scaleX) : 0;
  const cropDisplayY = crop ? (crop.y / scaleY) : 0;
  const cropDisplayWidth = crop ? (crop.width / scaleX) : 0;
  const cropDisplayHeight = crop ? (crop.height / scaleY) : 0;

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
            />
            
            {/* Crop Overlay */}
            {crop && crop.width > 0 && crop.height > 0 && displaySize && imageSize && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Dark overlay covering entire image */}
                <div
                  className="absolute inset-0 bg-black/50"
                  style={{
                    clipPath: `polygon(
                      0% 0%, 
                      0% 100%, 
                      ${(crop.x / imageSize.width) * 100}% 100%, 
                      ${(crop.x / imageSize.width) * 100}% ${(crop.y / imageSize.height) * 100}%, 
                      ${((crop.x + crop.width) / imageSize.width) * 100}% ${(crop.y / imageSize.height) * 100}%, 
                      ${((crop.x + crop.width) / imageSize.width) * 100}% ${((crop.y + crop.height) / imageSize.height) * 100}%, 
                      ${(crop.x / imageSize.width) * 100}% ${((crop.y + crop.height) / imageSize.height) * 100}%, 
                      ${(crop.x / imageSize.width) * 100}% 100%, 
                      100% 100%, 
                      100% 0%
                    )`,
                  }}
                />
                
                {/* Crop border with handles */}
                <div
                  ref={cropBoxRef}
                  className="absolute border-2 border-white shadow-lg pointer-events-auto"
                  style={{
                    left: `${cropDisplayX}px`,
                    top: `${cropDisplayY}px`,
                    width: `${cropDisplayWidth}px`,
                    height: `${cropDisplayHeight}px`,
                    cursor: getCursor(),
                  }}
                  onPointerDown={handlePointerDown}
                >
                  {/* Corner resize handles */}
                  <div
                    className="absolute w-3 h-3 bg-white border border-black rounded-full cursor-nwse-resize z-10"
                    data-handle="top-left"
                    style={{ top: -6, left: -6 }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (!imageRef.current || !displaySize || !imageSize || !crop) return;
                      const imgPos = displayToImage(e.clientX, e.clientY);
                      setDragMode('resize');
                      setActiveHandle('top-left');
                      setStartPos(imgPos);
                      setStartCrop({ ...crop });
                      if (cropBoxRef.current) {
                        cropBoxRef.current.setPointerCapture(e.pointerId);
                      }
                    }}
                  />
                  <div
                    className="absolute w-3 h-3 bg-white border border-black rounded-full cursor-nesw-resize z-10"
                    data-handle="top-right"
                    style={{ top: -6, right: -6 }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (!imageRef.current || !displaySize || !imageSize || !crop) return;
                      const imgPos = displayToImage(e.clientX, e.clientY);
                      setDragMode('resize');
                      setActiveHandle('top-right');
                      setStartPos(imgPos);
                      setStartCrop({ ...crop });
                      if (cropBoxRef.current) {
                        cropBoxRef.current.setPointerCapture(e.pointerId);
                      }
                    }}
                  />
                  <div
                    className="absolute w-3 h-3 bg-white border border-black rounded-full cursor-nesw-resize z-10"
                    data-handle="bottom-left"
                    style={{ bottom: -6, left: -6 }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (!imageRef.current || !displaySize || !imageSize || !crop) return;
                      const imgPos = displayToImage(e.clientX, e.clientY);
                      setDragMode('resize');
                      setActiveHandle('bottom-left');
                      setStartPos(imgPos);
                      setStartCrop({ ...crop });
                      if (cropBoxRef.current) {
                        cropBoxRef.current.setPointerCapture(e.pointerId);
                      }
                    }}
                  />
                  <div
                    className="absolute w-3 h-3 bg-white border border-black rounded-full cursor-nwse-resize z-10"
                    data-handle="bottom-right"
                    style={{ bottom: -6, right: -6 }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (!imageRef.current || !displaySize || !imageSize || !crop) return;
                      const imgPos = displayToImage(e.clientX, e.clientY);
                      setDragMode('resize');
                      setActiveHandle('bottom-right');
                      setStartPos(imgPos);
                      setStartCrop({ ...crop });
                      if (cropBoxRef.current) {
                        cropBoxRef.current.setPointerCapture(e.pointerId);
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={handleCrop}
            disabled={!crop || crop.width < 10 || crop.height < 10}
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

        {crop && crop.width > 0 && crop.height > 0 && (
          <div className="text-center text-xs opacity-60">
            Selection: {Math.round((crop.width * crop.height) / (imageSize.width * imageSize.height) * 100)}% of image
          </div>
        )}
      </div>
    </div>
  );
}
