"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useRouter } from 'next/navigation';
import { Heart, ExternalLink, Trash2, Home, X, Grid3x3, List } from 'lucide-react';

type ClosetItem = {
  id: string;
  product_id: string;
  title: string;
  brand: string | null;
  price: number | null;
  url: string | null;
  main_image_url: string | null;
  saved_at: string;
};

interface ClosetPageProps {
  onHome: () => void;
  onClose?: () => void;
}

export function ClosetView({ onHome, onClose }: ClosetPageProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    if (user) {
      loadCloset();
    }
  }, [user]);

  const loadCloset = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)('get_user_closet', {
        p_user_id: user.id,
        p_limit: 100,
        p_offset: 0,
      }) as { data: ClosetItem[] | null; error: any };

      if (error) {
        console.error('Failed to load closet:', error);
      } else {
        setItems(data || []);
      }
    } catch (error) {
      console.error('Error loading closet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId: string) => {
    if (!user) return;

    try {
      const { error } = await (supabase.rpc as any)('toggle_closet_item', {
        p_user_id: user.id,
        p_product_id: productId,
      }) as { data: { action: string; is_saved: boolean } | null; error: any };

      if (error) {
        console.error('Failed to remove item:', error);
      } else {
        // Reload closet
        loadCloset();
      }
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const handleProductClick = (item: ClosetItem) => {
    if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    } else {
      router.push(`/product/${item.product_id}`);
    }
  };

  // Sort products
  const sortedProducts = [...items].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime();
      case 'oldest':
        return new Date(a.saved_at).getTime() - new Date(b.saved_at).getTime();
      case 'price-low':
        return (a.price || 0) - (b.price || 0);
      case 'price-high':
        return (b.price || 0) - (a.price || 0);
      case 'brand':
        return (a.brand || '').localeCompare(b.brand || '');
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-zinc-400">Loading your closet...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white overflow-y-auto">
      {/* Background gradient matching home page */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-zinc-900 to-black pointer-events-none">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-sm border-b border-zinc-900 relative">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <button
                  onClick={onHome || (() => router.push('/'))}
                  className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <Home className="w-5 h-5" />
                  <span className="text-sm font-bold tracking-tight">HOME</span>
                </button>
              </div>
              <h1 className="text-5xl font-black tracking-tighter text-white mb-2">
                MY CLOSET
              </h1>
              <p className="text-zinc-500 text-sm">
                {items.length} saved {items.length === 1 ? 'item' : 'items'}
              </p>
            </div>
            {/* Close button */}
            {onClose && (
              <button
                onClick={onClose}
                className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-800 hover:border-white transition-all flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            )}
          </div>

          {/* Controls */}
          {items.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-10 px-4 bg-zinc-900 border border-zinc-800 hover:border-white text-white text-sm font-bold transition-colors appearance-none cursor-pointer rounded"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '1rem',
                    paddingRight: '2.5rem',
                  }}
                >
                  <option value="recent">Most Recent</option>
                  <option value="oldest">Oldest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="brand">Brand A-Z</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`h-8 w-8 rounded flex items-center justify-center transition-all ${
                    viewMode === 'grid' ? 'bg-white text-black' : 'text-white hover:bg-zinc-800'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`h-8 w-8 rounded flex items-center justify-center transition-all ${
                    viewMode === 'list' ? 'bg-white text-black' : 'text-white hover:bg-zinc-800'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {items.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-32 h-32 rounded-full bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center mb-6">
              <Heart className="w-16 h-16 text-zinc-700" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Your closet is empty</h2>
            <p className="text-zinc-500 mb-8 text-center max-w-md">
              Start saving items you love by clicking the heart icon on any product
            </p>
            <button
              onClick={() => {
                // Full page reload to reset to home/search state
                window.location.href = '/';
              }}
              className="h-12 px-8 bg-white hover:bg-zinc-200 text-black font-bold transition-colors rounded-full"
            >
              DISCOVER ITEMS
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sortedProducts.map((item, index) => (
              <div
                key={item.id}
                className="group bg-zinc-900 border border-zinc-800 hover:border-white transition-all overflow-hidden rounded-lg"
                style={{
                  animation: `slideIn 0.3s ease-out ${index * 0.05}s both`,
                }}
              >
                {/* Product Image */}
                <div className="relative aspect-[3/4] bg-zinc-800 overflow-hidden">
                  {item.main_image_url ? (
                    <img
                      src={item.main_image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xs text-zinc-500">No image</span>
                    </div>
                  )}
                  {/* Actions */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={() => handleRemove(item.product_id)}
                      className="w-10 h-10 bg-black hover:bg-red-600 rounded-full transition-colors flex items-center justify-center"
                    >
                      <Trash2 className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <div className="text-zinc-500 text-xs mb-1 tracking-wider uppercase">
                    {item.brand || 'OTHER'}
                  </div>
                  <h3 className="text-white font-medium mb-3 line-clamp-2 min-h-[2.5rem] text-sm">
                    {item.title}
                  </h3>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white text-xl font-bold">
                      {item.price ? `$${item.price.toFixed(2)}` : 'Price N/A'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleProductClick(item)}
                    className="w-full h-10 bg-zinc-200 hover:bg-white text-black font-bold transition-colors flex items-center justify-center gap-2 rounded"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-4">
            {sortedProducts.map((item, index) => (
              <div
                key={item.id}
                className="group bg-zinc-900 border border-zinc-800 hover:border-white transition-all overflow-hidden rounded-lg flex"
                style={{
                  animation: `slideIn 0.3s ease-out ${index * 0.05}s both`,
                }}
              >
                {/* Product Image */}
                <div className="relative w-48 h-48 bg-zinc-800 overflow-hidden flex-shrink-0">
                  {item.main_image_url ? (
                    <img
                      src={item.main_image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xs text-zinc-500">No image</span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 p-6 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-zinc-500 text-xs mb-2 tracking-wider uppercase">
                      {item.brand || 'OTHER'}
                    </div>
                    <h3 className="text-white font-medium mb-3 text-lg">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-4">
                      <span className="text-white text-2xl font-bold">
                        {item.price ? `$${item.price.toFixed(2)}` : 'Price N/A'}
                      </span>
                      <span className="text-zinc-500 text-sm">
                        Saved {new Date(item.saved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleRemove(item.product_id)}
                      className="h-12 w-12 bg-zinc-800 hover:bg-red-600 rounded-full transition-colors flex items-center justify-center"
                    >
                      <Trash2 className="w-5 h-5 text-white" />
                    </button>
                    <button
                      onClick={() => handleProductClick(item)}
                      className="h-12 px-8 bg-zinc-200 hover:bg-white text-black font-bold transition-colors flex items-center gap-2 rounded-full"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
