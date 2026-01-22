'use client';

import React from 'react';
import { X } from 'lucide-react';
import { OpenFile } from '@/types/spreadsheet';

interface TabBarProps {
  files: OpenFile[];
  activeFileId: string | null;
  onTabSelect: (fileId: string) => void;
  onTabClose: (fileId: string) => void;
}

export default function TabBar({ files, activeFileId, onTabSelect, onTabClose }: TabBarProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 border-b border-gray-200 overflow-x-auto">
      <div className="flex items-center gap-0.5 px-2 py-1 min-w-max">
        {files.map((file) => {
          const isActive = file.id === activeFileId;
          return (
            <div
              key={file.id}
              className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer border border-gray-200 transition-colors ${
                isActive
                  ? 'bg-white border-b-white -mb-px z-10'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => onTabSelect(file.id)}
            >
              <span className="text-sm whitespace-nowrap">
                {file.name}
                {file.isDirty && <span className="text-orange-500 ml-1">•</span>}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(file.id);
                }}
                className="p-0.5 hover:bg-gray-300 rounded transition-colors"
                title="Close"
              >
                <X size={12} className="text-gray-600" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
