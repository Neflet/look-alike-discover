import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDown, Edit } from 'lucide-react';

interface CropScreenProps {
  imageUrl: string;
  onCropComplete: (boundingBox: { x: number; y: number; width: number; height: number } | null) => void;
  onSkip: () => void;
  onEditImage: () => void;
}

export function CropScreen({ imageUrl, onCropComplete, onSkip, onEditImage }: CropScreenProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      canvas.width = containerWidth;
      canvas.height = containerHeight;

      // Draw the image maintaining aspect ratio
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const imageAspect = image.naturalWidth / image.naturalHeight;
      const canvasAspect = canvas.width / canvas.height;
      
      let drawWidth = canvas.width;
      let drawHeight = canvas.height;
      let offsetX = 0;
      let offsetY = 0;
      
      if (imageAspect > canvasAspect) {
        // Image is wider - fit by width
        drawHeight = canvas.width / imageAspect;
        offsetY = (canvas.height - drawHeight) / 2;
      } else {
        // Image is taller - fit by height
        drawWidth = canvas.height * imageAspect;
        offsetX = (canvas.width - drawWidth) / 2;
      }
      
      ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
    };

    image.onload = resizeCanvas;
    window.addEventListener('resize', resizeCanvas);
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [imageUrl]);

  const getCanvasPosition = (event: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleStart = (event: React.TouchEvent | React.MouseEvent) => {
    event.preventDefault();
    const position = getCanvasPosition(event);
    setIsDrawing(true);
    setStartPoint(position);
    setCurrentBox(null);
  };

  const handleMove = (event: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || !startPoint) return;
    
    event.preventDefault();
    const position = getCanvasPosition(event);
    
    const box = {
      x: Math.min(startPoint.x, position.x),
      y: Math.min(startPoint.y, position.y),
      width: Math.abs(position.x - startPoint.x),
      height: Math.abs(position.y - startPoint.y)
    };
    
    setCurrentBox(box);
    
    // Redraw canvas with bounding box
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (canvas && image) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Redraw image with proper aspect ratio
        const imageAspect = image.naturalWidth / image.naturalHeight;
        const canvasAspect = canvas.width / canvas.height;
        
        let drawWidth = canvas.width;
        let drawHeight = canvas.height;
        let offsetX = 0;
        let offsetY = 0;
        
        if (imageAspect > canvasAspect) {
          drawHeight = canvas.width / imageAspect;
          offsetY = (canvas.height - drawHeight) / 2;
        } else {
          drawWidth = canvas.height * imageAspect;
          offsetX = (canvas.width - drawWidth) / 2;
        }
        
        ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
        
        // Draw bounding box
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        
        // Draw semi-transparent overlay outside box
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, box.y);
        ctx.fillRect(0, box.y, box.x, box.height);
        ctx.fillRect(box.x + box.width, box.y, canvas.width - (box.x + box.width), box.height);
        ctx.fillRect(0, box.y + box.height, canvas.width, canvas.height - (box.y + box.height));
      }
    }
  };

  const handleEnd = () => {
    setIsDrawing(false);
  };

  const handleConfirm = () => {
    if (currentBox && currentBox.width > 10 && currentBox.height > 10) {
      const canvas = canvasRef.current;
      const image = imageRef.current;
      if (canvas && image) {
        // Calculate image drawing dimensions and offsets
        const imageAspect = image.naturalWidth / image.naturalHeight;
        const canvasAspect = canvas.width / canvas.height;
        
        let drawWidth = canvas.width;
        let drawHeight = canvas.height;
        let offsetX = 0;
        let offsetY = 0;
        
        if (imageAspect > canvasAspect) {
          drawHeight = canvas.width / imageAspect;
          offsetY = (canvas.height - drawHeight) / 2;
        } else {
          drawWidth = canvas.height * imageAspect;
          offsetX = (canvas.width - drawWidth) / 2;
        }
        
        // Convert bounding box to relative coordinates within the actual image area
        const relativeBox = {
          x: Math.max(0, (currentBox.x - offsetX) / drawWidth),
          y: Math.max(0, (currentBox.y - offsetY) / drawHeight),
          width: Math.min(1, currentBox.width / drawWidth),
          height: Math.min(1, currentBox.height / drawHeight)
        };
        
        // Only proceed if the box is within the image bounds
        if (relativeBox.x >= 0 && relativeBox.y >= 0 && 
            relativeBox.x + relativeBox.width <= 1 && 
            relativeBox.y + relativeBox.height <= 1) {
          onCropComplete(relativeBox);
        } else {
          onCropComplete(null);
        }
      }
    } else {
      onCropComplete(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onEditImage}
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit Image
          </Button>
          <div className="text-center">
            <h2 className="text-lg font-semibold">Select Area (Optional)</h2>
            <p className="text-sm text-muted-foreground">
              Draw a box around the item you want to find
            </p>
          </div>
          <div className="w-20"></div>
        </div>
      </div>

      {/* Image Cropping Area */}
      <div className="flex-1 relative overflow-hidden">
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Upload"
          className="hidden"
        />
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain cursor-crosshair"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
        
        {/* Instructions Overlay */}
        {!currentBox && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
              Tap and drag to select an area
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 space-y-3 border-t border-border">
        <Button 
          onClick={handleConfirm}
          className="w-full bg-search-gradient hover:opacity-90 text-white shadow-medium"
          size="lg"
        >
          {currentBox ? 'Search Selected Area' : 'Search Full Image'}
        </Button>
        
        <Button 
          onClick={onSkip}
          variant="outline"
          className="w-full"
          size="lg"
        >
          Skip & Search Full Image
        </Button>
      </div>
    </div>
  );
}