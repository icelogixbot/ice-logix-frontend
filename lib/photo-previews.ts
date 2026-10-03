// Утилита для безопасной работы с Blob-ссылками превью фотографий (memory hygiene)
// Предотвращает утечки оперативной памяти при загрузке и смене фотографий

const _photoBlobUrls = new Map<string, string>();

/**
 * Создает безопасный Blob URL с автоматическим освобождением предыдущего ресурса по ключу
 */
export function trackBlobUrl(key: string, file: File | Blob): string {
  if (typeof window === 'undefined') return '';

  const old = _photoBlobUrls.get(key);
  if (old) {
    URL.revokeObjectURL(old);
  }
  const url = URL.createObjectURL(file);
  _photoBlobUrls.set(key, url);
  return url;
}

/**
 * Освобождает Blob URL по префиксу или все сразу
 */
export function clearBlobUrls(prefix?: string): void {
  if (typeof window === 'undefined') return;

  for (const [key, url] of _photoBlobUrls.entries()) {
    if (!prefix || key.startsWith(prefix)) {
      URL.revokeObjectURL(url);
      _photoBlobUrls.delete(key);
    }
  }
}

/**
 * Сжатие изображения перед отправкой в API для экономии трафика и ускорения распознавания
 */
export async function compressImage(file: File, maxDimension = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
