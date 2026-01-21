'use client';

import { useState, useCallback } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { sanitizeFilename } from '@/lib/utils';

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export function useFileUpload(userId: string, parentFolderId?: string) {
  const [uploads, setUploads] = useState<Record<string, UploadProgress>>({});
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!storage || !db) {
        throw new Error('Firebase not initialized');
      }

      const fileId = `${Date.now()}-${file.name}`;
      const sanitizedName = sanitizeFilename(file.name);
      const storagePath = `users/${userId}/files/${sanitizedName}`;

      setUploads(prev => ({
        ...prev,
        [fileId]: { fileName: file.name, progress: 0, status: 'uploading' },
      }));
      setIsUploading(true);

      try {
        // Upload to Firebase Storage
        const storageRef = ref(storage, storagePath);
        const uploadTask: UploadTask = uploadBytesResumable(storageRef, file);

        return new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploads(prev => ({
                ...prev,
                [fileId]: { ...prev[fileId], progress },
              }));
            },
            (error) => {
              setUploads(prev => ({
                ...prev,
                [fileId]: { ...prev[fileId], status: 'error', error: error.message },
              }));
              setIsUploading(false);
              reject(error);
            },
            async () => {
              // Upload completed
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

              // Save metadata to Firestore
              if (db) {
                await addDoc(collection(db, 'files'), {
                  name: file.name,
                  path: storagePath,
                  downloadURL,
                  size: file.size,
                  type: file.type,
                  userId,
                  parentId: parentFolderId || null,
                  isFolder: false,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
              }

              setUploads(prev => ({
                ...prev,
                [fileId]: { ...prev[fileId], progress: 100, status: 'completed' },
              }));
              setIsUploading(false);
              resolve();
            }
          );
        });
      } catch (error: any) {
        setUploads(prev => ({
          ...prev,
          [fileId]: { ...prev[fileId], status: 'error', error: error.message },
        }));
        setIsUploading(false);
        throw error;
      }
    },
    [userId, parentFolderId]
  );

  const uploadMultipleFiles = useCallback(
    async (files: File[]) => {
      setIsUploading(true);
      const uploadPromises = files.map(file => uploadFile(file));
      
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
