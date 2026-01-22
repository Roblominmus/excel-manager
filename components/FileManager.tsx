'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { Upload, Folder, File, Download, Trash2, FolderPlus } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useFileManager as useFileManagerHook } from '@/hooks/useFileManager';
import { formatFileSize, formatDate } from '@/lib/utils';
import { getCurrentUserId } from '@/lib/supabase/client';

interface FileManagerProps {
  userId?: string;
  currentFolderId?: string;
  onFileSelect?: (url: string) => void;
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
    moveFile,
    getFilesInFolder,
  } = useFileManagerHook();
  
  const [userId, setUserId] = useState<string | null>(providedUserId || null);
  const [currentPath, setCurrentPath] = useState<Array<{ id: string | null; name: string }>>([
    { id: null, name: 'My Files' }
  ]);
  const [pathFiles, setPathFiles] = useState<any[]>([]);
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

  // Load files for current folder
  useEffect(() => {
    const loadFiles = async () => {
      const currentFolderId = currentPath[currentPath.length - 1]?.id || null;
      const files = await getFilesInFolder(currentFolderId);
      setPathFiles(files || []);
    };
    if (userId) {
      loadFiles();
    }
  }, [userId, currentPath, getFilesInFolder]);

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
    }
  };

  const handleDeleteSelected = async () => {
    for (const itemId of selectedItems) {
      const item = pathFiles.find(f => f.id === itemId);
      if (item) {
        if ('folder_id' in item || 'storage_path' in item) {
          // It's a file
          await deleteFile(item.id, item.storage_path);
        }
      }
    }
    setSelectedItems(new Set());
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
      {/* Toolbar */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">My Files</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewFolderInput(!showNewFolderInput)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 flex items-center gap-2"
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
            <div className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Upload size={18} />
              Upload Files
            </div>
          </label>
          {selectedItems.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <Trash2 size={18} />
              Delete ({selectedItems.size})
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="border-b px-6 py-2 flex items-center gap-2 text-sm bg-gray-50">
        {currentPath.map((item, index) => (
          <React.Fragment key={index}>
            <button
              onClick={() => handleNavigateToPath(index)}
              className="text-blue-600 hover:underline"
            >
              {item.name}
            </button>
            {index < currentPath.length - 1 && <span className="text-gray-400">/</span>}
          </React.Fragment>
        ))}
      </div>

      {/* New Folder Input */}
      {showNewFolderInput && (
        <div className="border-b px-6 py-3 bg-blue-50 flex gap-2">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          <button
            onClick={handleCreateFolder}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create
          </button>
          <button
            onClick={() => {
              setShowNewFolderInput(false);
              setNewFolderName('');
            }}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Drop Zone & Content */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex-1 p-6 overflow-auto"
      >
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {isUploading && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium mb-2">Uploading...</h3>
            {Object.entries(uploads).map(([id, upload]) => (
              <div key={id} className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>{upload.fileName}</span>
                  <span>{Math.round(upload.progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* File Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-gray-400">
              <p>Loading...</p>
            </div>
          ) : pathFiles.length === 0 && !isUploading ? (
            <div className="col-span-full text-center py-12 text-gray-400">
              <Upload size={48} className="mx-auto mb-4" />
              <p>Drop files here or click Upload Files</p>
            </div>
          ) : (
            pathFiles.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleItemSelection(item.id)}
                className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-all ${
                  selectedItems.has(item.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  {item.parent_id !== undefined ? (
                    <Folder
                      size={24}
                      className="text-yellow-500 cursor-pointer hover:text-yellow-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateFolder(item.id, item.name);
                      }}
                    />
                  ) : (
                    <File size={24} className="text-gray-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">
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
