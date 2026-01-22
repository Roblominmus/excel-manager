'use client';

import React from 'react';
import Modal from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const confirmButtonStyle = variant === 'danger'
    ? {
        backgroundColor: '#dc2626',
        color: 'white',
      }
    : {
        backgroundColor: '#0066cc',
        color: 'white',
      };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="450px">
      <div className="space-y-4">
        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
          {message}
        </p>

        <div className="flex justify-end gap-2">
          <button
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
            onClick={handleConfirm}
            className="px-4 py-2 text-sm transition-opacity hover:opacity-90"
            style={confirmButtonStyle}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
