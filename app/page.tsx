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
      <div className="h-screen flex items-center justify-center gradient-mesh">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
          <p className="text-gray-700 text-lg font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="h-screen flex items-center justify-center gradient-mesh">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
          <p className="text-red-600 font-semibold text-lg">Authentication required</p>
          <p className="text-gray-600 mt-2">Please sign in to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col gradient-mesh">
      {/* Header */}
      <header className="glass-morphism shadow-md">
        <div className="px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Excel Manager</h1>
              <p className="text-sm text-gray-600 font-medium">AI-Powered Spreadsheet Editor with Privacy</p>
            </div>
          </div>
          <button
            onClick={() => {
              router.push('/auth/logout');
            }}
            className="btn px-5 py-2.5 text-sm font-semibold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 rounded-xl shadow-sm transition-all"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden m-2 gap-2">
        {/* Left: File Manager */}
        <div
          className="rounded-2xl overflow-hidden shadow-lg bg-white"
          style={{ width: `${leftWidth}px` }}
        >
          <FileManager 
            onFileSelect={(url: string) => setCurrentFileUrl(url)}
          />
        </div>

        {/* Left Resizer */}
        <div
          className="w-1 cursor-col-resize bg-gradient-to-b from-blue-400 to-purple-400 rounded-full hover:w-1.5 transition-all opacity-50 hover:opacity-100"
          onMouseDown={() => setDragging('left')}
        />

        {/* Center: Spreadsheet Editor */}
        <div className="flex-1 rounded-2xl overflow-hidden shadow-lg bg-white">
          <SpreadsheetEditor 
            fileUrl={currentFileUrl}
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
          className="w-1 cursor-col-resize bg-gradient-to-b from-blue-400 to-purple-400 rounded-full hover:w-1.5 transition-all opacity-50 hover:opacity-100"
          onMouseDown={() => setDragging('right')}
        />

        {/* Right: AI Assistant */}
        <div
          className="rounded-2xl overflow-hidden shadow-lg bg-white"
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
