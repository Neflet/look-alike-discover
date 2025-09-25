import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Upload } from 'lucide-react';

interface UploadScreenProps {
  onImageSelect: (file: File) => void;
}

export function UploadScreen({ onImageSelect }: UploadScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageSelect(file);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto bg-fashion-gradient rounded-full flex items-center justify-center shadow-strong">
            <Camera className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Fashion Finder</h1>
          <p className="text-muted-foreground">
            Upload a photo to find similar fashion items
          </p>
        </div>

        {/* Upload Options */}
        <div className="space-y-4">
          {/* Camera Capture */}
          <Card className="p-6 border-2 border-dashed border-border hover:border-primary transition-colors cursor-pointer shadow-soft"
                onClick={() => cameraInputRef.current?.click()}>
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-foreground">Take Photo</h3>
                <p className="text-sm text-muted-foreground">Use your camera to capture an outfit</p>
              </div>
            </div>
          </Card>

          {/* File Upload */}
          <Card className="p-6 border-2 border-dashed border-border hover:border-primary transition-colors cursor-pointer shadow-soft"
                onClick={() => fileInputRef.current?.click()}>
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-secondary/50 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-foreground">Upload Image</h3>
                <p className="text-sm text-muted-foreground">Choose from your photo library</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Example */}
        <div className="text-center text-xs text-muted-foreground">
          <p>Best results with clear, well-lit fashion items</p>
        </div>

        {/* Hidden Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
}