"use client";

import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getBrands } from '../../lib/search-image';

interface RefineSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: any) => void;
}

export function RefineSearchModal({ isOpen, onClose, onApply }: RefineSearchModalProps) {
  const [selectedBrand, setSelectedBrand] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [brands, setBrands] = useState<string[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);

  useEffect(() => {
    if (isOpen && brands.length === 0) {
      setLoadingBrands(true);
      getBrands()
        .then(setBrands)
        .catch(e => {
          console.error('[RefineSearchModal] Failed to load brands:', e);
        })
        .finally(() => setLoadingBrands(false));
    }
  }, [isOpen, brands.length]);

  if (!isOpen) return null;

  const handleApply = () => {
    const priceMinNum = minPrice.trim() ? Number(minPrice.trim()) : undefined;
    const priceMaxNum = maxPrice.trim() ? Number(maxPrice.trim()) : undefined;
    
    onApply({
      brand: selectedBrand || undefined,
      minPrice: priceMinNum,
      maxPrice: priceMaxNum,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-zinc-900 w-full max-w-2xl border-t border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-white text-xl font-bold tracking-tight">Refine search</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-zinc-400 transition-colors text-sm"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Brand Dropdown */}
          <div>
            <label className="text-white text-sm mb-2 block">
              Brand (optional)
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              disabled={loadingBrands}
              className="w-full h-12 bg-black border border-zinc-700 focus:border-white text-white px-4 outline-none transition-colors appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 1rem center',
                backgroundSize: '1.5rem',
              }}
            >
              <option value="">All brands</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
            {loadingBrands && (
              <span className="text-zinc-500 text-xs mt-1 block">Loading brands...</span>
            )}
          </div>

          {/* Price Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white text-sm mb-2 block">Min price</label>
              <input
                type="text"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="e.g. 70"
                className="w-full h-12 bg-black border border-zinc-700 focus:border-white text-white px-4 outline-none transition-colors placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="text-white text-sm mb-2 block">Max price</label>
              <input
                type="text"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="e.g. 300"
                className="w-full h-12 bg-black border border-zinc-700 focus:border-white text-white px-4 outline-none transition-colors placeholder:text-zinc-600"
              />
            </div>
          </div>

          {/* Apply Button */}
          <button
            onClick={handleApply}
            className="w-full h-12 bg-white hover:bg-zinc-200 text-black font-bold transition-colors"
          >
            Apply filters
          </button>
        </div>
      </div>
    </div>
  );
}

