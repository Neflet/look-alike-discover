"use client";

import { useState, useRef, useEffect } from 'react';
import { X, Scissors, Search } from 'lucide-react';

interface CropOverlayProps {
  imageSrc: string;
  onCancel: () => void;
  onCrop: (croppedArea: any) => void;
  onSearchAll: () => void;
}

export function CropOverlay({ imageSrc, onCancel, onCrop, onSearchAll }: CropOverlayProps) {
  const [cropBox, setCropBox] = useState({ x: 100, y: 100, width: 300, height: 300 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      // Wait for image to render, then center the crop box on the image
      setTimeout(() => {
        if (imageRef.current && containerRef.current) {
          const imgRect = imageRef.current.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          
          // Calculate image position relative to container
          const imgX = imgRect.left - containerRect.left + containerRef.current.scrollLeft;
          const imgY = imgRect.top - containerRect.top + containerRef.current.scrollTop;
          
          // Center the crop box on the image
          const initialSize = Math.min(imgRect.width, imgRect.height) * 0.5;
          setCropBox({
            x: imgX + (imgRect.width - initialSize) / 2,
            y: imgY + (imgRect.height - initialSize) / 2,
            width: initialSize,
            height: initialSize,
          });
        }
      }, 100);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const handleMouseDown = (e: React.MouseEvent, action: 'drag' | string) => {
    e.preventDefault();
    if (action === 'drag') {
      setIsDragging(true);
    } else {
      setIsResizing(action);
    }
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging && !isResizing) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    if (isDragging) {
      setCropBox(prev => {
        // Clamp to container bounds
        const containerWidth = containerRef.current?.clientWidth || 0;
        const containerHeight = containerRef.current?.clientHeight || 0;
        return {
          ...prev,
          x: Math.max(0, Math.min(prev.x + deltaX, containerWidth - prev.width)),
          y: Math.max(0, Math.min(prev.y + deltaY, containerHeight - prev.height)),
        };
      });
    } else if (isResizing) {
      const newBox = { ...cropBox };
      
      if (isResizing.includes('top')) {
        const newHeight = cropBox.height - deltaY;
        if (newHeight > 50) {
          newBox.y = cropBox.y + deltaY;
          newBox.height = newHeight;
        }
      }
      if (isResizing.includes('bottom')) {
        newBox.height = Math.max(50, cropBox.height + deltaY);
      }
      if (isResizing.includes('left')) {
        const newWidth = cropBox.width - deltaX;
        if (newWidth > 50) {
          newBox.x = cropBox.x + deltaX;
          newBox.width = newWidth;
        }
      }
      if (isResizing.includes('right')) {
        newBox.width = Math.max(50, cropBox.width + deltaX);
      }
      
      setCropBox(newBox);
    }

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(null);
  };

  const handleCrop = () => {
    if (imageRef.current && containerRef.current) {
      const img = imageRef.current;
      const imgRect = img.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      
      // Calculate image position relative to container
      const imgX = imgRect.left - containerRect.left + containerRef.current.scrollLeft;
      const imgY = imgRect.top - containerRect.top + containerRef.current.scrollTop;
      
      // Calculate the scale between displayed image and actual image
      const scaleX = imageSize.width / imgRect.width;
      const scaleY = imageSize.height / imgRect.height;
      
      // Calculate crop position relative to the image
      const relativeX = cropBox.x - imgX;
      const relativeY = cropBox.y - imgY;
      
      // Clamp to image bounds
      const clampedX = Math.max(0, Math.min(relativeX, imgRect.width));
      const clampedY = Math.max(0, Math.min(relativeY, imgRect.height));
      const clampedWidth = Math.min(cropBox.width, imgRect.width - clampedX);
      const clampedHeight = Math.min(cropBox.height, imgRect.height - clampedY);
      
      const croppedArea = {
        x: Math.max(0, clampedX * scaleX),
        y: Math.max(0, clampedY * scaleY),
        width: Math.max(10, clampedWidth * scaleX),
        height: Math.max(10, clampedHeight * scaleY),
      };
      
      onCrop(croppedArea);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800">
        <h2 className="text-white text-xl font-bold tracking-tight">CROP IMAGE</h2>
        <button
          onClick={onCancel}
          className="w-10 h-10 flex items-center justify-center hover:bg-zinc-800 transition-colors rounded"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Image and Crop Area */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-auto flex items-center justify-center bg-black"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          ref={imageRef}
          src={imageSrc}
          alt="Crop preview"
          className="max-w-full max-h-full object-contain select-none pointer-events-none"
          draggable={false}
        />

        {/* Crop Box */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: cropBox.x,
            top: cropBox.y,
            width: cropBox.width,
            height: cropBox.height,
          }}
        >
          {/* Overlay dimming */}
          <div className="absolute inset-0" style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)' }}></div>

          {/* Draggable area */}
          <div
            className="absolute inset-0 cursor-move pointer-events-auto"
            onMouseDown={(e) => handleMouseDown(e, 'drag')}
          ></div>

          {/* Four-corner indicators with rounded edges */}
          <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-xl pointer-events-none"></div>
          <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-xl pointer-events-none"></div>
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-xl pointer-events-none"></div>

          {/* Resize handles */}
          {/* Top */}
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-4 cursor-ns-resize pointer-events-auto"
            onMouseDown={(e) => handleMouseDown(e, 'top')}
          ></div>
          {/* Bottom */}
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-4 cursor-ns-resize pointer-events-auto"
            onMouseDown={(e) => handleMouseDown(e, 'bottom')}
          ></div>
          {/* Left */}
          <div
            className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-12 cursor-ew-resize pointer-events-auto"
            onMouseDown={(e) => handleMouseDown(e, 'left')}
          ></div>
          {/* Right */}
          <div
            className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-12 cursor-ew-resize pointer-events-auto"
            onMouseDown={(e) => handleMouseDown(e, 'right')}
          ></div>
          
          {/* Corner resize handles */}
          <div
            className="absolute -top-2 -left-2 w-8 h-8 cursor-nwse-resize pointer-events-auto"
            onMouseDown={(e) => handleMouseDown(e, 'top-left')}
          ></div>
          <div
            className="absolute -top-2 -right-2 w-8 h-8 cursor-nesw-resize pointer-events-auto"
            onMouseDown={(e) => handleMouseDown(e, 'top-right')}
          ></div>
          <div
            className="absolute -bottom-2 -left-2 w-8 h-8 cursor-nesw-resize pointer-events-auto"
            onMouseDown={(e) => handleMouseDown(e, 'bottom-left')}
          ></div>
          <div
            className="absolute -bottom-2 -right-2 w-8 h-8 cursor-nwse-resize pointer-events-auto"
            onMouseDown={(e) => handleMouseDown(e, 'bottom-right')}
          ></div>
        </div>
      </div>

      {/* Instruction */}
      <div className="px-6 py-3 bg-zinc-900 border-b border-zinc-800">
        <p className="text-zinc-400 text-sm text-center">
          Drag to move • Resize from edges and corners
        </p>
      </div>

      {/* Action Buttons */}
      <div className="p-4 bg-zinc-900 flex gap-4">
        <button
          onClick={onCancel}
          className="flex-1 h-14 bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors border border-zinc-700"
        >
          CANCEL
        </button>
        <button
          onClick={onSearchAll}
          className="flex-1 h-14 bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors border border-zinc-700 flex items-center justify-center gap-2"
        >
          <Search className="w-5 h-5" />
          SEARCH ALL
        </button>
        <button
          onClick={handleCrop}
          className="flex-1 h-14 bg-white hover:bg-zinc-200 text-black font-bold transition-colors flex items-center justify-center gap-2"
        >
          <Scissors className="w-5 h-5" />
          CROP & SEARCH
        </button>
      </div>
    </div>
  );
}

