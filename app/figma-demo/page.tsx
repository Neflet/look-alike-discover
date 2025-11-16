"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { User, HelpCircle } from "lucide-react";
import { ProductCarousel3D } from "@/components/ProductCarousel3D";
import { ImageUploadPanel } from "@/components/ImageUploadPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Mock product data
const products = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1622567893612-a5345baa5c9a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob29kaWUlMjBmYXNoaW9uJTIwcHJvZHVjdHxlbnwxfHx8fDE3NjMwODMwMjB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    title: "Classic Hoodie",
    price: "$59.99",
    category: "Hoodies",
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1616258372736-f5e5d5337d6e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbmVha2VyJTIwc2hvZSUyMHByb2R1Y3R8ZW58MXx8fHwxNzYzMDgzMDIwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    title: "Street Sneakers",
    price: "$129.99",
    category: "Footwear",
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1693275542358-29602edf6088?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0c2hpcnQlMjBjbG90aGluZyUyMHByb2R1Y3R8ZW58MXx8fHwxNzYzMDMzMDUzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    title: "Essential Tee",
    price: "$29.99",
    category: "T-Shirts",
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1579143074908-5aaac893d0fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYWNrZXQlMjBmYXNoaW9uJTIwcHJvZHVjdHxlbnwxfHx8fDE3NjMwODMwMjF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    title: "Urban Jacket",
    price: "$149.99",
    category: "Outerwear",
  },
  {
    id: 5,
    image: "https://images.unsplash.com/photo-1622567893612-a5345baa5c9a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob29kaWUlMjBmYXNoaW9uJTIwcHJvZHVjdHxlbnwxfHx8fDE3NjMwODMwMjB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    title: "Premium Hoodie",
    price: "$79.99",
    category: "Hoodies",
  },
];

export default function FigmaDemoPage() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent text-2xl font-bold">
            SwagAI
          </h1>
        </div>
        {/* Sign In Button */}
        <Button className="gap-2">
          <User className="w-4 h-4" />
          Sign In
        </Button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Image Upload */}
        <aside className="w-80 p-6 bg-background border-r border-border overflow-y-auto">
          <ImageUploadPanel />
        </aside>

        {/* Main Area - 3D Carousel */}
        <main className="flex-1 relative overflow-hidden bg-gradient-to-br from-background to-muted/20">
          <ProductCarousel3D products={products} />
        </main>
      </div>

      {/* Help Button - Bottom Right */}
      <Button
        size="icon"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-50"
        onClick={() => setIsHelpOpen(true)}
      >
        <HelpCircle className="w-6 h-6" />
      </Button>

      {/* Help Dialog */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>How to use SwagAI</DialogTitle>
            <DialogDescription>
              Get AI-powered product recommendations in seconds
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 font-semibold">1. Upload an Image</h3>
              <p className="text-sm text-muted-foreground">
                Upload a photo of clothing or style you like. Our AI will analyze it to find similar products.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">2. Browse Results</h3>
              <p className="text-sm text-muted-foreground">
                Navigate through the 3D carousel to explore AI-matched products. Click the arrows or drag to rotate.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">3. Refine Your Search</h3>
              <p className="text-sm text-muted-foreground">
                Use the "Refine Results" button to get more precise recommendations based on your uploaded image.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">4. Add to Cart</h3>
              <p className="text-sm text-muted-foreground">
                Found something you love? Click the Add button or heart icon to save your favorites.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}





