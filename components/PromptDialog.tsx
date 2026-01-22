'use client';

import React, { useState, useEffect } from 'react';
import Modal from './Modal';

interface PromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title?: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

export default function PromptDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Input',
  message,
  defaultValue = '',
  placeholder = '',
  confirmText = 'OK',
  cancelText = 'Cancel',
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);

  // Reset value when modal opens or defaultValue changes
  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  const handleConfirm = () => {
    if (value.trim()) {
      onConfirm(value.trim());
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} showCloseButton={false}>
      <div className="space-y-4">
        <p style={{ color: 'var(--text-primary)' }}>
          {message}
        </p>
        
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus
          className="w-full px-3 py-2 rounded"
          style={{
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
        />
        
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded transition-colors"
            style={{
              backgroundColor: 'var(--gray-100)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!value.trim()}
            className="px-4 py-2 text-sm rounded transition-colors disabled:opacity-50"
            style={{
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
