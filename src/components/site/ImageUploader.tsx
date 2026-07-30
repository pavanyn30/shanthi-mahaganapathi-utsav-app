import React, { useState } from 'react';
import { Upload, CheckCircle2, FileImage, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { compressAndConvertToWebP, type CompressedImageResult } from '@/lib/image-optimizer';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Button } from '@/components/ui/button';

export interface ImageUploaderProps {
  onImageOptimized: (result: CompressedImageResult) => void;
  label?: string;
  maxDimension?: number;
  quality?: number;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageOptimized,
  label = 'Upload Image (Auto WebP Optimization)',
  maxDimension = 1920,
  quality = 0.85,
  className = '',
}) => {
  const [compressing, setCompressing] = useState<boolean>(false);
  const [result, setResult] = useState<CompressedImageResult | null>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WebP, etc.)');
      return;
    }

    setCompressing(true);
    try {
      const optResult = await compressAndConvertToWebP(file, {
        maxWidth: maxDimension,
        maxHeight: maxDimension,
        quality,
        format: 'webp',
      });

      setResult(optResult);
      onImageOptimized(optResult);

      const savings = Math.round(
        ((optResult.originalSize - optResult.compressedSize) / optResult.originalSize) * 100
      );
      toast.success(
        `Image optimized to WebP! ${savings > 0 ? `Saved ${savings}% file size.` : ''}`
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to compress image');
    } finally {
      setCompressing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-secondary/30 p-6 text-center transition-colors hover:border-primary hover:bg-secondary/60"
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="absolute inset-0 cursor-pointer opacity-0"
        />

        {compressing ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-semibold">Converting to WebP & compressing...</p>
          </div>
        ) : result ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm font-bold text-foreground">WebP Image Ready</p>
              <p className="text-xs text-muted-foreground">
                {(result.compressedSize / 1024).toFixed(1)} KB (Original:{' '}
                {(result.originalSize / 1024).toFixed(1)} KB)
              </p>
            </div>
            <Button size="sm" variant="outline" className="rounded-full">
              Replace Image
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl gradient-saffron text-primary-foreground shadow-sm">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Drag & drop or click to choose · Auto WebP conversion
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Preview Section */}
      {result && (
        <div className="card-premium overflow-hidden p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Optimized WebP Preview
            </span>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {result.width} × {result.height} px
            </span>
          </div>

          <div className="mt-3 aspect-16/9 w-full overflow-hidden rounded-2xl">
            <OptimizedImage
              src={result.dataUrl}
              blurDataURL={result.blurDataUrl}
              alt="Optimized preview"
              aspectRatio="16/9"
              containerClassName="h-full w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};
