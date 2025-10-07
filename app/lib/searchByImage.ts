export type Filters = {
  brand?: string[];
  color?: string[];
  category?: string[];
  priceMin?: number;
  priceMax?: number;
};

export async function searchByImage(input: File | string, filters?: Filters, bbox?: {x:number;y:number;w:number;h:number}) {
  const form = new FormData();
  if (typeof input === "string") form.append("url", input);
  else form.append("file", input);
  if (filters) form.append("filters_json", JSON.stringify(filters));
  if (bbox) form.append("bbox", JSON.stringify(bbox));
  const res = await fetch("http://localhost:8000/api/search", { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || json.error || "Search failed");
  return json;
}
