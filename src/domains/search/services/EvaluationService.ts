export interface EvaluationMetrics {
  recall_at_1: number;
  recall_at_5: number;
  recall_at_10: number;
  mrr: number; // Mean Reciprocal Rank
  total_queries: number;
}

export interface EvaluationQuery {
  id: string;
  queryImage: File;
  relevantProductIds: string[];
  category?: string;
  description?: string;
}

export interface EvaluationResult {
  queryId: string;
  retrievedIds: string[];
  relevantIds: string[];
  reciprocalRank: number;
  recall_at_k: Record<number, number>;
}

export class EvaluationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:8000';
  }

  async evaluateSearchPerformance(queries: EvaluationQuery[]): Promise<EvaluationMetrics> {
    const results: EvaluationResult[] = [];
    
    for (const query of queries) {
      try {
        const result = await this.evaluateQuery(query);
        results.push(result);
      } catch (error) {
        console.error(`Failed to evaluate query ${query.id}:`, error);
      }
    }

    return this.calculateMetrics(results);
  }

  private async evaluateQuery(query: EvaluationQuery): Promise<EvaluationResult> {
    // Search for similar products
    const formData = new FormData();
    formData.append('file', query.queryImage);
    if (query.category) {
      formData.append('category_hint', query.category);
    }

    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Search failed for query ${query.id}`);
    }

    const data = await response.json();
    const retrievedIds = data.results.map((r: any) => r.product_id).slice(0, 10);

    // Calculate reciprocal rank
    let reciprocalRank = 0;
    for (let i = 0; i < retrievedIds.length; i++) {
      if (query.relevantProductIds.includes(retrievedIds[i])) {
        reciprocalRank = 1 / (i + 1);
        break;
      }
    }

    // Calculate recall@k for different k values
    const recall_at_k: Record<number, number> = {};
    for (const k of [1, 5, 10]) {
      const topK = retrievedIds.slice(0, k);
      const relevantRetrieved = topK.filter(id => query.relevantProductIds.includes(id));
      recall_at_k[k] = relevantRetrieved.length / Math.min(query.relevantProductIds.length, k);
    }

    return {
      queryId: query.id,
      retrievedIds,
      relevantIds: query.relevantProductIds,
      reciprocalRank,
      recall_at_k
    };
  }

  private calculateMetrics(results: EvaluationResult[]): EvaluationMetrics {
    if (results.length === 0) {
      return {
        recall_at_1: 0,
        recall_at_5: 0,
        recall_at_10: 0,
        mrr: 0,
        total_queries: 0
      };
    }

    const recall_at_1 = results.reduce((sum, r) => sum + r.recall_at_k[1], 0) / results.length;
    const recall_at_5 = results.reduce((sum, r) => sum + r.recall_at_k[5], 0) / results.length;
    const recall_at_10 = results.reduce((sum, r) => sum + r.recall_at_k[10], 0) / results.length;
    const mrr = results.reduce((sum, r) => sum + r.reciprocalRank, 0) / results.length;

    return {
      recall_at_1,
      recall_at_5,
      recall_at_10,
      mrr,
      total_queries: results.length
    };
  }

  async loadEvaluationDataset(): Promise<EvaluationQuery[]> {
    try {
      const response = await fetch('/data/evaluation_dataset.json');
      if (!response.ok) {
        throw new Error('Failed to load evaluation dataset');
      }
      
      const dataset = await response.json();
      return dataset.queries || [];
    } catch (error) {
      console.warn('No evaluation dataset found, using empty set');
      return [];
    }
  }

  async runBenchmark(): Promise<EvaluationMetrics> {
    console.log('Loading evaluation dataset...');
    const queries = await this.loadEvaluationDataset();
    
    if (queries.length === 0) {
      console.warn('No evaluation queries found');
      return {
        recall_at_1: 0,
        recall_at_5: 0,
        recall_at_10: 0,
        mrr: 0,
        total_queries: 0
      };
    }

    console.log(`Running evaluation on ${queries.length} queries...`);
    const startTime = Date.now();
    
    const metrics = await this.evaluateSearchPerformance(queries);
    
    const endTime = Date.now();
    console.log(`Evaluation completed in ${endTime - startTime}ms`);
    console.log('Results:', metrics);
    
    return metrics;
  }
}