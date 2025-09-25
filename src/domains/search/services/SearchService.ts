import { SearchRequest, SearchResponse, DetectedGarment, BoundingBox } from '../types';
import { ModelAdapter } from './ModelAdapter';
import { DetectionService } from './DetectionService';
import { VectorSearchService } from './VectorSearchService';
import { RerankerService } from './RerankerService';

export class SearchService {
  private modelAdapter: ModelAdapter;
  private detectionService: DetectionService;
  private vectorSearchService: VectorSearchService;
  private rerankerService: RerankerService;

  constructor() {
    this.modelAdapter = new ModelAdapter();
    this.detectionService = new DetectionService();
    this.vectorSearchService = new VectorSearchService();
    this.rerankerService = new RerankerService();
  }

  async searchSimilarProducts(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();
    const searchId = this.generateSearchId();

    try {
      // Step 1: Detect garments if no bounding box provided
      let detectedGarments: DetectedGarment[] = [];
      let processedImage = request.imageFile;
      let boundingBox = request.boundingBox;

      if (!boundingBox || request.mode === 'multi') {
        detectedGarments = await this.detectionService.detectGarments(request.imageFile);
        
        if (detectedGarments.length > 0 && !boundingBox) {
          // Auto-select best garment if no manual selection
          boundingBox = this.selectBestGarment(detectedGarments, request.categoryHint);
        }
      }

      // Step 2: Crop and preprocess image
      if (boundingBox) {
        processedImage = await this.cropAndPreprocess(request.imageFile, boundingBox);
      } else {
        // Fallback to center crop
        processedImage = await this.centerCrop(request.imageFile);
      }

      // Step 3: Generate embedding
      const embedding = await this.modelAdapter.generateEmbedding(processedImage);

      // Step 4: Vector search with filters
      const candidates = await this.vectorSearchService.search(
        embedding,
        request.filters,
        request.categoryHint
      );

      // Step 5: Rerank top candidates
      const rerankedResults = await this.rerankerService.rerank(
        candidates,
        processedImage,
        request.filters
      );

      const searchTime = Date.now() - startTime;

      return {
        products: rerankedResults,
        searchTime,
        searchId,
        detectedGarments
      };
    } catch (error) {
      console.error('Search error:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async detectGarments(imageFile: File): Promise<DetectedGarment[]> {
    return this.detectionService.detectGarments(imageFile);
  }

  private selectBestGarment(garments: DetectedGarment[], categoryHint?: string): BoundingBox {
    // Prefer dresses, then select by score × area
    let best = garments[0];
    
    if (categoryHint) {
      const hintMatch = garments.find(g => g.categoryHint === categoryHint);
      if (hintMatch) best = hintMatch;
    } else {
      const dress = garments.find(g => g.label === 'dress');
      if (dress) {
        best = dress;
      } else {
        // Select by score × area
        best = garments.reduce((prev, curr) => 
          (curr.confidence * curr.area) > (prev.confidence * prev.area) ? curr : prev
        );
      }
    }

    return best.bbox;
  }

  private async cropAndPreprocess(imageFile: File, bbox: BoundingBox): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        canvas.width = bbox.width;
        canvas.height = bbox.height;
        
        ctx.drawImage(
          img,
          bbox.x, bbox.y, bbox.width, bbox.height,
          0, 0, bbox.width, bbox.height
        );
        
        canvas.toBlob((blob) => {
          const croppedFile = new File([blob!], 'cropped-image.jpg', { type: 'image/jpeg' });
          resolve(croppedFile);
        }, 'image/jpeg', 0.9);
      };
      
      img.src = URL.createObjectURL(imageFile);
    });
  }

  private async centerCrop(imageFile: File): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;
        
        canvas.width = size;
        canvas.height = size;
        
        ctx.drawImage(img, x, y, size, size, 0, 0, size, size);
        
        canvas.toBlob((blob) => {
          const croppedFile = new File([blob!], 'center-cropped.jpg', { type: 'image/jpeg' });
          resolve(croppedFile);
        }, 'image/jpeg', 0.9);
      };
      
      img.src = URL.createObjectURL(imageFile);
    });
  }

  private generateSearchId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}