"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Image from 'next/image';
import { Heart, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

export function ClosetView() {
  const { user } = useAuth();
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="text-center py-8">Loading your closet...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="w-16 h-16 mx-auto mb-4 opacity-20" />
        <h3 className="text-lg font-semibold mb-2">Your closet is empty</h3>
        <p className="text-sm opacity-60">
          Save items you like by clicking the heart icon on any product
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">My Closet ({items.length})</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item.id} className="group relative">
            <div className="aspect-[3/4] relative overflow-hidden bg-muted/20 mb-2 border">
              {item.main_image_url ? (
                <img
                  src={item.main_image_url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xs opacity-40">No image</span>
                </div>
              )}
              <button
                onClick={() => handleRemove(item.product_id)}
                className="absolute top-2 right-2 p-2 bg-background/80 hover:bg-background rounded-full"
                aria-label="Remove from closet"
              >
                <Heart className="w-4 h-4 fill-red-600 text-red-600" />
              </button>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium line-clamp-2" title={item.title}>
                {item.title}
              </h3>
              {item.brand && (
                <p className="text-xs opacity-60">{item.brand}</p>
              )}
              {item.price && (
                <p className="text-xs font-bold">${item.price.toFixed(2)}</p>
              )}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs underline hover:no-underline"
                >
                  View Product <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

