/**
 * Utility to compress images in the browser before sending them over the network.
 * Reduces 5MB-15MB camera photos and heavy screenshots to lightweight, high-fidelity images (~100-200KB)
 * to ensure rapid uploads, prevent memory saturation, and keep the platform ultra-responsive.
 */
export function compressImageFile(
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.80
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If SVG or non-image, fallback to raw data URL
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      compressDataUrl(reader.result as string, maxWidth, maxHeight, quality)
        .then(resolve)
        .catch(() => resolve(reader.result as string));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Optimizes, downscales and compresses a base64 dataUrl string in the browser.
 */
export function compressDataUrl(
  dataUrl: string,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.80
): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !dataUrl || !dataUrl.startsWith('data:image/') || dataUrl.startsWith('data:image/svg')) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Only resize if exceeds maximum dimensions
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      // Smooth downsampling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Export as optimized JPEG
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
