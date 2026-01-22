import { type ClassValue, clsx } from "clsx";

/**
 * Utility for combining Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Format file size to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Check if file is an Excel file
 */
export function isExcelFile(filename: string): boolean {
  const excelExtensions = ['.xlsx', '.xls', '.xlsm', '.xlsb', '.csv'];
  return excelExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}

/**
 * Sanitize filename for Firebase Storage
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Generate unique filename by appending (1), (2), etc.
 */
export function getUniqueFilename(filename: string, existingNames: string[]): string {
  const existingNamesSet = new Set(existingNames.map(name => name.toLowerCase()));
  
  if (!existingNamesSet.has(filename.toLowerCase())) {
    return filename;
  }

  // Extract name and extension
  const lastDotIndex = filename.lastIndexOf('.');
  const name = lastDotIndex !== -1 ? filename.slice(0, lastDotIndex) : filename;
  const ext = lastDotIndex !== -1 ? filename.slice(lastDotIndex) : '';

  // Try appending (1), (2), etc.
  let counter = 1;
  let newFilename = `${name} (${counter})${ext}`;
  
  while (existingNamesSet.has(newFilename.toLowerCase())) {
    counter++;
    newFilename = `${name} (${counter})${ext}`;
  }

  return newFilename;
}
