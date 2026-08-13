import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { useState } from 'react';

import { usePodcastAdmin, type ImportResult } from '@/features/podcast/hooks/usePodcastAdmin';
import { parseImportJson, type ImportablePost } from '@/features/podcast/services/feedImport';

/**
 * File-based JSON import, platform-branched like
 * rork-standard-app/expo's PodcastImportScreen: native picks via
 * expo-document-picker + expo-file-system, web hands a File off from a
 * hidden <input type="file"> (screen-side, since that needs a DOM ref).
 */
export function usePodcastImport() {
  const { importPosts, submitting } = usePodcastAdmin();
  const [episodes, setEpisodes] = useState<ImportablePost[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  // Throws on invalid JSON — callers (screen event handlers) catch and show
  // their own error UI, rather than the hook reactively triggering alerts.
  const applyParsed = (raw: string, name: string) => {
    const parsed = parseImportJson(raw);
    setEpisodes(parsed);
    setFileName(name);
  };

  const pickNativeFile = async (): Promise<void> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const raw = await readAsStringAsync(asset.uri);
    applyParsed(raw, asset.name);
  };

  const handleWebFile = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          applyParsed(String(event.target?.result ?? ''), file.name);
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const submitEpisodes = async (): Promise<ImportResult> => {
    const posts = episodes.map((ep) => ({
      title: ep.title,
      coverUrl: ep.coverUrl,
      status: ep.status,
      publishAt: ep.publishAt ?? undefined,
      blocks: ep.blocks,
      socialMediaLinks: ep.socialMediaLinks,
    }));
    const result = await importPosts({ posts } as Parameters<typeof importPosts>[0]);
    setEpisodes([]);
    setFileName(null);
    return result;
  };

  return { episodes, fileName, submitting, pickNativeFile, handleWebFile, submitEpisodes };
}
