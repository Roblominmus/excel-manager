'use client';

import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

interface FileConflictDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  onReplace: () => void;
  onKeepBoth: () => void;
}

export default function FileConflictDialog({
  isOpen,
  onClose,
  fileName,
  onReplace,
  onKeepBoth,
}: FileConflictDialogProps) {
  const handleReplace = () => {
    onReplace();
    onClose();
  };

  const handleKeepBoth = () => {
    onKeepBoth();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="File Already Exists" showCloseButton={false}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={24} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <div>
            <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              A file named "{fileName}" already exists.
            </p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              What would you like to do?
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          <button
            onClick={handleReplace}
            className="w-full px-4 py-3 text-left rounded transition-colors hover:bg-gray-100"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="font-medium">Replace existing file</div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              The existing file will be overwritten
            </div>
          </button>
          
          <button
            onClick={handleKeepBoth}
            className="w-full px-4 py-3 text-left rounded transition-colors hover:bg-gray-100"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="font-medium">Keep both files</div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              The new file will be renamed automatically
            </div>
          </button>
          
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-center rounded transition-colors"
            style={{
              backgroundColor: 'var(--gray-100)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
