'use client';

import { useState } from 'react';
import FileManager from '@/components/FileManager';
import SpreadsheetEditor from '@/components/SpreadsheetEditor';
import AIAssistant from '@/components/AIAssistant';
import { SpreadsheetData } from '@/types/spreadsheet';

export default function Home() {
  const [currentFileUrl, setCurrentFileUrl] = useState<string>();
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetData>();
  
  // For demo purposes, using a mock userId
  // In production, get this from Firebase Auth
  const userId = 'demo-user';

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Excel Manager</h1>
          <p className="text-sm text-gray-500">AI-Powered Spreadsheet Editor with Privacy</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: File Manager */}
        <div className="w-80 border-r overflow-auto">
          <FileManager 
            userId={userId}
            onFileSelect={(url: string) => setCurrentFileUrl(url)}
          />
        </div>

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
        <div className="w-96">
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
