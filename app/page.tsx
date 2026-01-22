'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import FileManager from '@/components/FileManager';
import SpreadsheetEditor from '@/components/SpreadsheetEditor';
import AIAssistant from '@/components/AIAssistant';
import TabBar from '@/components/TabBar';
import { SpreadsheetData, OpenFile } from '@/types/spreadsheet';
import { isAuthenticated, getCurrentUserId } from '@/lib/supabase/client';
import { Sun, Moon, Upload, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Multi-file state
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [evaluateFormula, setEvaluateFormula] = useState<((formula: string) => unknown) | undefined>();
  
  // UI state
  const [leftWidth, setLeftWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(384);
  const [dragging, setDragging] = useState<'left' | 'right' | null>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [isFullView, setIsFullView] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Clean the filename by removing timestamps and query strings
  const cleanFileName = useCallback((url: string, providedName?: string): string => {
    if (providedName) {
      // Remove timestamp prefix if present (e.g., "1769076886305_claims_master_data.csv")
      return providedName.replace(/^\d+_/, '').split('?')[0];
    }
    const path = url.split('?')[0]; // Remove query params
    const filename = path.split('/').pop() || 'Untitled';
    return filename.replace(/^\d+_/, ''); // Remove timestamp prefix
  }, []);

  // Initialize theme from localStorage and system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = (savedTheme as 'light' | 'dark') || (prefersDark ? 'dark' : 'light');
    
    // Only update if different to avoid cascading renders
    if (theme !== initialTheme) {
      document.documentElement.setAttribute('data-theme', initialTheme);
      setTheme(initialTheme);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle theme
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }, [theme]);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        router.push('/login');
      } else {
        const id = await getCurrentUserId();
        if (id) {
          setUserId(id);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  const clamp = useCallback((value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
  }, []);

  // Stabilize handleMouseUp with useCallback
  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragging) return;
      const viewportWidth = window.innerWidth;
      if (dragging === 'left') {
        const maxLeft = viewportWidth - rightWidth - 400;
        setLeftWidth(clamp(event.clientX, 200, Math.max(260, maxLeft)));
      }
      if (dragging === 'right') {
        const available = viewportWidth - event.clientX;
        const maxRight = viewportWidth - leftWidth - 400;
        setRightWidth(clamp(available, 260, Math.max(300, maxRight)));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, clamp, rightWidth, leftWidth, handleMouseUp]);

  // Handle file selection from FileManager
  const handleFileSelect = useCallback((url: string, name?: string) => {
    // Check if file is already open
    const existingFile = openFiles.find(f => f.url === url);
    if (existingFile) {
      setActiveFileId(existingFile.id);
      return;
    }

    // Create new file entry
    const newFile: OpenFile = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: cleanFileName(url, name),
      url,
      data: null,
      isDirty: false,
    };

    setOpenFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
  }, [openFiles, cleanFileName]);

  // Handle tab close
  const handleTabClose = useCallback((fileId: string) => {
    setOpenFiles(prev => {
      const newFiles = prev.filter(f => f.id !== fileId);
      // If closing active file, switch to another
      if (fileId === activeFileId && newFiles.length > 0) {
        setActiveFileId(newFiles[newFiles.length - 1].id);
      } else if (newFiles.length === 0) {
        setActiveFileId(null);
      }
      return newFiles;
    });
  }, [activeFileId]);

  // Get active file
  const activeFile = openFiles.find(f => f.id === activeFileId);

  // Save function with toast notification
  const handleSave = useCallback(async () => {
    const currentFile = openFiles.find(f => f.id === activeFileId);
    if (!currentFile) return;
    
    try {
      // Note: Save functionality requires Supabase API integration
      // to update files in storage. This is a placeholder for future implementation.
      // await uploadFileToSupabase(currentFile.url, currentFile.data);
      
      setOpenFiles(prev => 
        prev.map(f => 
          f.id === activeFileId ? { ...f, isDirty: false } : f
        )
      );
      setToast({ message: 'Changes saved successfully!', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Save error:', error);
      setToast({ message: 'Failed to save changes', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  }, [openFiles, activeFileId]);

  // Handle data changes with auto-save
  const handleDataChange = useCallback((data: unknown[][], isDirty: boolean) => {
    if (!activeFileId) return;
    
    setOpenFiles(prev => 
      prev.map(f => 
        f.id === activeFileId 
          ? { ...f, isDirty } 
          : f
      )
    );
    
    // Auto-save after 5 seconds of no changes
    if (isDirty) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 5000);
    }
  }, [activeFileId, handleSave]);

  // Memoize the evaluateFormula callback to prevent infinite loops
  const handleEvaluateFormulaReady = useCallback((evaluateFunc: (formula: string) => unknown) => {
    setEvaluateFormula(() => evaluateFunc);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to exit full view
      if (e.key === 'Escape' && isFullView) {
        setIsFullView(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullView]);

  // Drag and drop file upload handler
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDraggingFile(true);
      }
    };
    
    const handleDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) {
        setIsDraggingFile(false);
      }
    };
    
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingFile(false);
      
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) {
        // Auto-open files after upload by selecting the first one
        console.log('Files dropped:', files.map(f => f.name));
        // Note: This requires integration with FileManager upload
        // For now, just log the files
      }
    };
    
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);
    
    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-gray-900 mx-auto mb-4"></div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="text-center p-6" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Authentication required</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Please sign in to continue</p>
        </div>
      </div>
    );
  }

  const showLeftSidebar = leftSidebarOpen && !isFullView;
  const showRightSidebar = rightSidebarOpen && !isFullView;

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-800 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Excel Manager</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-gray-200 transition-colors"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              style={{ border: '1px solid var(--border)' }}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button
              onClick={() => router.push('/auth/logout')}
              className="px-3 py-1.5 text-sm transition-colors"
              style={{ 
                color: 'var(--text-primary)',
                backgroundColor: 'var(--gray-100)',
                border: '1px solid var(--border)',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      {openFiles.length > 0 && (
        <TabBar
          files={openFiles}
          activeFileId={activeFileId}
          onTabSelect={setActiveFileId}
          onTabClose={handleTabClose}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden gap-1 p-1">
        {/* Left: File Manager */}
        {showLeftSidebar && (
          <>
            <div
              className="overflow-hidden"
              style={{ 
                width: `${leftWidth}px`,
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
              }}
            >
              <FileManager 
                onFileSelect={(url: string) => {
                  const fileName = url.split('/').pop() || 'Untitled';
                  handleFileSelect(url, fileName);
                }}
                onClose={() => setLeftSidebarOpen(false)}
              />
            </div>

            {/* Left Resizer */}
            <div
              className="w-1 cursor-col-resize hover:bg-gray-400 transition-colors"
              style={{ backgroundColor: 'var(--border)' }}
              onMouseDown={() => setDragging('left')}
            />
          </>
        )}

        {/* Left sidebar toggle when closed */}
        {!leftSidebarOpen && !isFullView && (
          <button
            onClick={() => setLeftSidebarOpen(true)}
            className="fixed left-2 top-1/2 -translate-y-1/2 z-50 p-2 border rounded-r shadow-md hover:bg-gray-50"
            title="Open File Manager"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* Center: Spreadsheet Editor */}
        <div 
          className="flex-1 overflow-hidden" 
          style={{ 
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            minWidth: 0,  // Allow flex shrinking
          }}
        >
          <SpreadsheetEditor 
            fileUrl={activeFile?.url}
            fileName={activeFile?.name}
            onDataLoaded={(data) => {
              if (activeFileId) {
                setOpenFiles(prev =>
                  prev.map(f =>
                    f.id === activeFileId ? { ...f, data } : f
                  )
                );
              }
            }}
            onEvaluateFormulaReady={handleEvaluateFormulaReady}
            onDataChange={handleDataChange}
            onSave={handleSave}
            onFullscreenToggle={() => setIsFullView(!isFullView)}
            isFullscreen={isFullView}
          />
        </div>

        {/* Right sidebar toggle when closed */}
        {!rightSidebarOpen && !isFullView && (
          <button
            onClick={() => setRightSidebarOpen(true)}
            className="fixed right-2 top-1/2 -translate-y-1/2 z-50 p-2 border rounded-l shadow-md hover:bg-gray-50"
            title="Open AI Assistant"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Right Resizer */}
        {showRightSidebar && (
          <>
            <div
              className="w-1 cursor-col-resize hover:bg-gray-400 transition-colors"
              style={{ backgroundColor: 'var(--border)' }}
              onMouseDown={() => setDragging('right')}
            />

            {/* Right: AI Assistant */}
            <div
              className="overflow-hidden"
              style={{ 
                width: `${rightWidth}px`,
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
              }}
            >
              <AIAssistant 
                spreadsheetData={activeFile?.data || undefined}
                evaluateFormula={evaluateFormula}
                onApplyCode={(code, type) => {
                  console.log('Apply code:', type, code);
                }}
                onClose={() => setRightSidebarOpen(false)}
              />
            </div>
          </>
        )}
      </div>

      {/* Drop Overlay for File Upload */}
      {isDraggingFile && (
        <div className="fixed inset-0 bg-blue-500/20 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white p-8 rounded-lg shadow-xl text-center" style={{ border: '2px dashed var(--primary)' }}>
            <Upload size={48} className="mx-auto mb-4 text-blue-500" />
            <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Drop files to import</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Excel and CSV files supported</p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg z-50 ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
