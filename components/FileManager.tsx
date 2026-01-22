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
      <div className="border-b bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">My Files</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewFolderInput(!showNewFolderInput)}
            className="btn px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-xl border-2 border-gray-200 hover:border-gray-300 flex items-center gap-2 text-sm font-semibold shadow-sm"
          >
            <FolderPlus size={18} />
            New Folder
          </button>
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="btn px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 flex items-center gap-2 text-sm font-semibold shadow-md">
              <Upload size={18} />
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
            <div className="btn px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 flex items-center gap-2 text-sm font-semibold shadow-md">
              <FolderUp size={18} />
              Upload Folder
            </div>
          </label>
          {selectedItems.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="btn px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 flex items-center gap-2 text-sm font-semibold shadow-md"
            >
              <Trash2 size={18} />
              Delete ({selectedItems.size})
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb Navigation - FIX #3: Larger text */}
      <div className="border-b px-6 py-3 flex items-center gap-2 text-base bg-gradient-to-r from-gray-50 to-blue-50">
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        {currentPath.map((item, index) => (
          <React.Fragment key={index}>
            <button
              onClick={() => handleNavigateToPath(index)}
              className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors"
            >
              {item.name}
            </button>
            {index < currentPath.length - 1 && <span className="text-gray-400 font-bold">/</span>}
          </React.Fragment>
        ))}
      </div>

      {/* New Folder Input - FIX #3: Larger text and padding */}
      {showNewFolderInput && (
        <div className="border-b px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 flex gap-3 shadow-sm">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Enter folder name..."
            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base shadow-sm"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          <button
            onClick={handleCreateFolder}
            className="btn px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 text-base font-semibold shadow-md"
          >
            Create
          </button>
          <button
            onClick={() => {
              setShowNewFolderInput(false);
              setNewFolderName('');
            }}
            className="btn px-5 py-3 bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-700 rounded-xl hover:border-gray-300 text-base font-semibold shadow-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Drop Zone & Content - FIX #3: Better spacing and larger text */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex-1 p-6 overflow-auto bg-gradient-to-br from-gray-50 to-blue-50"
      >
        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-xl p-5 text-red-900 text-base font-medium shadow-md">
            {error}
          </div>
        )}

        {isUploading && (
          <div className="mb-6 bg-white border-2 border-blue-200 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Upload className="text-blue-600" size={20} />
              </div>
              <h3 className="font-bold text-lg text-gray-900">Uploading files...</h3>
            </div>
            {Object.entries(uploads).map(([id, upload]) => (
              <div key={id} className="mb-4 last:mb-0">
                <div className="flex justify-between text-sm mb-2 text-gray-900 font-medium">
                  <span className="truncate flex-1">{upload.fileName}</span>
                  <span className="ml-3 font-bold text-blue-600">{Math.round(upload.progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-purple-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* File Grid - FIX #3: Larger icons, better spacing, higher contrast */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-16">
              <div className="flex gap-2 mb-6 justify-center">
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-3 h-3 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <p className="text-gray-600 font-medium">Loading your files...</p>
            </div>
          ) : displayItems.length === 0 && !isUploading ? (
            <div className="col-span-full text-center py-20">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <Upload size={56} className="text-white" />
              </div>
              <p className="text-xl font-bold text-gray-900 mb-2">No files yet</p>
              <p className="text-base text-gray-600">Drop files here or click Upload Files to get started</p>
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
                className={`card hover-lift cursor-pointer p-5 transition-all ${
                  selectedItems.has(item.id) ? 'ring-2 ring-blue-600 bg-blue-50 shadow-lg' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.type === 'folder' ? (
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                      <Folder size={24} className="text-white" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                      <File size={24} className="text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate text-base text-gray-900 mb-1">{item.name}</p>
                    <p className="text-sm text-gray-600 font-medium">
                      {item.size ? formatFileSize(item.size) : 'Folder'}
                    </p>
                  </div>
                  {selectedItems.has(item.id) && (
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
