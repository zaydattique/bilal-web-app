'use client';

import { useRef, useState } from 'react';
import api from '@/lib/api';

export interface MediaItem {
  _id: string;
  publicUrl: string;
  altText?: string;
  originalName?: string;
  purpose: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
}

interface MediaUploadProps {
  purpose: string;
  value: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
  label?: string;
}

export default function MediaUpload({
  purpose,
  value,
  onChange,
  multiple = false,
  label = 'Upload image',
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError('');

    try {
      const selected = Array.from(files);
      const ids: string[] = [];

      for (const file of selected) {
        const form = new FormData();
        form.append('file', file);
        form.append('purpose', purpose);

        const result = await api.post<{ success: boolean; media: MediaItem }>(
          '/api/admin/media',
          form
        );
        ids.push(result.media._id);
      }

      onChange(multiple ? [...value, ...ids] : ids.slice(0, 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn-secondary text-sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? 'Uploading…' : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple={multiple}
        className="hidden"
        onChange={(e) => void uploadFiles(e.target.files)}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {value.length > 0 && (
        <p className="text-xs text-gray-500">
          {value.length} image{value.length === 1 ? '' : 's'} selected. Manage uploads from Media.
        </p>
      )}
    </div>
  );
}
