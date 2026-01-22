/**
 * File Manager Hook - Virtual Folder Structure with Supabase
 * 
 * This hook manages the virtual folder hierarchy and file operations.
 * Since Supabase Storage buckets are flat, we use a database table
 * to maintain the folder structure.
 * 
 * Features:
 * - Fetch folder hierarchy
 * - Create/rename/delete folders
 * - Upload/download/delete files
 * - Move files between folders
 * - All operations respect RLS (user can only access their own data)
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUserId } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';

type Folder = Database['public']['Tables']['folders']['Row'];
type FileRecord = Database['public']['Tables']['files']['Row'];

export interface FolderNode extends Folder {
  children: FolderNode[];
  files: FileRecord[];
}

export interface FileManagerState {
  folders: FolderNode[];
  currentFolder: FolderNode | null;
  loading: boolean;
  error: string | null;
}

export function useFileManager() {
  const [state, setState] = useState<FileManagerState>({
    folders: [],
    currentFolder: null,
    loading: true,
    error: null,
  });

  /**
   * Fetch all folders and files for the current user
   */
  const fetchFolderHierarchy = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Fetch all folders for the user
      const { data: foldersData, error: folderError } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (folderError) throw folderError;

      // Fetch all files for the user
      const { data: filesData, error: fileError } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (fileError) throw fileError;

      const folders = (foldersData as any[]) || [];
      const files = (filesData as any[]) || [];

      // Build folder hierarchy
      const folderMap = new Map<string, FolderNode>();
      const rootFolders: FolderNode[] = [];

      // Initialize all folders
      folders.forEach((folder) => {
        folderMap.set(folder.id, {
          ...folder,
          children: [],
          files: [],
        });
      });

      // Build parent-child relationships
      folders.forEach((folder) => {
        const node = folderMap.get(folder.id)!;
        if (folder.parent_id) {
          const parent = folderMap.get(folder.parent_id);
          if (parent) {
            parent.children.push(node);
          }
        } else {
          rootFolders.push(node);
        }
      });

      // Attach files to their folders
      files.forEach((file) => {
        if (file.folder_id) {
          const folder = folderMap.get(file.folder_id);
          if (folder) {
            folder.files.push(file);
          }
        }
      });

      setState({
        folders: rootFolders,
        currentFolder: null,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('[FileManager] Error fetching hierarchy:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  }, []);

  /**
   * Create a new folder
   */
  const createFolder = useCallback(
    async (name: string, parentId: string | null = null) => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('User not authenticated');

        const { data, error } = await (supabase as any)
          .from('folders')
          .insert([
            {
              name,
              parent_id: parentId,
              user_id: userId,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        // Refresh hierarchy
        await fetchFolderHierarchy();
        return data;
      } catch (error: any) {
        console.error('[FileManager] Error creating folder:', error);
        throw error;
      }
    },
    [fetchFolderHierarchy]
  );

  /**
   * Rename a folder
   */
  const renameFolder = useCallback(
    async (folderId: string, newName: string) => {
      try {
        const { error } = await (supabase as any)
          .from('folders')
          .update({ name: newName })
          .eq('id', folderId);

        if (error) throw error;

        await fetchFolderHierarchy();
      } catch (error: any) {
        console.error('[FileManager] Error renaming folder:', error);
        throw error;
      }
    },
    [fetchFolderHierarchy]
  );

  /**
   * Delete a folder and all its contents (cascading)
   */
  const deleteFolder = useCallback(
    async (folderId: string) => {
      try {
        // Note: Cascade delete should be handled by database triggers
        // or you need to manually delete all child folders and files
        const { error } = await (supabase as any)
          .from('folders')
          .delete()
          .eq('id', folderId);

        if (error) throw error;

        await fetchFolderHierarchy();
      } catch (error: any) {
        console.error('[FileManager] Error deleting folder:', error);
        throw error;
      }
    },
    [fetchFolderHierarchy]
  );

  /**
   * Upload a file to Supabase Storage and create database record
   */
  const uploadFile = useCallback(
    async (file: File, folderId: string | null = null) => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('User not authenticated');

        // Generate unique file path for storage
        const timestamp = Date.now();
        const storagePath = `${userId}/${timestamp}_${file.name}`;

        // Upload to storage bucket
        const { data: uploadData, error: uploadError } = await (supabase.storage as any)
          .from('spreadsheets')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Create database record
        const { data: fileRecord, error: dbError } = await (supabase as any)
          .from('files')
          .insert([
            {
              name: file.name,
              folder_id: folderId,
              storage_path: storagePath,
              user_id: userId,
              size: file.size,
              mime_type: file.type,
            },
          ])
          .select()
          .single();

        if (dbError) throw dbError;

        // Refresh hierarchy
        await fetchFolderHierarchy();
        return fileRecord;
      } catch (error: any) {
        console.error('[FileManager] Error uploading file:', error);
        throw error;
      }
    },
    [fetchFolderHierarchy]
  );

  /**
   * Download a file from storage
   */
  const downloadFile = useCallback(async (fileRecord: FileRecord) => {
    try {
      const { data, error } = await supabase.storage
        .from('spreadsheets')
        .download(fileRecord.storage_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileRecord.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('[FileManager] Error downloading file:', error);
      throw error;
    }
  }, []);

  /**
   * Delete a file (from both storage and database)
   */
  const deleteFile = useCallback(
    async (fileId: string, storagePath: string) => {
      try {
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('spreadsheets')
          .remove([storagePath]);

        if (storageError) {
          console.warn('[FileManager] Storage delete warning:', storageError);
        }

        // Delete from database
        const { error: dbError } = await (supabase as any)
          .from('files')
          .delete()
          .eq('id', fileId);

        if (dbError) throw dbError;

        await fetchFolderHierarchy();
      } catch (error: any) {
        console.error('[FileManager] Error deleting file:', error);
        throw error;
      }
    },
    [fetchFolderHierarchy]
  );

  /**
   * Move a file to a different folder
   */
  const moveFile = useCallback(
    async (fileId: string, newFolderId: string | null) => {
      try {
        const { error } = await (supabase as any)
          .from('files')
          .update({ folder_id: newFolderId })
          .eq('id', fileId);

        if (error) throw error;

        await fetchFolderHierarchy();
      } catch (error: any) {
        console.error('[FileManager] Error moving file:', error);
        throw error;
      }
    },
    [fetchFolderHierarchy]
  );

  /**
   * Get files in a specific folder (or root if null)
   */
  const getFilesInFolder = useCallback(
    async (folderId: string | null) => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('User not authenticated');

        let query = (supabase as any)
          .from('files')
          .select('*')
          .eq('user_id', userId);

        if (folderId === null) {
          query = query.is('folder_id', null);
        } else {
          query = query.eq('folder_id', folderId);
        }

        const { data, error } = await query.order('name');

        if (error) throw error;
        return data || [];
      } catch (error: any) {
        console.error('[FileManager] Error fetching files:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Get a temporary signed URL for a private file
   */
  const getFileUrl = useCallback(async (storagePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('spreadsheets')
        .createSignedUrl(storagePath, 3600); // Valid for 1 hour

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('[FileManager] Error getting signed URL:', error);
      return null;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchFolderHierarchy();
  }, [fetchFolderHierarchy]);

  return {
    ...state,
    fetchFolderHierarchy,
    createFolder,
    renameFolder,
    deleteFolder,
    uploadFile,
    downloadFile,
    deleteFile,
    moveFile,
    getFilesInFolder,
    getFileUrl,
  };
}
