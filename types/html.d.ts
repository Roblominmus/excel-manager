/**
 * Custom type declarations for non-standard HTML attributes
 */

declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    // Non-standard attributes for folder upload
    webkitdirectory?: string;
    directory?: string;
  }
}

export {};
