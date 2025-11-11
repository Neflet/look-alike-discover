"use client";

import RotatingCloset, { ClosetItem } from "@/components/RotatingCloset";

// Mock data for demo
const MOCK_ITEMS: ClosetItem[] = [
  {
    id: "1",
    title: "Jordan Brooklyn Fleece Men's Pullover Hoodie - FV7281-010",
    brand: "Nike",
    price: 65,
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1600&auto=format&fit=crop",
    url: "https://example.com/jordan-hoodie",
  },
  {
    id: "2",
    title: "Stüssy Basic Hoodie",
    brand: "Stüssy",
    price: 90,
    image:
      "https://images.unsplash.com/photo-1603252109303-2751441dd157?q=80&w=1600&auto=format&fit=crop",
    url: "https://example.com/stussy-hoodie",
  },
  {
    id: "3",
    title: "Carhartt WIP Chase Hoodie",
    brand: "Carhartt",
    price: 88,
    image:
      "https://images.unsplash.com/photo-1520975922192-ece5fae45120?q=80&w=1600&auto=format&fit=crop",
    url: "https://example.com/carhartt-hoodie",
  },
  {
    id: "4",
    title: "The Row Minimal Pullover",
    brand: "The Row",
    price: 450,
    image:
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1600&auto=format&fit=crop",
    url: "https://example.com/row-pullover",
  },
  {
    id: "5",
    title: "Rick Owens DRKSHDW Hoodie",
    brand: "Rick Owens",
    price: 320,
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=1600&auto=format&fit=crop",
    url: "https://example.com/rick-owens-hoodie",
  },
  {
    id: "6",
    title: "Wales Bonner Track Jacket",
    brand: "Wales Bonner",
    price: 280,
    image:
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1600&auto=format&fit=crop",
    url: "https://example.com/wales-bonner-jacket",
  },
  {
    id: "7",
    title: "Noah NY Core Hoodie",
    brand: "Noah",
    price: 95,
    image:
      "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?q=80&w=1600&auto=format&fit=crop",
    url: "https://example.com/noah-hoodie",
  },
  {
    id: "8",
    title: "Aime Leon Dore Sweatshirt",
    brand: "Aime Leon Dore",
    price: 185,
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=1600&auto=format&fit=crop",
    url: "https://example.com/aime-sweatshirt",
  },
];

export default function ResultsPage() {
  return (
    <div className="min-h-screen w-full bg-background py-12 px-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            3D Rotating Closet
          </h1>
          <p className="mt-2 text-muted-foreground">
            Drag to rotate, use arrows or dots to navigate
          </p>
        </div>
        <RotatingCloset
          items={MOCK_ITEMS}
          initialIndex={0}
          onIndexChange={(index) => {
            console.log("Active index:", index);
          }}
        />
      </div>
    </div>
  );
}

