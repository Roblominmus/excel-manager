'use client';

import { useState, useCallback } from 'react';
import { useFileManager } from './useFileManager';
import { sanitizeFilename } from '@/lib/utils';

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

  /**
   * Get unique filename by adding (1), (2), etc. if name already exists
   */
  const getUniqueFileName = useCallback(
    async (name: string, folderId: string | null): Promise<string> => {
      try {
        const existingFiles = await getFilesInFolder(folderId);
        const names = existingFiles.map((f: any) => f.name);
        
        if (!names.includes(name)) return name;
        
        const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
        const baseName = name.replace(new RegExp(ext + '$'), '');
        let counter = 1;
        
        while (names.includes(`${baseName}(${counter})${ext}`)) {
          counter++;
        }
        
        return `${baseName}(${counter})${ext}`;
      } catch (error) {
        console.error('Error checking for duplicate filenames:', error);
        return name; // Fallback to original name
      }
    },
    [getFilesInFolder]
  );

  const uploadFile = useCallback(
    async (file: File, targetFolderId?: string | null) => {
      const fileId = `${Date.now()}-${file.name}`;
      const folderId = targetFolderId !== undefined ? targetFolderId : (parentFolderId || null);

      setUploads(prev => ({
        ...prev,
        [fileId]: { fileName: file.name, progress: 0, status: 'uploading' },
      }));
      setIsUploading(true);

      try {
        // Get unique filename to avoid duplicates
        const uniqueFileName = await getUniqueFileName(file.name, folderId);
        
        // Create a new file with the unique name if needed
        const fileToUpload = uniqueFileName !== file.name
          ? new File([file], uniqueFileName, { type: file.type })
          : file;

        // Simulate progress (Supabase doesn't provide real-time progress for now)
        setUploads(prev => ({
          ...prev,
          [fileId]: { ...prev[fileId], progress: 30 },
        }));

        // Upload via useFileManager hook
        await uploadFileToManager(fileToUpload, folderId);

        setUploads(prev => ({
          ...prev,
          [fileId]: { ...prev[fileId], progress: 100, status: 'completed' },
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
    [uploadFileToManager, parentFolderId, getUniqueFileName]
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

