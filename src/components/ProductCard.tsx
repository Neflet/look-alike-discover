import { useState } from 'react';
import { Product } from '@/types/fashion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, ExternalLink, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProductCardProps {
  product: Product;
  index: number;
  showRemove?: boolean;
  onRemove?: () => Promise<void> | void;
}

export function ProductCard({ product, index, showRemove, onRemove }: ProductCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const { user } = useAuth();
  const { trackProductView, trackProductClick, trackProductLike, trackProductUnlike } = useAnalytics();
  const { toast } = useToast();

  // Track product view when component mounts
  useState(() => {
    trackProductView(product);
  });

  const handleProductClick = () => {
    trackProductClick(product);
    window.open(product.buyLink, '_blank');
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save items to your closet.",
        variant: "destructive",
      });
      return;
    }

    setIsLiking(true);
    
    try {
      if (isLiked) {
        // Remove from liked items
        const { error } = await supabase
          .from('liked_items')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.id);

        if (error) throw error;
        
        setIsLiked(false);
        trackProductUnlike(product);
        toast({
          title: "Removed from closet",
          description: "Item removed from your closet.",
        });
      } else {
        // Add to liked items
        const { error } = await supabase
          .from('liked_items')
          .insert({
            user_id: user.id,
            product_id: product.id,
            product_name: product.name,
            product_brand: product.brand,
            product_price: product.price,
            product_currency: product.currency,
            product_image_url: product.imageUrl,
            product_buy_link: product.buyLink,
            product_category: product.category,
            similarity_score: product.similarity,
          });

        if (error) throw error;
        
        setIsLiked(true);
        trackProductLike(product);
        toast({
          title: "Added to closet",
          description: "Item saved to your closet.",
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update your closet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-medium transition-all duration-300 hover:scale-105 cursor-pointer bg-card animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
      onClick={handleProductClick}
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
          loading="lazy"
        />
        
        {/* Similarity Badge */}
        <Badge 
          className="absolute top-2 left-2 bg-secondary/90 backdrop-blur-sm text-secondary-foreground"
        >
          {Math.round(product.similarity * 100)}% match
        </Badge>
        
        {/* Like/Remove Button */}
        {showRemove && onRemove ? (
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-destructive/90"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-background/90"
            onClick={handleLike}
            disabled={isLiking}
          >
            <Heart 
              className={`h-4 w-4 transition-colors ${
                isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground hover:text-red-500'
              }`}
            />
          </Button>
        )}
        
        {/* Quick View Button */}
        <Button
          size="sm"
          variant="ghost"
          className="absolute bottom-2 right-2 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-background/90"
          onClick={(e) => {
            e.stopPropagation();
            trackProductView(product);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
      
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-medium text-sm leading-tight line-clamp-2 text-foreground">
              {product.name}
            </h3>
          </div>
          
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {product.brand}
          </p>
          
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold text-foreground">
              {product.currency}{product.price}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleProductClick();
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Shop
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}