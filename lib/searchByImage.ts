export async function searchByImage(fileOrUrl: File | string) {
  const body = new FormData();
  if (typeof fileOrUrl === "string") body.append("url", fileOrUrl);
  else body.append("file", fileOrUrl);

  const res = await fetch("http://localhost:8000/api/search", { method: "POST", body });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Search failed");
  return json.matches as Array<{
    id: string; title: string; brand: string; price: number; currency: string;
    category: string; color: string; url: string; main_image_url: string; score: number;
  }>;
}
