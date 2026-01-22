'use client';

import { useState, useCallback } from 'react';
import { useFileManager } from './useFileManager';
import { getUniqueFilename } from '@/lib/utils';

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

/**
 * Hook for uploading files to Supabase Storage
 * Integrates with useFileManager for metadata tracking
 */
export function useFileUpload(userId: string, parentFolderId?: string) {
  const { uploadFile: uploadFileToManager, getFilesInFolder } = useFileManager();
  const [uploads, setUploads] = useState<Record<string, UploadProgress>>({});
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(
    async (file: File, targetFolderId?: string | null, autoRename: boolean = true) => {
      const fileId = `${Date.now()}-${file.name}`;
      const folderId = targetFolderId !== undefined ? targetFolderId : (parentFolderId || null);

      setUploads(prev => ({
        ...prev,
        [fileId]: { fileName: file.name, progress: 0, status: 'uploading' },
      }));
      setIsUploading(true);

      try {
        // Check for duplicate filenames
        let finalFileName = file.name;
        if (autoRename) {
          const existingFiles = await getFilesInFolder(folderId);
          const existingNames = existingFiles.map((f: any) => f.name);
          finalFileName = getUniqueFilename(file.name, existingNames);
          
          // If renamed, create a new File object with the new name
          if (finalFileName !== file.name) {
            const renamedFile = new File([file], finalFileName, { type: file.type });
            file = renamedFile;
          }
        }

        // Simulate progress (Supabase doesn't provide real-time progress for now)
        setUploads(prev => ({
          ...prev,
          [fileId]: { ...prev[fileId], progress: 30, fileName: finalFileName },
        }));

        // Upload via useFileManager hook
        await uploadFileToManager(file, folderId);

        setUploads(prev => ({
          ...prev,
          [fileId]: { ...prev[fileId], progress: 100, status: 'completed', fileName: finalFileName },
        }));
        setIsUploading(false);
      } catch (error: any) {
        console.error('[useFileUpload] Upload error:', error);
        setUploads(prev => ({
          ...prev,
          [fileId]: { 
            ...prev[fileId], 
            status: 'error', 
            error: error.message || 'Upload failed' 
          },
        }));
        setIsUploading(false);
        throw error;
      }
    },
    [uploadFileToManager, parentFolderId, getFilesInFolder]
  );

  const uploadMultipleFiles = useCallback(
    async (files: File[], targetFolderId?: string | null) => {
      setIsUploading(true);
      const uploadPromises = files.map(file => uploadFile(file, targetFolderId));
      
      try {
        await Promise.all(uploadPromises);
      } finally {
        setIsUploading(false);
      }
    },
    [uploadFile]
  );

  const clearUploads = useCallback(() => {
    setUploads({});
  }, []);

  return {
    uploads,
    isUploading,
    uploadFile,
    uploadMultipleFiles,
    clearUploads,
  };
}

