import React, { useRef, useState } from 'react';
import { ImagePlus, RefreshCw, Star, Trash2, Upload, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { isSupabaseConfigured } from '../../lib/supabase';
import type { ProductImage } from '../../types/database';
import { validateProductImageFileMeta } from '../../utils/validation';

export interface PendingUploadFile {
  id: string;
  file: File;
  previewUrl: string;
}

interface ProductImageManagerProps {
  existingImages: ProductImage[];
  pendingFiles: PendingUploadFile[];
  onAddPendingFiles: (files: PendingUploadFile[]) => void;
  onRemovePendingFile: (pendingId: string) => void;
  onSetPrimaryExisting?: (image: ProductImage) => Promise<void>;
  onReplaceExisting?: (image: ProductImage, newFile: File) => Promise<void>;
  onDeleteExisting?: (image: ProductImage) => Promise<void>;
  uploadProgress: { completed: number; total: number } | null;
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ProductImageManager: React.FC<ProductImageManagerProps> = ({
  existingImages,
  pendingFiles,
  onAddPendingFiles,
  onRemovePendingFile,
  onSetPrimaryExisting,
  onReplaceExisting,
  onDeleteExisting,
  uploadProgress,
  disabled = false,
}) => {
  const isOnline = useOnlineStatus();
  const effectiveDisabled = disabled || !isOnline;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<ProductImage | null>(null);
  const [busyImageId, setBusyImageId] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleIncomingFiles = (fileList: FileList | null) => {
    if (!isOnline) {
      setImageError('Image uploads require an active internet connection.');
      return;
    }
    if (!fileList || fileList.length === 0) return;
    setImageError(null);

    const accepted: PendingUploadFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const check = validateProductImageFileMeta({
        name: file.name,
        type: file.type,
        size: file.size,
      });

      if (!check.valid) {
        setImageError(check.error || 'Unsupported file.');
        continue;
      }

      accepted.push({
        id: `${Date.now()}-${i}-${file.name}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (accepted.length > 0) {
      onAddPendingFiles(accepted);
    }
  };

  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !replaceTarget || !onReplaceExisting) return;

    const check = validateProductImageFileMeta({
      name: file.name,
      type: file.type,
      size: file.size,
    });
    if (!check.valid) {
      setImageError(check.error || 'Invalid replacement file.');
      setReplaceTarget(null);
      return;
    }

    setImageError(null);
    setBusyImageId(replaceTarget.id);
    try {
      await onReplaceExisting(replaceTarget, file);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Failed to replace image.');
    } finally {
      setBusyImageId(null);
      setReplaceTarget(null);
    }
  };

  const handleSetPrimary = async (image: ProductImage) => {
    if (!onSetPrimaryExisting || image.is_primary) return;
    setImageError(null);
    setBusyImageId(image.id);
    try {
      await onSetPrimaryExisting(image);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Unable to set primary image.');
    } finally {
      setBusyImageId(null);
    }
  };

  const handleDeleteExisting = async (image: ProductImage) => {
    if (!onDeleteExisting) return;
    setImageError(null);
    setBusyImageId(image.id);
    try {
      await onDeleteExisting(image);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Unable to delete image.');
    } finally {
      setBusyImageId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="block text-sm font-medium text-neutral-800">Product images</span>
        <span className="text-xs text-neutral-500">JPEG, PNG, WebP · Max 5 MB each</span>
      </div>

      {!isSupabaseConfigured && (
        <p className="text-xs text-neutral-500">
          Local preview mode: image previews are stored in browser preview storage until Supabase
          Storage is connected.
        </p>
      )}

      {!isOnline && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"
        >
          <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>You are offline. Image uploads and edits require connectivity.</span>
        </div>
      )}

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!effectiveDisabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!effectiveDisabled) handleIncomingFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border border-dashed p-4 text-center transition-colors ${
          isDragging
            ? 'border-emerald-700 bg-emerald-50/50'
            : 'border-neutral-300 bg-neutral-50/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={effectiveDisabled}
          aria-label="Upload product images"
          onChange={(e) => {
            handleIncomingFiles(e.target.files);
            e.target.value = '';
          }}
          className="sr-only"
        />

        <input
          ref={replaceInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={effectiveDisabled}
          aria-label="Replace product image"
          onChange={(e) => void handleReplaceFileChange(e)}
          className="sr-only"
        />

        <div className="flex flex-col items-center gap-2 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-neutral-200 text-neutral-600">
            <ImagePlus className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-xs text-neutral-600">
            Drag and drop images here, or select files from your device
          </p>
          <button
            type="button"
            disabled={effectiveDisabled}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Choose Images</span>
          </button>
        </div>
      </div>

      {uploadProgress && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <div className="flex items-center justify-between text-xs font-medium text-neutral-700">
            <span>Uploading images...</span>
            <span className="font-mono tabular-nums">
              {uploadProgress.completed}/{uploadProgress.total}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full bg-emerald-700 transition-all duration-200"
              style={{
                width: `${Math.round(
                  (uploadProgress.completed / Math.max(uploadProgress.total, 1)) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {imageError && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {imageError}
        </p>
      )}

      {/* Existing Uploaded Images */}
      {existingImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-neutral-600">Uploaded Images</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {existingImages.map((img) => {
              const isBusy = busyImageId === img.id;
              const src = img.public_url || img.storage_path;
              return (
                <div
                  key={img.id}
                  className="overflow-hidden rounded-lg border border-neutral-200 bg-white"
                >
                  <div className="relative aspect-[4/3] bg-neutral-100">
                    <img
                      src={src}
                      alt={img.alt_text || 'Product image'}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-2 space-y-2">
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <span
                        className={
                          img.is_primary
                            ? 'font-semibold text-emerald-700'
                            : 'text-neutral-500'
                        }
                      >
                        {img.is_primary ? 'Primary image' : 'Gallery image'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {!img.is_primary && onSetPrimaryExisting && (
                        <button
                          type="button"
                          disabled={disabled || isBusy}
                          onClick={() => void handleSetPrimary(img)}
                          aria-label="Set as primary image"
                          title="Set as primary"
                          className="min-h-[36px] flex-1 inline-flex items-center justify-center gap-1 rounded border border-neutral-200 px-2 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                        >
                          <Star className="h-3 w-3" aria-hidden="true" />
                          <span>Primary</span>
                        </button>
                      )}
                      {onReplaceExisting && (
                        <button
                          type="button"
                          disabled={disabled || isBusy}
                          onClick={() => {
                            setReplaceTarget(img);
                            replaceInputRef.current?.click();
                          }}
                          aria-label="Replace image"
                          title="Replace image"
                          className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded border border-neutral-200 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                      {onDeleteExisting && (
                        <button
                          type="button"
                          disabled={disabled || isBusy}
                          onClick={() => void handleDeleteExisting(img)}
                          aria-label="Delete image"
                          title="Delete image"
                          className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded border border-neutral-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Files Preview Before Upload */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-neutral-600">
            Ready to upload ({pendingFiles.length})
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pendingFiles.map((item, idx) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-lg border border-neutral-200 bg-white"
              >
                <div className="aspect-[4/3] bg-neutral-100">
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-neutral-800">
                      {item.file.name}
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      {existingImages.length === 0 && idx === 0
                        ? `Primary · ${formatFileSize(item.file.size)}`
                        : formatFileSize(item.file.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onRemovePendingFile(item.id)}
                    aria-label={`Remove ${item.file.name}`}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-red-600 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
