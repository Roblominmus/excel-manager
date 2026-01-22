'use client';

import React, { useState, useRef, useEffect } from 'react';
import Modal from './Modal';

interface PromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  validator?: (value: string) => string | null; // Returns error message or null if valid
}

export default function PromptDialog({
  isOpen,
  onClose,
  onSubmit,
  title,
  message,
  placeholder = 'Enter value...',
  defaultValue = '',
  confirmText = 'OK',
  cancelText = 'Cancel',
  validator,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setError(null);
      // Focus input after a short delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, defaultValue]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Validate input
    if (validator) {
      const validationError = validator(value);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    onSubmit(value);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="450px">
      <form onSubmit={handleSubmit} className="space-y-4">
        {message && (
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            {message}
          </p>
        )}

        <div>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null); // Clear error on change
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: `1px solid ${error ? '#dc2626' : 'var(--border)'}`,
            }}
          />
          {error && (
            <p className="text-xs mt-1" style={{ color: '#dc2626' }}>
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm transition-colors hover:bg-gray-100"
            style={{
              backgroundColor: 'var(--gray-100)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            {cancelText}
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm transition-opacity hover:opacity-90"
            style={{
              backgroundColor: '#0066cc',
              color: 'white',
            }}
          >
            {confirmText}
          </button>
        </div>
      </form>
    </Modal>
  );
}
