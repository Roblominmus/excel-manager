'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { Upload, Folder, File, Download, Trash2, FolderPlus, FolderUp } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useFileManager as useFileManagerHook } from '@/hooks/useFileManager';
import { formatFileSize, formatDate } from '@/lib/utils';
import { getCurrentUserId } from '@/lib/supabase/client';

interface FileManagerProps {
  userId?: string;
  currentFolderId?: string;
  onFileSelect?: (url: string) => void;
}

interface DisplayItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  size?: number;
  storage_path?: string;
  parent_id?: string | null;
  folder_id?: string | null;
}

export default function FileManager({ userId: providedUserId, currentFolderId, onFileSelect }: FileManagerProps) {
  const { uploads, isUploading, uploadMultipleFiles } = useFileUpload(providedUserId || '', currentFolderId);
  const {
    folders,
    currentFolder,
    loading,
    error,
    createFolder,
    downloadFile,
    deleteFile,
    deleteFolder,
    moveFile,
    getFilesInFolder,
    getFileUrl,
    fetchFolderHierarchy,
  } = useFileManagerHook();
  
  const [userId, setUserId] = useState<string | null>(providedUserId || null);
  const [currentPath, setCurrentPath] = useState<Array<{ id: string | null; name: string }>>([
    { id: null, name: 'My Files' }
  ]);
  const [displayItems, setDisplayItems] = useState<DisplayItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  // Get current user if not provided
  useEffect(() => {
    if (!providedUserId) {
      const initUser = async () => {
        const id = await getCurrentUserId();
        if (id) setUserId(id);
      };
      initUser();
    }
  }, [providedUserId]);

  // Load folders AND files for current folder (FIX #1: Show both)
  useEffect(() => {
    const loadFoldersAndFiles = async () => {
      const currentFolderId = currentPath[currentPath.length - 1]?.id || null;
      
      // Get files
      const files = await getFilesInFolder(currentFolderId);
      
      // Get sub-folders at this level
      const findSubFolders = (folderList: any[], parentId: string | null): any[] => {
        const results: any[] = [];
        folderList.forEach((folder) => {
          if (folder.parent_id === parentId) {
            results.push(folder);
          }
          // Recursively search in children
          if (folder.children && folder.children.length > 0) {
            results.push(...findSubFolders(folder.children, parentId));
          }
        });
        return results;
      };
      
      const subFolders = findSubFolders(folders, currentFolderId);
      
      // Merge folders and files into display items
      const folderItems: DisplayItem[] = subFolders.map(f => ({
        id: f.id,
        name: f.name,
        type: 'folder' as const,
        parent_id: f.parent_id,
      }));
      
      const fileItems: DisplayItem[] = (files || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        type: 'file' as const,
        size: f.size,
        storage_path: f.storage_path,
        folder_id: f.folder_id,
      }));
      
      // Sort: folders first, then files
      setDisplayItems([...folderItems, ...fileItems]);
    };
    
    if (userId) {
      loadFoldersAndFiles();
    }
  }, [userId, currentPath, getFilesInFolder, folders]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFiles = Array.from(e.dataTransfer.files);
      uploadMultipleFiles(droppedFiles);
    },
    [uploadMultipleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        uploadMultipleFiles(selectedFiles);
      }
    },
    [uploadMultipleFiles]
  );

  // FIX #2: Handle folder upload
  const handleFolderInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        
        // Extract folder structure from webkitRelativePath
        const folderMap = new Map<string, string>(); // path -> folderId
        const currentFolderId = currentPath[currentPath.length - 1]?.id || null;
        
        // Get unique folder paths
        const folderPaths = new Set<string>();
        files.forEach(file => {
          const relativePath = (file as any).webkitRelativePath || file.name;
          const pathParts = relativePath.split('/');
          
          // Build folder hierarchy
          for (let i = 0; i < pathParts.length - 1; i++) {
            const folderPath = pathParts.slice(0, i + 1).join('/');
            folderPaths.add(folderPath);
          }
        });
        
        // Sort paths to create parent folders first
        const sortedPaths = Array.from(folderPaths).sort();
        
        // Create folders
        for (const path of sortedPaths) {
          const pathParts = path.split('/');
          const folderName = pathParts[pathParts.length - 1];
          const parentPath = pathParts.slice(0, -1).join('/');
          const parentId = parentPath ? folderMap.get(parentPath) || currentFolderId : currentFolderId;
          
          try {
            const newFolder = await createFolder(folderName, parentId);
            folderMap.set(path, newFolder.id);
          } catch (error) {
            console.error(`Failed to create folder ${folderName}:`, error);
          }
        }
        
        // Upload files to their respective folders
        for (const file of files) {
          const relativePath = (file as any).webkitRelativePath || file.name;
          const pathParts = relativePath.split('/');
          const folderPath = pathParts.slice(0, -1).join('/');
          const targetFolderId = folderPath ? folderMap.get(folderPath) || currentFolderId : currentFolderId;
          
          try {
            await uploadMultipleFiles([file], targetFolderId);
          } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
          }
        }
        
        // Refresh the hierarchy
        await fetchFolderHierarchy();
      }
    },
    [currentPath, createFolder, uploadMultipleFiles, fetchFolderHierarchy]
  );

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      const parentId = currentPath[currentPath.length - 1]?.id || null;
      await createFolder(newFolderName, parentId);
      setNewFolderName('');
      setShowNewFolderInput(false);
      await fetchFolderHierarchy();
    }
  };

  const handleDeleteSelected = async () => {
    for (const itemId of selectedItems) {
      const item = displayItems.find(i => i.id === itemId);
      if (item) {
        if (item.type === 'folder') {
          await deleteFolder(item.id);
        } else if (item.type === 'file' && item.storage_path) {
          await deleteFile(item.id, item.storage_path);
        }
      }
    }
    setSelectedItems(new Set());
    await fetchFolderHierarchy();
  };

  const handleNavigateFolder = (folderId: string | null, folderName: string) => {
    if (folderId === null) {
      setCurrentPath([{ id: null, name: 'My Files' }]);
    } else {
      setCurrentPath(prev => [...prev, { id: folderId, name: folderName }]);
    }
  };

  const handleNavigateToPath = (index: number) => {
    setCurrentPath(prev => prev.slice(0, index + 1));
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar - FIX #3: Larger text, better contrast */}
      <div className="border-b px-6 py-5 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Files</h2>
        <div className="flex gap-3">
          <button
            onClick={() => setShowNewFolderInput(!showNewFolderInput)}
            className="px-5 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 flex items-center gap-2 text-base font-medium"
          >
            <FolderPlus size={20} />
            New Folder
          </button>
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-base font-medium">
              <Upload size={20} />
              Upload Files
            </div>
          </label>
          <label className="cursor-pointer">
            <input
              type="file"
              /* @ts-ignore */
              webkitdirectory="true"
              directory="true"
              multiple
              onChange={handleFolderInput}
              className="hidden"
            />
            <div className="px-5 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-base font-medium">
              <FolderUp size={20} />
              Upload Folder
            </div>
          </label>
          {selectedItems.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-5 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-base font-medium"
            >
              <Trash2 size={20} />
              Delete ({selectedItems.size})
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb Navigation - FIX #3: Larger text */}
      <div className="border-b px-6 py-3 flex items-center gap-2 text-lg bg-gray-50">
        {currentPath.map((item, index) => (
          <React.Fragment key={index}>
            <button
              onClick={() => handleNavigateToPath(index)}
              className="text-blue-700 hover:underline font-medium"
            >
              {item.name}
            </button>
            {index < currentPath.length - 1 && <span className="text-gray-600">/</span>}
          </React.Fragment>
        ))}
      </div>

      {/* New Folder Input - FIX #3: Larger text and padding */}
      {showNewFolderInput && (
        <div className="border-b px-6 py-4 bg-blue-50 flex gap-3">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          <button
            onClick={handleCreateFolder}
            className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-base font-medium"
          >
            Create
          </button>
          <button
            onClick={() => {
              setShowNewFolderInput(false);
              setNewFolderName('');
            }}
            className="px-5 py-3 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 text-base font-medium"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Drop Zone & Content - FIX #3: Better spacing and larger text */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex-1 p-8 overflow-auto"
      >
        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-lg p-5 text-red-900 text-base font-medium">
            {error}
          </div>
        )}

        {isUploading && (
          <div className="mb-8 bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
            <h3 className="font-bold mb-4 text-lg text-gray-900">Uploading...</h3>
            {Object.entries(uploads).map(([id, upload]) => (
              <div key={id} className="mb-4">
                <div className="flex justify-between text-base mb-2 text-gray-900 font-medium">
                  <span>{upload.fileName}</span>
                  <span>{Math.round(upload.progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* File Grid - FIX #3: Larger icons, better spacing, higher contrast */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-16 text-gray-700 text-lg">
              <p>Loading...</p>
            </div>
          ) : displayItems.length === 0 && !isUploading ? (
            <div className="col-span-full text-center py-16 text-gray-700">
              <Upload size={64} className="mx-auto mb-6" />
              <p className="text-lg font-medium">Drop files here or click Upload Files</p>
            </div>
          ) : (
            displayItems.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleItemSelection(item.id)}
                onDoubleClick={async () => {
                  if (item.type === 'folder') {
                    handleNavigateFolder(item.id, item.name);
                  } else if (item.type === 'file' && item.storage_path) {
                    const url = await getFileUrl(item.storage_path);
                    if (url && onFileSelect) {
                      onFileSelect(url);
                    }
                  }
                }}
                className={`border-2 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-all ${
                  selectedItems.has(item.id) ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <div className="flex items-center gap-4 mb-3">
                  {item.type === 'folder' ? (
                    <Folder
                      size={40}
                      className="text-yellow-500 flex-shrink-0"
                    />
                  ) : (
                    <File size={40} className="text-blue-600 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate text-lg text-gray-900">{item.name}</p>
                    <p className="text-base text-gray-700 mt-1">
                      {item.size ? formatFileSize(item.size) : 'Folder'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
