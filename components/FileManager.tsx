'use client';

import React, { useCallback, useState } from 'react';
import { Upload, Folder, File, Download, Trash2 } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { formatFileSize, formatDate } from '@/lib/utils';
import { FileMetadata } from '@/types/file';

interface FileManagerProps {
  userId: string;
  currentFolderId?: string;
  onFileSelect?: (url: string) => void;
}

export default function FileManager({ userId, currentFolderId, onFileSelect }: FileManagerProps) {
  const { uploads, isUploading, uploadMultipleFiles } = useFileUpload(userId, currentFolderId);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

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

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">My Files</h2>
        <div className="flex gap-2">
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
          {selectedFiles.size > 0 && (
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
              <Trash2 size={18} />
              Delete ({selectedFiles.size})
            </button>
          )}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex-1 p-6 overflow-auto"
      >
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
          {files.length === 0 && !isUploading && (
            <div className="col-span-full text-center py-12 text-gray-400">
              <Upload size={48} className="mx-auto mb-4" />
              <p>Drop files here or click Upload Files</p>
            </div>
          )}

          {files.map((file) => (
            <div
              key={file.id}
              onClick={() => toggleFileSelection(file.id)}
              className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-all ${
                selectedFiles.has(file.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                {file.isFolder ? (
                  <Folder size={24} className="text-yellow-500" />
                ) : (
                  <File size={24} className="text-gray-500" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
