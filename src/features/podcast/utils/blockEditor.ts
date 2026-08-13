import { extractSpotifyInfo } from '@/features/podcast/services/spotify';
import type { Block } from '@/shared/types/posts';

// Ported from rork-standard-app/expo's modules/feed/screens/CreatePostScreen.tsx
// and EditPostScreen.tsx — identical in both there (duplicated); shared here.
// Flat editable string fields per block type, converted to/from the real
// (nested `data`) Block shape only at the form's edges.
export type BlockEditor =
  | { type: 'text'; html: string }
  | { type: 'image'; url: string; caption: string }
  | { type: 'video'; url: string }
  | { type: 'quote'; text: string; author: string }
  | { type: 'embed'; rawUrl: string }
  | { type: 'gallery'; urls: string }
  | { type: 'link'; url: string; title: string; description: string }
  | { type: 'spotify'; url: string };

export function toBlock(editor: BlockEditor): Block | null {
  switch (editor.type) {
    case 'text':
      return { type: 'text', data: { html: editor.html } };
    case 'image':
      if (!editor.url) return null;
      return { type: 'image', data: { url: editor.url, caption: editor.caption || undefined } };
    case 'video':
      if (!editor.url) return null;
      return { type: 'video', data: { url: editor.url } };
    case 'quote':
      if (!editor.text) return null;
      return { type: 'quote', data: { text: editor.text, author: editor.author || undefined } };
    case 'embed': {
      const url = editor.rawUrl;
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const id = url.split('v=')[1]?.split('&')[0] ?? url.split('/').pop()?.split('?')[0] ?? '';
        if (!id) return null;
        return { type: 'embed', data: { platform: 'youtube', id } };
      }
      if (url.includes('vimeo.com')) {
        const id = url.split('/').pop()?.split('?')[0] ?? '';
        if (!id) return null;
        return { type: 'embed', data: { platform: 'vimeo', id } };
      }
      return null;
    }
    case 'gallery': {
      const urls = editor.urls.split('\n').map((u) => u.trim()).filter(Boolean);
      if (urls.length === 0) return null;
      return { type: 'gallery', data: { urls } };
    }
    case 'link':
      if (!editor.url) return null;
      return {
        type: 'link',
        data: { url: editor.url, title: editor.title || undefined, description: editor.description || undefined },
      };
    case 'spotify': {
      const info = extractSpotifyInfo(editor.url);
      if (!info) return null;
      return { type: 'spotify', data: { url: editor.url, ...info } };
    }
    default:
      return null;
  }
}

export function blockToEditor(block: Block): BlockEditor {
  switch (block.type) {
    case 'text':
      return { type: 'text', html: block.data.html };
    case 'image':
      return { type: 'image', url: block.data.url, caption: block.data.caption ?? '' };
    case 'video':
      return { type: 'video', url: block.data.url };
    case 'quote':
      return { type: 'quote', text: block.data.text, author: block.data.author ?? '' };
    case 'embed': {
      const base =
        block.data.platform === 'youtube'
          ? `https://www.youtube.com/watch?v=${block.data.id}`
          : `https://vimeo.com/${block.data.id}`;
      return { type: 'embed', rawUrl: base };
    }
    case 'gallery':
      return { type: 'gallery', urls: block.data.urls.join('\n') };
    case 'link':
      return {
        type: 'link',
        url: block.data.url,
        title: block.data.title ?? '',
        description: block.data.description ?? '',
      };
    case 'spotify':
      return { type: 'spotify', url: block.data.url };
  }
}

export function defaultEditor(type: BlockEditor['type']): BlockEditor {
  switch (type) {
    case 'text':
      return { type: 'text', html: '' };
    case 'image':
      return { type: 'image', url: '', caption: '' };
    case 'video':
      return { type: 'video', url: '' };
    case 'quote':
      return { type: 'quote', text: '', author: '' };
    case 'embed':
      return { type: 'embed', rawUrl: '' };
    case 'gallery':
      return { type: 'gallery', urls: '' };
    case 'link':
      return { type: 'link', url: '', title: '', description: '' };
    case 'spotify':
      return { type: 'spotify', url: '' };
  }
}

export const BLOCK_TYPES: Array<{ type: BlockEditor['type']; label: string }> = [
  { type: 'text', label: 'Text' },
  { type: 'image', label: 'Image' },
  { type: 'quote', label: 'Quote' },
  { type: 'video', label: 'Video' },
  { type: 'embed', label: 'YouTube' },
  { type: 'gallery', label: 'Gallery' },
  { type: 'link', label: 'Link' },
  { type: 'spotify', label: 'Spotify' },
];

export function isValidUrl(url: string): boolean {
  return /^https?:\/\/.+/.test(url.trim());
}
