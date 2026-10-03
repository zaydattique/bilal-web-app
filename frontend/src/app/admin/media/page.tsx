'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { MediaItem } from '@/components/admin/MediaUpload';

interface MediaRecord extends MediaItem {
  originalName: string;
  sizeBytes: number;
  createdAt: string;
}

export default function MediaPage() {
  const { admin } = useAuth();
  const [media, setMedia] = useState<MediaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purpose, setPurpose] = useState('all');
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = async () => {
    if (!admin) return;
    setLoading(true);
    try {
      const query = purpose === 'all' ? '' : `&purpose=${encodeURIComponent(purpose)}`;
      const result = await api.get<{ success: boolean; media: MediaRecord[] }>(
        `/api/admin/media?page=1&limit=50${query}`
      );
      setMedia(result.media);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [admin, purpose]);

  const deleteMedia = async (id: string) => {
    if (!window.confirm('Delete this media permanently from storage?')) return;
    try {
      await api.delete<{ success: boolean }>(`/api/admin/media/${id}`);
      setMedia((items) => items.filter((item) => item._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const replaceMedia = async (id: string, file: File) => {
    setReplacingId(id);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const result = await api.put<{ success: boolean; media: MediaRecord }>(
        `/api/admin/media/${id}`,
        form
      );
      setMedia((items) => items.map((item) => (item._id === id ? result.media : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Replace failed');
    } finally {
      setReplacingId(null);
      const input = inputRefs.current[id];
      if (input) input.value = '';
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading media…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Media Library</h1>
          <p className="text-sm text-gray-500">
            Durable admin-uploaded images stored outside the application filesystem.
          </p>
        </div>
        <select
          className="input w-auto"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        >
          <option value="all">All media</option>
          <option value="logo">Logo</option>
          <option value="logo_light">Light logo</option>
          <option value="logo_dark">Dark logo</option>
          <option value="logo_icon">Icon logo</option>
          <option value="favicon">Favicon</option>
          <option value="og_image">OG image</option>
          <option value="product">Product</option>
          <option value="category">Category</option>
          <option value="banner">Banner</option>
          <option value="general">General</option>
        </select>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {media.length === 0 ? (
        <div className="card py-12 text-center text-sm text-gray-500">No media uploaded yet.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {media.map((item) => (
            <div key={item._id} className="card overflow-hidden p-0">
              <div className="aspect-square bg-gray-100">
                <img
                  src={item.publicUrl}
                  alt={item.altText || item.originalName}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="space-y-2 p-4">
                <p className="truncate text-sm font-medium">{item.originalName}</p>
                <p className="text-xs text-gray-500">
                  {item.purpose} · {item.width}×{item.height}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary flex-1 text-xs"
                    disabled={replacingId === item._id}
                    onClick={() => inputRefs.current[item._id]?.click()}
                  >
                    {replacingId === item._id ? 'Replacing…' : 'Replace'}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                    onClick={() => void deleteMedia(item._id)}
                  >
                    Delete
                  </button>
                </div>
                <input
                  ref={(node) => {
                    inputRefs.current[item._id] = node;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void replaceMedia(item._id, file);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
