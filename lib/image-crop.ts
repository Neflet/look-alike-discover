// lib/image-crop.ts
// Utility functions for cropping images client-side

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Crop an image file to the specified area
 * Returns a new File with the cropped image
 */
export async function cropImage(file: File, cropArea: CropArea): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Set canvas size to crop area
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;
      
      // Draw the cropped portion
      ctx.drawImage(
        img,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        cropArea.width,
        cropArea.height
      );
      
      // Convert canvas to blob, then to File
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob from canvas'));
            return;
          }
          
          const croppedFile = new File([blob], file.name, {
            type: file.type || 'image/jpeg',
            lastModified: Date.now(),
          });
          
          resolve(croppedFile);
        },
        file.type || 'image/jpeg',
        0.92 // Quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convert crop area from relative coordinates (0-1) to absolute pixels
 */
export function relativeToAbsolute(
  relative: { x: number; y: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number
): CropArea {
  return {
    x: relative.x * imageWidth,
    y: relative.y * imageHeight,
    width: relative.width * imageWidth,
    height: relative.height * imageHeight,
  };
}

/**
 * Normalize crop area to relative coordinates (0-1)
 */
export function absoluteToRelative(
  absolute: CropArea,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: absolute.x / imageWidth,
    y: absolute.y / imageHeight,
    width: absolute.width / imageWidth,
    height: absolute.height / imageHeight,
  };
}

