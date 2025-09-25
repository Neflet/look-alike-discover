import { DetectedGarment } from '../types';

export class DetectionService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:8000';
  }

  async detectGarments(imageFile: File): Promise<DetectedGarment[]> {
    const formData = new FormData();
    formData.append('file', imageFile);

    try {
      const response = await fetch(`${this.baseUrl}/detect`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Detection failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.detections.map((detection: any, index: number) => ({
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
        categoryHint: this.mapLabelToCategory(detection.label)
      }));
    } catch (error) {
      console.warn('Garment detection failed, falling back to full image:', error);
      return [];
    }
  }

  private mapLabelToCategory(label: string): string {
    const mapping: Record<string, string> = {
      'top': 'tops',
      'bottom': 'bottoms', 
      'dress': 'dresses',
      'outerwear': 'outerwear',
      'shoes': 'shoes',
      'bag': 'accessories',
      'shirt': 'tops',
      'pants': 'bottoms',
      'jacket': 'outerwear',
      'coat': 'outerwear',
      'skirt': 'bottoms',
      'shorts': 'bottoms',
      'hoodie': 'tops',
      'sweater': 'tops',
      'blazer': 'outerwear',
      'cardigan': 'tops'
    };

    return mapping[label.toLowerCase()] || 'accessories';
  }

  getSupportedClasses(): string[] {
    return [
      'top', 'bottom', 'dress', 'outerwear', 
      'shoes', 'bag', 'shirt', 'pants', 
      'jacket', 'coat', 'skirt', 'shorts',
      'hoodie', 'sweater', 'blazer', 'cardigan'
    ];
  }
}