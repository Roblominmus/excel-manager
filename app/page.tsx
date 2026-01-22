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
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-600">Authentication required</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Excel Manager</h1>
            <p className="text-sm text-gray-500">AI-Powered Spreadsheet Editor with Privacy</p>
          </div>
          <button
            onClick={() => {
              router.push('/auth/logout');
            }}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: File Manager */}
        <div
          className="border-r overflow-auto"
          style={{ width: `${leftWidth}px` }}
        >
          <FileManager 
            onFileSelect={(url: string) => setCurrentFileUrl(url)}
          />
        </div>

        {/* Left Resizer */}
        <div
          className="w-2 cursor-col-resize bg-gray-100 hover:bg-gray-200"
          onMouseDown={() => setDragging('left')}
        />

        {/* Center: Spreadsheet Editor */}
        <div className="flex-1 overflow-auto">
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

        {/* Right: AI Assistant */}
        {/* Right Resizer */}
        <div
          className="w-2 cursor-col-resize bg-gray-100 hover:bg-gray-200"
          onMouseDown={() => setDragging('right')}
        />

        <div
          className="border-l"
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
