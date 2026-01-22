'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Workbook } from '@fortune-sheet/react';
import type { Sheet } from '@fortune-sheet/core';
import '@fortune-sheet/react/dist/index.css';
import { SpreadsheetData } from '@/types/spreadsheet';
import { Download, Save, Maximize2, Minimize2 } from 'lucide-react';
import { useCanvasSpreadsheet } from '@/hooks/useCanvasSpreadsheet';

interface SpreadsheetEditorProps {
  fileUrl?: string;
  fileName?: string;
  onDataLoaded?: (data: SpreadsheetData) => void;
  onDataChange?: (data: unknown[][], isDirty: boolean) => void;
  onEvaluateFormulaReady?: (evaluateFormula: (formula: string) => unknown) => void;
  onSave?: () => void;
  onFullscreenToggle?: () => void;
  isFullscreen?: boolean;
}

export default function SpreadsheetEditor({
  fileUrl,
  fileName,
  onDataLoaded,
  onDataChange,
  onEvaluateFormulaReady,
  onSave,
  onFullscreenToggle,
  isFullscreen,
}: SpreadsheetEditorProps) {
  const {
    sheets,
    loading,
    error,
    loadFile,
    exportToExcel,
    exportToODS,
    exportToCSV,
  } = useCanvasSpreadsheet();

  const [isDirty, setIsDirty] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const workbookRef = useRef<any>(null);
  const prevDataRef = useRef<unknown>(null);
  const hasProvidedEvaluator = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get column letter from index (0 = A, 1 = B, 25 = Z, 26 = AA, etc.)
  const getColumnLetter = useCallback((index: number): string => {
    let letter = '';
    let num = index + 1;
    while (num > 0) {
      const remainder = (num - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      num = Math.floor((num - 1) / 26);
    }
    return letter;
  }, []);

  // Convert Fortune Sheet format to SpreadsheetData for parent callbacks
  const convertFortuneSheetToSpreadsheetData = useCallback((sheet: Sheet): SpreadsheetData => {
    const maxRow = sheet.celldata?.reduce((max, cell) => Math.max(max, cell.r), 0) || 0;
    const maxCol = sheet.celldata?.reduce((max, cell) => Math.max(max, cell.c), 0) || 0;
    
    // Create headers (A, B, C, ...)
    const headers: string[] = [];
    for (let i = 0; i <= maxCol; i++) {
      headers.push(getColumnLetter(i));
    }
    
    // Create rows array
    const rows: unknown[][] = Array(maxRow + 1).fill(null).map(() => Array(maxCol + 1).fill(''));
    
    // Fill in cell data
    sheet.celldata?.forEach((cell: { r: number; c: number; v: unknown }) => {
      const value = typeof cell.v === 'object' && cell.v !== null && 'v' in cell.v ? (cell.v as { v: unknown }).v : cell.v;
      rows[cell.r][cell.c] = value ?? '';
    });
    
    return {
      headers,
      rows,
      metadata: {
        sheetName: sheet.name,
        rowCount: rows.length,
        columnCount: headers.length,
      },
    };
  }, [getColumnLetter]);

  // Load file when URL changes
  useEffect(() => {
    if (fileUrl) {
      loadFile(fileUrl);
    }
  }, [fileUrl, loadFile]);

  // Notify parent when data is loaded - convert Fortune Sheet format to SpreadsheetData
  useEffect(() => {
    if (sheets && sheets.length > 0 && onDataLoaded) {
      const firstSheet = sheets[0];
      
      // Skip if same data
      if (prevDataRef.current === firstSheet) return;
      prevDataRef.current = firstSheet;
      
      // Convert Fortune Sheet celldata to traditional rows/headers format
      const convertedData = convertFortuneSheetToSpreadsheetData(firstSheet);
      onDataLoaded(convertedData);
    }
  }, [sheets, onDataLoaded, convertFortuneSheetToSpreadsheetData]);

  // Provide a simple formula evaluator for backward compatibility - only once
  useEffect(() => {
    if (onEvaluateFormulaReady && !hasProvidedEvaluator.current) {
      hasProvidedEvaluator.current = true;
      const evaluateFormula = (formula: string) => {
        // Basic formula evaluation - Fortune Sheet handles this internally
        // This is a stub for backward compatibility
        return formula;
      };
      onEvaluateFormulaReady(evaluateFormula);
    }
  }, [onEvaluateFormulaReady]); // Run when callback changes

  // Handle sheet changes
  const handleChange = useCallback((data: Sheet[]) => {
    setIsDirty(true);
    if (onDataChange && data.length > 0) {
      const converted = convertFortuneSheetToSpreadsheetData(data[0]);
      onDataChange(converted.rows, true);
    }
  }, [onDataChange, convertFortuneSheetToSpreadsheetData]);

  // Add bidirectional scrolling support with wheel events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Find the spreadsheet container
      const spreadsheetContainer = container.querySelector('.luckysheet-grid-container, [class*="fortune-sheet"], .luckysheet');
      if (!spreadsheetContainer) return;

      // Allow default scrolling behavior - the spreadsheet should handle this
      // But ensure both horizontal and vertical scrolling work
      if (e.shiftKey) {
        // Shift + wheel for horizontal scrolling
        e.preventDefault();
        spreadsheetContainer.scrollLeft += e.deltaY;
      } else if (Math.abs(e.deltaX) > 0) {
        // Horizontal scroll from trackpad
        e.preventDefault();
        spreadsheetContainer.scrollLeft += e.deltaX;
        spreadsheetContainer.scrollTop += e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-blue-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Loading spreadsheet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center bg-red-50 p-6 border border-red-200 rounded-lg max-w-md">
          <p className="font-medium text-red-900 mb-1">Error loading spreadsheet</p>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!sheets || sheets.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="font-medium text-gray-900 mb-1">No spreadsheet loaded</p>
          <p className="text-sm text-gray-500">Select a file from the File Manager to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-medium text-sm text-gray-900">
            {fileName || 'Untitled'}
            {isDirty && <span className="text-orange-500 ml-1">•</span>}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onSave && (
            <button
              onClick={() => {
                onSave();
                setIsDirty(false);
              }}
              className="px-3 py-1.5 text-sm flex items-center gap-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50"
              title="Save (Ctrl+S)"
            >
              <Save size={14} />
              Save
            </button>
          )}
          <button
            onClick={() => setShowDownloadDialog(true)}
            className="px-3 py-1.5 text-sm flex items-center gap-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50"
            title="Download Spreadsheet"
          >
            <Download size={14} />
            Download
          </button>
          {onFullscreenToggle && (
            <button
              onClick={onFullscreenToggle}
              className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Fortune Sheet Canvas */}
      <div ref={containerRef} className="flex-1 overflow-hidden" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Workbook
          ref={workbookRef}
          data={sheets}
          onChange={handleChange}
          column={26}
          row={100}
          allowEdit={true}
          showToolbar={true}
          showFormulaBar={true}
          showSheetTabs={true}
          lang="en"
          hooks={{
            afterUpdateCell: (_r: number, _c: number, _oldVal: unknown, _newVal: unknown) => {
              setIsDirty(true);
            },
          }}
        />
      </div>

      {/* Download Format Dialog */}
      {showDownloadDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Choose Download Format</h3>
            <div className="flex gap-3">
              <button 
                onClick={() => { 
                  exportToExcel(fileName || 'export'); 
                  setShowDownloadDialog(false); 
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Excel (.xlsx)
              </button>
              <button 
                onClick={() => { 
                  exportToODS(fileName || 'export'); 
                  setShowDownloadDialog(false); 
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                LibreOffice (.ods)
              </button>
              <button 
                onClick={() => { 
                  exportToCSV(fileName || 'export'); 
                  setShowDownloadDialog(false); 
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                CSV (.csv)
              </button>
            </div>
            <button 
              onClick={() => setShowDownloadDialog(false)} 
              className="mt-4 text-sm hover:text-gray-700"
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
