'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, File, Plus, Upload } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useFileManager as useFileManagerHook } from '@/hooks/useFileManager';
import { getCurrentUserId } from '@/lib/supabase/client';

interface FileManagerProps {
  userId?: string;
  currentFolderId?: string;
  onFileSelect?: (url: string) => void;
}

interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  size?: number;
  storage_path?: string;
  parent_id?: string | null;
  folder_id?: string | null;
  children?: TreeNode[];
  expanded?: boolean;
}

export default function FileManager({ userId: providedUserId, currentFolderId, onFileSelect }: FileManagerProps) {
  const { uploads, isUploading, uploadMultipleFiles } = useFileUpload(providedUserId || '', currentFolderId);
  const {
    folders,
    loading,
    error,
    createFolder,
    getFilesInFolder,
    getFileUrl,
    fetchFolderHierarchy,
  } = useFileManagerHook();
  
  const [userId, setUserId] = useState<string | null>(providedUserId || null);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['root']));

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

  // Build tree structure from folders and files
  useEffect(() => {
    const buildTree = async () => {
      // Build folder tree recursively
      const buildFolderTree = (folderList: any[], parentId: string | null): TreeNode[] => {
        return folderList
          .filter(f => f.parent_id === parentId)
          .map(folder => ({
            id: folder.id,
            name: folder.name,
            type: 'folder' as const,
            parent_id: folder.parent_id,
            children: buildFolderTree(folderList, folder.id),
            expanded: expandedIds.has(folder.id),
          }));
      };

      const tree = buildFolderTree(folders, null);
      
      // Add files to each folder
      const addFilesToTree = async (nodes: TreeNode[]): Promise<TreeNode[]> => {
        const result: TreeNode[] = [];
        for (const node of nodes) {
          if (node.type === 'folder') {
            const files = await getFilesInFolder(node.id);
            const fileNodes: TreeNode[] = (files || []).map((f: any) => ({
              id: f.id,
              name: f.name,
              type: 'file' as const,
              size: f.size,
              storage_path: f.storage_path,
              folder_id: f.folder_id,
            }));
            
            let children = node.children || [];
            if (children.length > 0) {
              children = await addFilesToTree(children);
            }
            
            result.push({
              ...node,
              children: [...children, ...fileNodes],
            });
          } else {
            result.push(node);
          }
        }
        return result;
      };

      // Get root files
      const rootFiles = await getFilesInFolder(null);
      const rootFileNodes: TreeNode[] = (rootFiles || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        type: 'file' as const,
        size: f.size,
        storage_path: f.storage_path,
        folder_id: f.folder_id,
      }));

      const treeWithFiles = await addFilesToTree(tree);
      setTreeData([...treeWithFiles, ...rootFileNodes]);
    };

    if (userId) {
      buildTree();
    }
  }, [userId, folders, getFilesInFolder, expandedIds]);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        uploadMultipleFiles(selectedFiles);
      }
    },
    [uploadMultipleFiles]
  );

  const toggleExpand = (nodeId: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleNodeClick = async (node: TreeNode) => {
    setSelectedId(node.id);
    if (node.type === 'file' && node.storage_path && onFileSelect) {
      const url = await getFileUrl(node.storage_path);
      if (url) {
        onFileSelect(url);
      }
    }
  };

  const handleNodeDoubleClick = (node: TreeNode) => {
    if (node.type === 'folder') {
      toggleExpand(node.id);
    }
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedId === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-gray-100 ${
            isSelected ? 'bg-blue-100' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleNodeClick(node)}
          onDoubleClick={() => handleNodeDoubleClick(node)}
        >
          {node.type === 'folder' ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.id);
                }}
                className="p-0 hover:bg-gray-200"
              >
                {isExpanded ? (
                  <ChevronDown size={14} className="text-gray-600" />
                ) : (
                  <ChevronRight size={14} className="text-gray-600" />
                )}
              </button>
              <Folder size={14} className="text-gray-600 flex-shrink-0" />
            </>
          ) : (
            <>
              <span className="w-[14px]" /> {/* Spacer for alignment */}
              <File size={14} className="text-gray-600 flex-shrink-0" />
            </>
          )}
          <span className="text-sm text-gray-900 truncate flex-1">{node.name}</span>
        </div>
        {node.type === 'folder' && isExpanded && hasChildren && (
          <div>
            {node.children!.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 px-3 py-2 flex items-center justify-between bg-gray-50">
        <h2 className="text-sm font-medium text-gray-900">Files</h2>
        <div className="flex gap-1">
          <button
            onClick={() => {
              const name = prompt('Folder name:');
              if (name) {
                createFolder(name, null);
                fetchFolderHierarchy();
              }
            }}
            className="p-1 hover:bg-gray-200 transition-colors"
            title="New Folder"
          >
            <Plus size={16} className="text-gray-600" />
          </button>
          <label className="cursor-pointer p-1 hover:bg-gray-200 transition-colors" title="Upload Files">
            <input
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
            <Upload size={16} className="text-gray-600" />
          </label>
        </div>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="m-2 bg-red-50 border border-red-200 p-2 text-xs text-red-900">
            {error}
          </div>
        )}

        {isUploading && (
          <div className="m-2 bg-blue-50 border border-blue-200 p-2">
            <p className="text-xs text-blue-900 font-medium mb-2">Uploading...</p>
            {Object.entries(uploads).map(([id, upload]) => (
              <div key={id} className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="truncate flex-1 text-gray-700">{upload.fileName}</span>
                  <span className="ml-2 text-blue-600">{Math.round(upload.progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 h-1">
                  <div
                    className="bg-blue-600 h-1 transition-all"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-900 mx-auto mb-2"></div>
            <p className="text-xs text-gray-600">Loading...</p>
          </div>
        ) : treeData.length === 0 && !isUploading ? (
          <div className="p-4 text-center">
            <File size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No files yet</p>
            <p className="text-xs text-gray-400">Upload files to get started</p>
          </div>
        ) : (
          <div className="py-1">
            {treeData.map(node => renderTreeNode(node, 0))}
          </div>
        )}
      </div>
    </div>
  );
}
