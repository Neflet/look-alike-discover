// lib/similarity-filter.ts
// Helper to filter search results by similarity threshold and limit to top N

export const MIN_SIMILARITY = 0.25; // Minimum similarity threshold (0.0 = completely different, 1.0 = identical)

export interface SimilarityResult {
  similarity?: number | null;
  distance?: number | null;
}

/**
 * Filters products by similarity threshold and returns top N results
 * @param products Array of products with similarity scores
 * @param limit Maximum number of results to return
 * @returns Filtered and limited array of products
 */
export function filterBySimilarity<T extends SimilarityResult>(
  products: T[],
  limit: number
): T[] {
  const filtered = products.filter((p) => {
    // If similarity is missing, keep for now (backward compatibility)
    if (p.similarity == null) return true;
    // Only keep items that meet the minimum similarity threshold
    return p.similarity >= MIN_SIMILARITY;
  });

  // Return top N results (already sorted by similarity from RPC)
  return filtered.slice(0, limit);
}

