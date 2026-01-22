'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, File, Plus, Upload, FolderUp, MoreVertical, Trash2 } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useFileManager as useFileManagerHook } from '@/hooks/useFileManager';
import { getCurrentUserId } from '@/lib/supabase/client';
import PromptDialog from './PromptDialog';

interface FileManagerProps {
  userId?: string;
  currentFolderId?: string;
  onFileSelect?: (url: string, name?: string) => void;
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
    renameFile,
    moveFile,
    deleteFile,
    deleteFolder,
  } = useFileManagerHook();
  
  const [userId, setUserId] = useState<string | null>(providedUserId || null);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['root']));
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  
  // Modal states
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string; type: 'folder' | 'file' } | null>(null);

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
      
      // Add files to each folder using parallel fetching
      const addFilesToTree = async (nodes: TreeNode[]): Promise<TreeNode[]> => {
        // Collect all folder IDs that need files
        const collectFolderIds = (nodes: TreeNode[]): string[] => {
          const ids: string[] = [];
          for (const node of nodes) {
            if (node.type === 'folder') {
              ids.push(node.id);
              if (node.children && node.children.length > 0) {
                ids.push(...collectFolderIds(node.children));
              }
            }
          }
          return ids;
        };

        const folderIds = collectFolderIds(nodes);
        
        // Fetch files for all folders in parallel
        const filesPromises = folderIds.map(id => 
          getFilesInFolder(id).then(files => ({ folderId: id, files: files || [] }))
        );
        const filesResults = await Promise.all(filesPromises);
        
        // Create a map of folder ID to files
        const filesMap = new Map<string, any[]>();
        filesResults.forEach(result => {
          filesMap.set(result.folderId, result.files);
        });

        // Recursively add files to tree
        const attachFiles = (nodes: TreeNode[]): TreeNode[] => {
          return nodes.map(node => {
            if (node.type === 'folder') {
              const files = filesMap.get(node.id) || [];
              const fileNodes: TreeNode[] = files.map((f: any) => ({
                id: f.id,
                name: f.name,
                type: 'file' as const,
                size: f.size,
                storage_path: f.storage_path,
                folder_id: f.folder_id,
              }));
              
              let children = node.children || [];
              if (children.length > 0) {
                children = attachFiles(children);
              }
              
              return {
                ...node,
                children: [...children, ...fileNodes],
              };
            }
            return node;
          });
        };

        return attachFiles(nodes);
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

  // Refresh tree after upload completes
  useEffect(() => {
    const allCompleted = Object.values(uploads).every(u => u.progress === 100);
    if (!isUploading && allCompleted && Object.keys(uploads).length > 0) {
      fetchFolderHierarchy();
    }
  }, [isUploading, uploads, fetchFolderHierarchy]);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        uploadMultipleFiles(selectedFiles);
      }
    },
    [uploadMultipleFiles]
  );

  // Handle folder upload with webkitdirectory
  const handleFolderInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      
      const files = Array.from(e.target.files);
      
      // Get the root folder name from the first file's path
      const firstPath = (files[0] as any).webkitRelativePath || '';
      const rootFolderName = firstPath.split('/')[0];
      
      if (!rootFolderName) {
        // Fallback to simple upload if no folder structure
        uploadMultipleFiles(files);
        return;
      }
      
      try {
        // Create the root folder first
        const rootFolder = await createFolder(rootFolderName, null);
        
        // Build folder structure map
        const folderMap = new Map<string, string>();
        folderMap.set(rootFolderName, rootFolder.id);
        
        // Get all unique folder paths and create them
        const folderPaths = new Set<string>();
        files.forEach(file => {
          const relativePath = (file as any).webkitRelativePath;
          if (!relativePath) return;
          
          const parts = relativePath.split('/');
          // Skip first (root) and last (file) - get intermediate folders
          for (let i = 1; i < parts.length - 1; i++) {
            const folderPath = parts.slice(0, i + 1).join('/');
            folderPaths.add(folderPath);
          }
        });
        
        // Create subfolders in order (parent folders first)
        const sortedPaths = Array.from(folderPaths).sort();
        for (const path of sortedPaths) {
          const parts = path.split('/');
          const folderName = parts[parts.length - 1];
          const parentPath = parts.slice(0, -1).join('/');
          const parentId = folderMap.get(parentPath) || rootFolder.id;
          
          const newFolder = await createFolder(folderName, parentId);
          folderMap.set(path, newFolder.id);
        }
        
        // Upload files to their respective folders
        // Note: Sequential upload is intentional to avoid overwhelming the server
        // and to maintain proper upload order for tracking
        for (const file of files) {
          const relativePath = (file as any).webkitRelativePath;
          if (!relativePath) continue;
          
          const parts = relativePath.split('/');
          const folderPath = parts.slice(0, -1).join('/');
          const targetFolderId = folderMap.get(folderPath) || rootFolder.id;
          
          // Upload file to its target folder
          await uploadMultipleFiles([file], targetFolderId);
        }
        
        // Refresh the folder hierarchy
        await fetchFolderHierarchy();
      } catch (error) {
        console.error('Failed to upload folder structure:', error);
        // Fallback to simple upload
        uploadMultipleFiles(files);
      }
    },
    [createFolder, uploadMultipleFiles, fetchFolderHierarchy]
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

  const handleNodeClick = (e: React.MouseEvent, node: TreeNode) => {
    e.stopPropagation();
    
    // Multi-select with Ctrl/Cmd key
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(node.id)) {
          newSet.delete(node.id);
        } else {
          newSet.add(node.id);
        }
        return newSet;
      });
    } else {
      // Single selection
      setSelectedIds(new Set([node.id]));
    }
  };

  const handleNodeDoubleClick = (node: TreeNode) => {
    if (node.type === 'folder') {
      toggleExpand(node.id);
    } else if (node.type === 'file') {
      // Open the file
      handleOpenFile(node);
    }
  };

  const handleOpenFile = async (node: TreeNode) => {
    if (node.type === 'file' && node.storage_path && onFileSelect) {
      const url = await getFileUrl(node.storage_path);
      if (url) {
        onFileSelect(url, node.name);
      }
    }
  };

  const showContextMenu = (e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ nodeId: node.id, x: e.clientX, y: e.clientY });
    setSelectedIds(new Set([node.id]));
  };

  const hideContextMenu = () => {
    setContextMenu(null);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    if (contextMenu) {
      document.addEventListener('click', hideContextMenu);
      return () => document.removeEventListener('click', hideContextMenu);
    }
  }, [contextMenu]);

  const handleContextMenuAction = async (action: 'open' | 'rename' | 'delete', nodeId: string) => {
    const node = findNodeById(treeData, nodeId);
    if (!node) return;

    hideContextMenu();

    switch (action) {
      case 'open':
        if (node.type === 'file') {
          handleOpenFile(node);
        } else {
          toggleExpand(node.id);
        }
        break;
      case 'rename':
        setRenameTarget({ id: node.id, name: node.name, type: node.type });
        setRenameModalOpen(true);
        break;
      case 'delete':
        try {
          if (node.type === 'file') {
            if (!node.storage_path) {
              console.error('File has no storage path');
              return;
            }
            await deleteFile(node.id, node.storage_path);
          } else {
            await deleteFolder(node.id);
          }
          await fetchFolderHierarchy();
        } catch (error) {
          console.error('Failed to delete:', error);
        }
        break;
    }
  };

  const handleDeleteSelected = async () => {
    try {
      // Delete all selected items
      const deletePromises: Promise<void>[] = [];
      
      for (const id of selectedIds) {
        const node = findNodeById(treeData, id);
        if (!node) continue;
        
        if (node.type === 'file') {
          if (!node.storage_path) {
            console.error('File has no storage path:', node.name);
            continue;
          }
          deletePromises.push(deleteFile(id, node.storage_path));
        } else {
          deletePromises.push(deleteFolder(id));
        }
      }
      
      await Promise.all(deletePromises);
      setSelectedIds(new Set()); // Clear selection
      await fetchFolderHierarchy();
    } catch (error) {
      console.error('Failed to delete selected items:', error);
    }
  };

  const findNodeById = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleRename = async (newName: string) => {
    if (!renameTarget) return;
    
    try {
      if (renameTarget.type === 'file') {
        await renameFile(renameTarget.id, newName);
      }
      // Note: folder rename could be added here if needed
    } catch (error) {
      console.error('Failed to rename:', error);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, node: TreeNode) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('nodeId', node.id);
    e.dataTransfer.setData('nodeType', node.type);
  };

  const handleDragOver = (e: React.DragEvent, node: TreeNode) => {
    if (node.type === 'folder') {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverFolderId(node.id);
    }
  };

  const handleDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetFolder: TreeNode) => {
    e.preventDefault();
    setDragOverFolderId(null);
    
    if (targetFolder.type !== 'folder') return;
    
    const nodeId = e.dataTransfer.getData('nodeId');
    const nodeType = e.dataTransfer.getData('nodeType');
    
    // Only handle file moves for now
    if (nodeType === 'file') {
      try {
        await moveFile(nodeId, targetFolder.id);
      } catch (error) {
        console.error('Failed to move file:', error);
      }
    }
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedIds.has(node.id);
    const isDragOver = dragOverFolderId === node.id;
    const isHovered = hoveredNodeId === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors relative group ${
            isSelected 
              ? 'bg-blue-100' 
              : isDragOver
              ? 'bg-blue-50'
              : ''
          }`}
          style={{ 
            paddingLeft: `${depth * 16 + 8}px`,
            backgroundColor: isDragOver ? 'var(--primary)' : isSelected ? 'rgba(0, 102, 204, 0.1)' : 'transparent',
            color: 'var(--text-primary)',
          }}
          onClick={(e) => handleNodeClick(e, node)}
          onDoubleClick={() => handleNodeDoubleClick(node)}
          onContextMenu={(e) => showContextMenu(e, node)}
          onMouseEnter={() => setHoveredNodeId(node.id)}
          onMouseLeave={() => setHoveredNodeId(null)}
          draggable={true}
          onDragStart={(e) => handleDragStart(e, node)}
          onDragOver={(e) => handleDragOver(e, node)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node)}
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
                  <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
                ) : (
                  <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
                )}
              </button>
              <Folder size={14} style={{ color: 'var(--text-secondary)' }} className="flex-shrink-0" />
            </>
          ) : (
            <>
              <span className="w-[14px]" />
              <File size={14} style={{ color: 'var(--text-secondary)' }} className="flex-shrink-0" />
            </>
          )}
          <span className="text-sm truncate flex-1">{node.name}</span>
          {/* Three-dot menu button */}
          <button
            onClick={(e) => showContextMenu(e, node)}
            className={`p-1 hover:bg-gray-300 rounded transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            title="More options"
          >
            <MoreVertical size={12} style={{ color: 'var(--text-secondary)' }} />
          </button>
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
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Toolbar */}
      <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--gray-50)' }}>
        <h2 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Files</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setCreateFolderModalOpen(true)}
            className="p-1 hover:bg-gray-200 transition-colors"
            title="New Folder"
          >
            <Plus size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <label className="cursor-pointer p-1 hover:bg-gray-200 transition-colors" title="Upload Files">
            <input
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
            <Upload size={16} style={{ color: 'var(--text-secondary)' }} />
          </label>
          <label className="cursor-pointer p-1 hover:bg-gray-200 transition-colors" title="Upload Folder">
            <input
              type="file"
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFolderInput}
              className="hidden"
            />
            <FolderUp size={16} style={{ color: 'var(--text-secondary)' }} />
          </label>
        </div>
      </div>

      {/* Selection Toolbar */}
      {selectedIds.size > 1 && (
        <div className="px-3 py-2 bg-blue-50 border-b flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
            {selectedIds.size} items selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleDeleteSelected}
              className="px-2 py-1 text-xs flex items-center gap-1 hover:bg-red-100 transition-colors text-red-700"
              title="Delete selected"
            >
              <Trash2 size={12} />
              Delete All
            </button>
          </div>
        </div>
      )}

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
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
          </div>
        ) : treeData.length === 0 && !isUploading ? (
          <div className="p-4 text-center">
            <File size={32} className="mx-auto mb-2" style={{ color: 'var(--gray-300)' }} />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No files yet</p>
            <p className="text-xs" style={{ color: 'var(--gray-400)' }}>Upload files to get started</p>
          </div>
        ) : (
          <div className="py-1">
            {treeData.map(node => renderTreeNode(node, 0))}
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      <PromptDialog
        isOpen={createFolderModalOpen}
        onClose={() => setCreateFolderModalOpen(false)}
        onConfirm={async (name) => {
          try {
            await createFolder(name, null);
            await fetchFolderHierarchy();
          } catch (error) {
            console.error('Failed to create folder:', error);
          }
        }}
        title="New Folder"
        message="Enter folder name:"
        placeholder="Folder name"
      />

      {/* Rename Modal */}
      <PromptDialog
        isOpen={renameModalOpen}
        onClose={() => {
          setRenameModalOpen(false);
          setRenameTarget(null);
        }}
        onConfirm={handleRename}
        title={`Rename ${renameTarget?.type === 'file' ? 'File' : 'Folder'}`}
        message="Enter new name:"
        defaultValue={renameTarget?.name || ''}
        placeholder="New name"
      />

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white border shadow-lg rounded py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleContextMenuAction('open', contextMenu.nodeId)}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            Open
          </button>
          <button
            onClick={() => handleContextMenuAction('rename', contextMenu.nodeId)}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            Rename
          </button>
          <button
            onClick={() => handleContextMenuAction('delete', contextMenu.nodeId)}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors text-red-600"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
