"use client";

import { useState } from 'react';
import { searchSimilarFiltered, type SearchHit } from '@/lib/search-image';

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
  const [min, setMin] = useState<string>('');
  const [max, setMax] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!isOpen) return null;

  async function runRefine() {
    if (!lastEmbedding || !lastModel) {
      setErr('No base query available. Upload an image first.');
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const priceMin = min ? Number(min) : undefined;
      const priceMax = max ? Number(max) : undefined;
      const hits = await searchSimilarFiltered(lastEmbedding, lastModel, {
        topK: 24,
        minSimilarity: 0.55,
        priceMin,
        priceMax,
        brand: brand.trim() || undefined,
      });
      onResults(hits);
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? 'Refine failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-end">
      <div className="w-full max-w-md bg-background p-4 rounded-t-2xl shadow-xl border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Refine search</h3>
          <button onClick={onClose} className="text-sm">Close</button>
        </div>

        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm opacity-60">Brand (optional)</span>
            <input
              value={brand}
              onChange={e => setBrand(e.target.value)}
              placeholder="adidas, nike, zara…"
              className="border rounded px-3 py-2 bg-background"
            />
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
            className="bg-foreground text-background rounded px-4 py-2 border"
          >
            {loading ? 'Searching…' : 'Apply filters'}
          </button>
        </div>
      </div>
    </div>
  );
}
