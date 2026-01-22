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
    <div
      className="border-b overflow-x-auto"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-center gap-0.5 px-2 py-1 min-w-max">
        {files.map((file) => {
          const isActive = file.id === activeFileId;
          return (
            <div
              key={file.id}
              className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer border transition-colors ${
                isActive
                  ? '-mb-px z-10'
                  : ''
              }`}
              style={{
                background: isActive ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                borderColor: 'var(--border)',
              }}
              onClick={() => onTabSelect(file.id)}
            >
              <span className="text-sm whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                {file.name}
                {file.isDirty && <span className="text-orange-500 ml-1">•</span>}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(file.id);
                }}
                className="p-0.5 rounded transition-colors"
                style={{
                  color: 'var(--text-secondary)',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--gray-200)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
                title="Close"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
