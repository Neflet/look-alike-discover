import { useState, useEffect } from 'react';
import { DetectedGarment } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Shirt, Square } from 'lucide-react';

interface GarmentSelectorProps {
  imageUrl: string;
  imageFile: File;
  onGarmentSelect: (garment: DetectedGarment | null, mode: 'single' | 'multi') => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export function GarmentSelector({ 
  imageUrl, 
  imageFile, 
  onGarmentSelect, 
  onSkip,
  isLoading = false 
}: GarmentSelectorProps) {
  const [detectedGarments, setDetectedGarments] = useState<DetectedGarment[]>([]);
  const [selectedGarments, setSelectedGarments] = useState<DetectedGarment[]>([]);
  const [isDetecting, setIsDetecting] = useState(true);
  const [mode, setMode] = useState<'single' | 'multi'>('single');

  useEffect(() => {
    detectGarments();
  }, [imageFile]);

  const detectGarments = async () => {
    setIsDetecting(true);
    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      const response = await fetch('http://localhost:8000/detect', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const garments = data.detections.map((detection: any, index: number) => ({
          id: `detection_${index}`,
          label: detection.label,
          confidence: detection.confidence,
          bbox: {
            x: detection.bbox[0],
            y: detection.bbox[1],
            width: detection.bbox[2] - detection.bbox[0],
            height: detection.bbox[3] - detection.bbox[1]
          },
          area: (detection.bbox[2] - detection.bbox[0]) * (detection.bbox[3] - detection.bbox[1]),
          categoryHint: mapLabelToCategory(detection.label)
        }));
        
        setDetectedGarments(garments);
        
        // Auto-select best garment
        if (garments.length > 0) {
          const best = selectBestGarment(garments);
          setSelectedGarments([best]);
        }
      }
    } catch (error) {
      console.warn('Garment detection failed:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const selectBestGarment = (garments: DetectedGarment[]): DetectedGarment => {
    // Prefer dress, then select by score × area
    const dress = garments.find(g => g.label === 'dress');
    if (dress) return dress;
    
    return garments.reduce((prev, curr) => 
      (curr.confidence * curr.area) > (prev.confidence * prev.area) ? curr : prev
    );
  };

  const mapLabelToCategory = (label: string): string => {
    const mapping: Record<string, string> = {
      'top': 'tops', 'bottom': 'bottoms', 'dress': 'dresses',
      'outerwear': 'outerwear', 'shoes': 'shoes', 'bag': 'accessories',
      'shirt': 'tops', 'pants': 'bottoms', 'jacket': 'outerwear',
      'coat': 'outerwear', 'skirt': 'bottoms', 'shorts': 'bottoms'
    };
    return mapping[label.toLowerCase()] || 'accessories';
  };

  const handleGarmentToggle = (garment: DetectedGarment) => {
    if (mode === 'single') {
      setSelectedGarments([garment]);
    } else {
      setSelectedGarments(prev => 
        prev.find(g => g.id === garment.id)
          ? prev.filter(g => g.id !== garment.id)
          : [...prev, garment]
      );
    }
  };

  const handleSearch = () => {
    if (selectedGarments.length === 0) {
      onSkip();
    } else if (mode === 'single') {
      onGarmentSelect(selectedGarments[0], 'single');
    } else {
      // For multi mode, we'll search for the first selected garment
      // The backend will handle multiple searches
      onGarmentSelect(selectedGarments[0], 'multi');
    }
  };

  const getGarmentIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'top':
      case 'shirt':
      case 'hoodie':
      case 'sweater':
        return <Shirt className="w-4 h-4" />;
      default:
        return <Square className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Select Items to Search</h1>
          <p className="text-muted-foreground">
            Choose which clothing items you want to find similar matches for
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant={mode === 'single' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('single')}
              className="rounded-md"
            >
              Single Item
            </Button>
            <Button
              variant={mode === 'multi' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('multi')}
              className="rounded-md"
            >
              Multiple Items
            </Button>
          </div>
        </div>

        {/* Image Container */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative inline-block">
              <img
                src={imageUrl}
                alt="Selected image"
                className="max-w-full max-h-96 object-contain mx-auto block"
              />
              
              {/* Bounding Box Overlays */}
              {detectedGarments.map((garment) => {
                const isSelected = selectedGarments.find(g => g.id === garment.id);
                return (
                  <div
                    key={garment.id}
                    className={`absolute border-2 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/20' 
                        : 'border-white bg-white/10 hover:border-primary/50'
                    }`}
                    style={{
                      left: `${garment.bbox.x}px`,
                      top: `${garment.bbox.y}px`,
                      width: `${garment.bbox.width}px`,
                      height: `${garment.bbox.height}px`,
                    }}
                    onClick={() => handleGarmentToggle(garment)}
                  >
                    <Badge 
                      className={`absolute -top-2 left-0 text-xs ${
                        isSelected ? 'bg-primary' : 'bg-white text-black'
                      }`}
                    >
                      {garment.label} {Math.round(garment.confidence * 100)}%
                    </Badge>
                  </div>
                );
              })}

              {/* Loading Overlay */}
              {isDetecting && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Detecting items...</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Garment Chips */}
        {!isDetecting && detectedGarments.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3">Detected Items:</h3>
            <div className="flex flex-wrap gap-2">
              {detectedGarments.map((garment) => {
                const isSelected = selectedGarments.find(g => g.id === garment.id);
                return (
                  <Button
                    key={garment.id}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleGarmentToggle(garment)}
                    className="flex items-center gap-2"
                  >
                    {getGarmentIcon(garment.label)}
                    {garment.label} ({Math.round(garment.confidence * 100)}%)
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={onSkip}
            disabled={isLoading}
          >
            Skip Detection
          </Button>
          <Button
            onClick={handleSearch}
            disabled={isLoading || (isDetecting && detectedGarments.length === 0)}
            className="min-w-32"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Searching...
              </>
            ) : (
              `Search ${selectedGarments.length > 1 ? `${selectedGarments.length} Items` : 'Similar Items'}`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}