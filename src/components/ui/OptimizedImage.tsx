import { ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
}

export function OptimizedImage({ 
  src, 
  alt, 
  fallback = '/placeholder.svg',
  className,
  ...props 
}: OptimizedImageProps) {
  return (
    <img
      src={src || fallback}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.src = fallback;
      }}
      className={cn('object-cover', className)}
      {...props}
    />
  );
}
