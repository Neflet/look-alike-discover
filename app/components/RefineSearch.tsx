"use client";

import { useState, useEffect } from 'react';
import { searchSimilarFiltered, getBrands, type SearchHit } from '../../lib/search-image';
import { track } from '@/lib/posthog';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  lastEmbedding: number[] | null;   // from initial search
  lastModel: string | null;
  onResults: (hits: SearchHit[]) => void;
};

export default function RefineSearch({
  isOpen,
  onClose,
  lastEmbedding,
  lastModel,
  onResults,
}: Props) {
  const [brand, setBrand] = useState('');
  const [brands, setBrands] = useState<string[]>([]);
  const [min, setMin] = useState<string>('');
  const [max, setMax] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Load brands when drawer opens
  useEffect(() => {
    if (isOpen && brands.length === 0) {
      setLoadingBrands(true);
      getBrands()
        .then(setBrands)
        .catch(e => {
          console.error('[RefineSearch] Failed to load brands:', e);
        })
        .finally(() => setLoadingBrands(false));
    }
  }, [isOpen, brands.length]);

  if (!isOpen) return null;

  async function runRefine() {
    if (!lastEmbedding || !lastModel) {
      setErr('No base query available. Upload an image first.');
      return;
    }
    
    // Validate numeric inputs
    const priceMinNum = min.trim() ? Number(min.trim()) : undefined;
    const priceMaxNum = max.trim() ? Number(max.trim()) : undefined;
    
    if (min.trim() && (isNaN(priceMinNum!) || priceMinNum! < 0)) {
      setErr('Min price must be a valid number');
      return;
    }
    
    if (max.trim() && (isNaN(priceMaxNum!) || priceMaxNum! < 0)) {
      setErr('Max price must be a valid number');
      return;
    }
    
    if (priceMinNum !== undefined && priceMaxNum !== undefined && priceMinNum > priceMaxNum) {
      setErr('Min price cannot be greater than max price');
      return;
    }
    
    setLoading(true);
    setErr(null);
    try {
      console.log('[RefineSearch] Applying filters:', {
        priceMin: priceMinNum,
        priceMax: priceMaxNum,
        brand: brand.trim() || undefined,
      });
      
      // Track search triggered with filters
      const activeFilters = {
        priceMin: priceMinNum ?? null,
        priceMax: priceMaxNum ?? null,
        brand: brand.trim() || null,
      };
      track('search_triggered', { qtype: 'image', filters: activeFilters });
      
      const hits = await searchSimilarFiltered(lastEmbedding, lastModel, {
        topK: 5,
        priceMin: priceMinNum,
        priceMax: priceMaxNum,
        brand: brand.trim() || undefined,
      });
      
      console.log('[RefineSearch] Got results:', hits.length);
      onResults(hits);
      onClose();
    } catch (e: any) {
      console.error('[RefineSearch] Error:', e);
      const errorMsg = e?.message || e?.error?.message || 'Refine search failed. Make sure the database migration has been applied.';
      setErr(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-end">
      <div className="w-full max-w-md bg-background p-4 rounded-t-2xl shadow-xl border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Refine search</h3>
          <button onClick={onClose} className="text-sm rounded-lg px-2 py-1 hover:bg-muted transition-colors">Close</button>
        </div>

        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm opacity-60">Brand (optional)</span>
            <select
              value={brand}
              onChange={e => setBrand(e.target.value)}
              className="border rounded px-3 py-2 bg-background"
              disabled={loadingBrands}
            >
              <option value="">All brands</option>
              {brands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            {loadingBrands && (
              <span className="text-xs opacity-60">Loading brands...</span>
            )}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-sm opacity-60">Min price</span>
              <input
                value={min}
                onChange={e => setMin(e.target.value)}
                placeholder="e.g. 70"
                inputMode="numeric"
                className="border rounded px-3 py-2 bg-background"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm opacity-60">Max price</span>
              <input
                value={max}
                onChange={e => setMax(e.target.value)}
                placeholder="e.g. 300"
                inputMode="numeric"
                className="border rounded px-3 py-2 bg-background"
              />
            </label>
          </div>

          {err && <p className="text-red-600 text-sm">{err}</p>}

          <button
            onClick={runRefine}
            disabled={loading}
            className="bg-foreground text-background rounded-lg px-4 py-2 border"
          >
            {loading ? 'Searching…' : 'Apply filters'}
          </button>
        </div>
      </div>
    </div>
  );
}
