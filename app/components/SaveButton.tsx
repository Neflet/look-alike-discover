"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/api/analytics';
import { track } from '@/lib/posthog';

type SaveButtonProps = {
  productId: string;
  productTitle?: string;
};

export function SaveButton({ productId, productTitle }: SaveButtonProps) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      checkIfSaved();
    }
  }, [user, productId]);

  const checkIfSaved = async () => {
    if (!user || !productId) return;

    try {
      const { data, error } = await (supabase.rpc as any)('is_product_saved', {
        p_user_id: user.id,
        p_product_id: productId,
      }) as { data: boolean | null; error: any };

      if (error) {
        console.error('[SaveButton] Error checking saved status:', error);
        return;
      }

      if (data !== null && data !== undefined) {
        setIsSaved(data);
      }
    } catch (error) {
      console.error('[SaveButton] Error checking saved status:', error);
    }
  };

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering product click
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save items to your closet",
        variant: "destructive"
      });
      return;
    }

    if (!productId) {
      console.error('[SaveButton] No product ID provided');
      return;
    }

    setLoading(true);
    try {
      console.log('[SaveButton] Toggling save:', { userId: user.id, productId });
      
      const { data, error } = await (supabase.rpc as any)('toggle_closet_item', {
        p_user_id: user.id,
        p_product_id: productId,
      }) as { data: { action: string; is_saved: boolean } | null; error: any };

      console.log('[SaveButton] Toggle result:', { data, error });

      if (error) {
        console.error('Failed to toggle save:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to save item. Make sure you're signed in.",
          variant: "destructive"
        });
      } else {
        setIsSaved(data?.is_saved || false);
        
        // Track with PostHog
        if (data?.action === 'added') {
          track('item_saved', { productId });
        }
        
        // Track analytics
        await trackEvent(data?.action === 'added' ? 'product_saved' : 'product_unsaved', {
          product_id: productId,
          product_title: productTitle,
        });

        toast({
          title: data?.action === 'added' ? "Saved to closet" : "Removed from closet",
          description: data?.action === 'added' 
            ? "Item added to your closet" 
            : "Item removed from your closet",
        });
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      toast({
        title: "Error",
        description: "An error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`p-2 rounded-full transition-colors ${
        isSaved
          ? 'bg-red-50 text-red-600 hover:bg-red-100'
          : 'bg-background border hover:bg-muted'
      }`}
      aria-label={isSaved ? 'Remove from closet' : 'Save to closet'}
      title={isSaved ? 'Remove from closet' : 'Save to closet'}
    >
      <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
    </button>
  );
}

