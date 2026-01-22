'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import FileManager from '@/components/FileManager';
import SpreadsheetEditor from '@/components/SpreadsheetEditor';
import AIAssistant from '@/components/AIAssistant';
import { SpreadsheetData } from '@/types/spreadsheet';
import { isAuthenticated, getCurrentUserId } from '@/lib/supabase/client';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentFileUrl, setCurrentFileUrl] = useState<string>();
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetData>();
  const [leftWidth, setLeftWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(384);
  const [dragging, setDragging] = useState<'left' | 'right' | null>(null);

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
        const maxLeft = viewportWidth - rightWidth - 400; // leave room for center + right
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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center bg-white p-6 rounded border border-gray-200">
          <p className="text-gray-900 font-medium">Authentication required</p>
          <p className="text-gray-600 text-sm mt-1">Please sign in to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-800 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-base font-semibold text-gray-900">Excel Manager</h1>
          </div>
          <button
            onClick={() => {
              router.push('/auth/logout');
            }}
            className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden gap-1 p-1">
        {/* Left: File Manager */}
        <div
          className="border border-gray-200 overflow-hidden bg-white"
          style={{ width: `${leftWidth}px` }}
        >
          <FileManager 
            onFileSelect={(url: string) => setCurrentFileUrl(url)}
          />
        </div>

        {/* Left Resizer */}
        <div
          className="w-1 cursor-col-resize bg-gray-200 hover:bg-gray-400 transition-colors"
          onMouseDown={() => setDragging('left')}
        />

        {/* Center: Spreadsheet Editor */}
        <div className="flex-1 border border-gray-200 overflow-hidden bg-white">
          <SpreadsheetEditor 
            fileUrl={currentFileUrl}
            onDataLoaded={setSpreadsheetData}
            onDataChange={(newData) => {
              // Update spreadsheet data when edited
              if (spreadsheetData) {
                setSpreadsheetData({
                  ...spreadsheetData,
                  rows: newData,
                });
              }
            }}
          />
        </div>

        {/* Right Resizer */}
        <div
          className="w-1 cursor-col-resize bg-gray-200 hover:bg-gray-400 transition-colors"
          onMouseDown={() => setDragging('right')}
        />

        {/* Right: AI Assistant */}
        <div
          className="border border-gray-200 overflow-hidden bg-white"
          style={{ width: `${rightWidth}px` }}
        >
          <AIAssistant 
            spreadsheetData={spreadsheetData}
            onApplyCode={(code, type) => {
              console.log('Apply code:', type, code);
              // TODO: Implement code execution logic
            }}
          />
        </div>
      </div>
    </div>
  );
}
