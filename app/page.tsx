'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import FileManager from '@/components/FileManager';
import SpreadsheetEditor from '@/components/SpreadsheetEditor';
import AIAssistant from '@/components/AIAssistant';
import TabBar from '@/components/TabBar';
import { SpreadsheetData, OpenFile } from '@/types/spreadsheet';
import { isAuthenticated, getCurrentUserId } from '@/lib/supabase/client';
import { Sun, Moon, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Multi-file state
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [evaluateFormula, setEvaluateFormula] = useState<((formula: string) => any) | undefined>();
  
  // UI state
  const [leftWidth, setLeftWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(384);
  const [dragging, setDragging] = useState<'left' | 'right' | null>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [isFullView, setIsFullView] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

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
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme as 'light' | 'dark');
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

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

    const handleMouseUp = () => setDragging(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, clamp, rightWidth, leftWidth]);

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

  // Handle data changes
  const handleDataChange = useCallback((data: any[][], isDirty: boolean) => {
    if (!activeFileId) return;
    setOpenFiles(prev => 
      prev.map(f => 
        f.id === activeFileId 
          ? { ...f, isDirty } 
          : f
      )
    );
  }, [activeFileId]);

  // Get active file
  const activeFile = openFiles.find(f => f.id === activeFileId);

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
            {/* Sidebar toggles */}
            <button
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className="p-2 hover:bg-gray-200 transition-colors"
              title={leftSidebarOpen ? 'Hide File Manager' : 'Show File Manager'}
              style={{ border: '1px solid var(--border)' }}
            >
              {leftSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </button>
            <button
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
              className="p-2 hover:bg-gray-200 transition-colors"
              title={rightSidebarOpen ? 'Hide AI Assistant' : 'Show AI Assistant'}
              style={{ border: '1px solid var(--border)' }}
            >
              {rightSidebarOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </button>
            {/* Full view toggle */}
            <button
              onClick={() => setIsFullView(!isFullView)}
              className="p-2 hover:bg-gray-200 transition-colors"
              title={isFullView ? 'Exit Full View' : 'Full View'}
              style={{ border: '1px solid var(--border)' }}
            >
              {isFullView ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
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

        {/* Center: Spreadsheet Editor */}
        <div 
          className="flex-1 overflow-hidden" 
          style={{ 
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border)',
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
            onEvaluateFormulaReady={(evaluateFunc) => {
              setEvaluateFormula(() => evaluateFunc);
            }}
            onDataChange={handleDataChange}
            onSave={() => {
              // Note: Save functionality requires Supabase API integration
              // to update files in storage. This is a placeholder for future implementation.
              // await uploadFileToSupabase(activeFile.url, activeFile.data);
              if (activeFileId) {
                setOpenFiles(prev =>
                  prev.map(f =>
                    f.id === activeFileId ? { ...f, isDirty: false } : f
                  )
                );
              }
            }}
          />
        </div>

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
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
