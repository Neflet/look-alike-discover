import { useState, useEffect } from 'react';
import { DetectedGarment } from '@/domains/search/types';
import { GarmentSelector } from '@/domains/search/components/GarmentSelector';

interface GarmentDetectionScreenProps {
  imageUrl: string;
  imageFile: File;
  onGarmentSelect: (garment: DetectedGarment | null, mode: 'single' | 'multi') => void;
  onSkip: () => void;
}

export function GarmentDetectionScreen({ 
  imageUrl, 
  imageFile, 
  onGarmentSelect, 
  onSkip 
}: GarmentDetectionScreenProps) {
  return (
    <GarmentSelector
      imageUrl={imageUrl}
      imageFile={imageFile}
      onGarmentSelect={onGarmentSelect}
      onSkip={onSkip}
    />
  );
}