/**
 * Types for File Management
 */

export interface FileMetadata {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  isFolder: boolean;
  parentId?: string;
}

export interface FolderStructure {
  id: string;
  name: string;
  files: FileMetadata[];
  folders: FolderStructure[];
}
