// lib/similarity-filter.ts
// Helper to filter search results by similarity threshold and limit to top N

// Similarity thresholds
export const STRONG_MATCH_THRESHOLD = 0.30; // Strong matches (high confidence)
export const WEAK_MATCH_THRESHOLD = 0.22;  // Weak matches (below this = ignore)
export const MIN_SIMILARITY = WEAK_MATCH_THRESHOLD; // Backward compatibility

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

/**
 * Categorize results into strong/weak matches based on thresholds
 * @param products Array of products with similarity scores
 * @returns Object with strongMatches, weakMatches, and matchStatus
 */
export function categorizeMatches<T extends SimilarityResult>(
  products: T[]
): {
  strongMatches: T[];
  weakMatches: T[];
  matchStatus: 'none' | 'weak' | 'strong';
} {
  const filtered = products.filter((p) => {
    if (p.similarity == null) return false;
    return p.similarity >= WEAK_MATCH_THRESHOLD;
  });

  const strongMatches = filtered.filter((p) => 
    p.similarity != null && p.similarity >= STRONG_MATCH_THRESHOLD
  );
  const weakMatches = filtered.filter((p) => 
    p.similarity != null && p.similarity >= WEAK_MATCH_THRESHOLD && p.similarity < STRONG_MATCH_THRESHOLD
  );

  let matchStatus: 'none' | 'weak' | 'strong';
  if (filtered.length === 0) {
    matchStatus = 'none';
  } else if (strongMatches.length > 0) {
    matchStatus = 'strong';
  } else {
    matchStatus = 'weak';
  }

  return { strongMatches, weakMatches, matchStatus };
}

