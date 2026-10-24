/**
 * Resizes and compresses an image file using HTML5 Canvas.
 * Supports JPEG, PNG, and WebP, exporting to a compressed JPEG file.
 */
export async function compressImage(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    // Only compress image files
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Resize only if image is bigger than max size, maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
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
          return reject(new Error('Failed to get canvas 2D context'));
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            
            // Generate standard extension name (.jpg)
            let newName = file.name;
            const extIndex = newName.lastIndexOf('.');
            if (extIndex !== -1) {
              newName = newName.substring(0, extIndex) + '.jpg';
            } else {
              newName = newName + '.jpg';
            }

            const compressedFile = new File([blob], newName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (error) => {
        reject(error);
      };
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
}
