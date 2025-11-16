"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingCart, ExternalLink } from "lucide-react";
import Image from "next/image";
import { SaveButton } from "./SaveButton";
import type { SearchHit } from "../../lib/search-image";

interface ProductCardProps {
  product: SearchHit & { image?: string };
  onProductClick?: (product: SearchHit) => void;
}

export function ProductCard({ product, onProductClick }: ProductCardProps) {
  const imageUrl = product.main_image_url || product.image || '/placeholder.svg';
  const price = product.price !== undefined 
    ? `$${product.price.toFixed(2)}` 
    : 'Price N/A';
  const category = product.category || product.brand || '';

  const handleClick = () => {
    if (onProductClick) {
      onProductClick(product);
    } else if (product.url) {
      window.open(product.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="w-64 h-auto overflow-hidden bg-background shadow-xl rounded-2xl border">
      <div className="relative h-72 overflow-hidden bg-muted rounded-t-2xl">
        <Image
          src={imageUrl}
          alt={product.title}
          fill
          className="object-cover rounded-t-2xl"
          sizes="256px"
        />
        <div className="absolute top-4 right-4 z-10">
          <SaveButton productId={product.id} productTitle={product.title} />
        </div>
      </div>
      <div className="p-4 rounded-b-2xl">
        {category && (
          <div className="text-xs text-muted-foreground mb-1 uppercase">{category}</div>
        )}
        <h3 className="mb-2 font-semibold line-clamp-2 text-sm">{product.title}</h3>
        <div className="flex items-center justify-between gap-2">
          <span className="text-foreground font-bold text-sm">{price}</span>
          {product.url ? (
            <Button 
              size="sm" 
              className="gap-2 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (product.url) {
                  window.open(product.url, '_blank', 'noopener,noreferrer');
                } else if (onProductClick) {
                  onProductClick(product);
                }
              }}
            >
              <ExternalLink className="w-4 h-4" />
              View
            </Button>
          ) : (
            <Button size="sm" className="gap-2 shrink-0" disabled>
              <ShoppingCart className="w-4 h-4" />
              Add
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}



