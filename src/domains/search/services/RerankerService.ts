import { SearchResult, SearchFilters } from '../types';

export class RerankerService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:8000';
  }

  async rerank(
    candidates: SearchResult[],
    queryImage: File,
    filters?: SearchFilters,
    topK: number = 20
  ): Promise<SearchResult[]> {
    // Take top candidates for reranking
    const topCandidates = candidates.slice(0, Math.min(topK * 2, candidates.length));
    
    try {
      const formData = new FormData();
      formData.append('query_image', queryImage);
      formData.append('candidates', JSON.stringify(topCandidates.map(c => ({
        product_id: c.id,
        image_url: c.imageUrl,
        distance: c.distance
      }))));

      const response = await fetch(`${this.baseUrl}/rerank`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        console.warn('Reranking failed, using original order');
        return this.applyHeuristics(topCandidates, filters).slice(0, topK);
      }

      const data = await response.json();
      
      // Merge reranking results with original candidates
      const rerankedResults = data.reranked_results.map((result: any) => {
        const original = topCandidates.find(c => c.id === result.product_id);
        return {
          ...original!,
          rerankedScore: result.reranked_score,
          similarity: result.reranked_score
        };
      });

      return rerankedResults.slice(0, topK);
    } catch (error) {
      console.warn('Reranking error, applying heuristics:', error);
      return this.applyHeuristics(topCandidates, filters).slice(0, topK);
    }
  }

  private applyHeuristics(candidates: SearchResult[], filters?: SearchFilters): SearchResult[] {
    let scored = candidates.map(candidate => ({
      ...candidate,
      heuristicScore: this.calculateHeuristicScore(candidate, filters)
    }));

    // Sort by combined score (similarity + heuristics)
    scored.sort((a, b) => {
      const scoreA = (a.similarity * 0.7) + (a.heuristicScore * 0.3);
      const scoreB = (b.similarity * 0.7) + (b.heuristicScore * 0.3);
      return scoreB - scoreA;
    });

    return scored;
  }

  private calculateHeuristicScore(candidate: SearchResult, filters?: SearchFilters): number {
    let score = 0;

    // Brand preference boost
    if (filters?.brands?.includes(candidate.brand)) {
      score += 0.2;
    }

    // Price range preference (closer to middle gets boost)
    if (filters?.priceRange) {
      const [min, max] = filters.priceRange;
      const priceRatio = (candidate.price - min) / (max - min);
      const distanceFromMiddle = Math.abs(priceRatio - 0.5);
      score += (1 - distanceFromMiddle) * 0.1;
    }

    // Category match boost
    if (filters?.categories?.includes(candidate.category)) {
      score += 0.15;
    }

    // Quality indicators (price as proxy)
    const priceScore = Math.min(candidate.price / 1000, 1) * 0.05;
    score += priceScore;

    return Math.min(score, 0.5); // Cap heuristic contribution
  }
}