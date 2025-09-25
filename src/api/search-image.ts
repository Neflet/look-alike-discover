// Updated to use FastAPI backend instead of Supabase edge functions

export async function searchImage(imageFile: File, filters?: {
  pmin?: number;
  pmax?: number;
  pcolor?: string;
}): Promise<{ products: any[]; requestId: string }> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(`[${requestId}] Starting image search...`);
    
    // Validate file size and type
    if (imageFile.size > 10 * 1024 * 1024) {
      throw new Error('File size must be less than 10MB');
    }

    if (!imageFile.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    console.log(`[${requestId}] Calling FastAPI backend...`);
    
    // Call FastAPI backend
    const formData = new FormData();
    formData.append('file', imageFile);

    console.log(`[${requestId}] Making request to FastAPI backend...`);
    
    const response = await fetch('http://localhost:8000/api/search', {
      method: 'POST',
      body: formData,
    });

    console.log(`[${requestId}] Response status:`, response.status);
    console.log(`[${requestId}] Response ok:`, response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] FastAPI error:`, response.status, errorText);
      throw new Error(`Backend returned ${response.status}: ${errorText}`);
    }

    console.log(`[${requestId}] Parsing response JSON...`);
    let searchData;
    try {
      searchData = await response.json();
      console.log(`[${requestId}] Search data received:`, searchData);
    } catch (jsonError) {
      console.error(`[${requestId}] JSON parsing error:`, jsonError);
      throw new Error('Failed to parse search response');
    }

    if (searchData.error) {
      throw new Error(searchData.error);
    }

    const products = searchData?.matches || [];

    console.log(`[${requestId}] Search completed: ${products.length} results`);
    
    return { 
      products,
      requestId 
    };

  } catch (error) {
    console.error(`[${requestId}] Search error:`, error);
    throw error;
  }
}