import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/ProductCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Search, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/types/fashion';

interface LikedItem {
  id: string;
  product_id: string;
  product_name: string;
  product_brand: string;
  product_price: number;
  product_currency: string;
  product_image_url: string;
  product_buy_link: string;
  product_category: string;
  similarity_score: number;
  created_at: string;
}

export function ClosetPage() {
  const [likedItems, setLikedItems] = useState<LikedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchLikedItems();
    }
  }, [user]);

  const fetchLikedItems = async () => {
    try {
      const { data, error } = await supabase
        .from('liked_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLikedItems(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load your closet items.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('liked_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setLikedItems(prev => prev.filter(item => item.id !== itemId));
      
      toast({
        title: "Removed",
        description: "Item removed from your closet."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove item.",
        variant: "destructive"
      });
    }
  };

  // Convert LikedItem to Product format for ProductCard
  const convertToProduct = (item: LikedItem): Product => ({
    id: item.product_id,
    name: item.product_name,
    brand: item.product_brand,
    price: item.product_price,
    currency: item.product_currency,
    imageUrl: item.product_image_url,
    buyLink: item.product_buy_link,
    category: (item.product_category as Product['category']) || 'tops',
    similarity: item.similarity_score
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground">Loading your closet...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">My Closet</h1>
                <p className="text-sm text-muted-foreground">
                  {likedItems.length} saved items
                </p>
              </div>
            </div>
            
            <Button
              onClick={() => navigate('/')}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              <Search className="w-4 h-4 mr-2" />
              New Search
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {likedItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {likedItems.map((item) => (
              <div key={item.id} className="relative">
                <ProductCard 
                  product={convertToProduct(item)}
                  index={0}
                  showRemove={true}
                  onRemove={() => handleRemoveItem(item.id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Card className="w-full max-w-md shadow-medium">
              <CardHeader>
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-muted-foreground" />
                </div>
                <CardTitle>Your closet is empty</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  Start searching for fashion items and save your favorites to build your personal collection.
                </p>
                <Button 
                  onClick={() => navigate('/')}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Start Shopping
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}