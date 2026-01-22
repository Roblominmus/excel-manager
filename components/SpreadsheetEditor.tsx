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
  onDataChange?: (data: any[][], isDirty: boolean) => void;
  onEvaluateFormulaReady?: (evaluateFormula: (formula: string) => any) => void;
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
    exportToCSV,
    exportToODS,
  } = useCanvasSpreadsheet();

  const [isDirty, setIsDirty] = useState(false);
  const workbookRef = useRef<any>(null);
  const prevDataRef = useRef<any>(null);

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
  }, [sheets, onDataLoaded]);

  // Provide a simple formula evaluator for backward compatibility
  useEffect(() => {
    if (onEvaluateFormulaReady) {
      const evaluateFormula = (formula: string) => {
        // Basic formula evaluation - Fortune Sheet handles this internally
        // This is a stub for backward compatibility
        return formula;
      };
      onEvaluateFormulaReady(evaluateFormula);
    }
  }, [onEvaluateFormulaReady]);

  // Convert Fortune Sheet format to SpreadsheetData for parent callbacks
  const convertFortuneSheetToSpreadsheetData = (sheet: Sheet): SpreadsheetData => {
    const maxRow = sheet.celldata?.reduce((max, cell) => Math.max(max, cell.r), 0) || 0;
    const maxCol = sheet.celldata?.reduce((max, cell) => Math.max(max, cell.c), 0) || 0;
    
    // Create headers (A, B, C, ...)
    const headers: string[] = [];
    for (let i = 0; i <= maxCol; i++) {
      headers.push(getColumnLetter(i));
    }
    
    // Create rows array
    const rows: any[][] = Array(maxRow + 1).fill(null).map(() => Array(maxCol + 1).fill(''));
    
    // Fill in cell data
    sheet.celldata?.forEach((cell: any) => {
      const value = typeof cell.v === 'object' ? cell.v.v : cell.v;
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
  };

  // Get column letter from index (0 = A, 1 = B, 25 = Z, 26 = AA, etc.)
  const getColumnLetter = (index: number): string => {
    let letter = '';
    let num = index + 1;
    while (num > 0) {
      const remainder = (num - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      num = Math.floor((num - 1) / 26);
    }
    return letter;
  };

  // Handle sheet changes
  const handleChange = useCallback((data: Sheet[]) => {
    setIsDirty(true);
    if (onDataChange && data.length > 0) {
      const converted = convertFortuneSheetToSpreadsheetData(data[0]);
      onDataChange(converted.rows, true);
    }
  }, [onDataChange]);

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
      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 bg-gray-50">
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
            onClick={() => exportToExcel(fileName || 'export')}
            className="px-3 py-1.5 text-sm flex items-center gap-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50"
            title="Export to Excel"
          >
            <Download size={14} />
            XLSX
          </button>
          <button
            onClick={() => exportToODS(fileName || 'export')}
            className="px-3 py-1.5 text-sm flex items-center gap-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50"
            title="Export to ODS (LibreOffice)"
          >
            <Download size={14} />
            ODS
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
      <div className="flex-1 min-h-0">
        <Workbook
          ref={workbookRef}
          data={sheets}
          onChange={handleChange}
          column={26}
          row={100}
          allowEdit={true}
          showToolbar={true}
          showFormulaBar={false}
          showSheetTabs={true}
          lang="en"
          hooks={{
            afterCellMouseDown: (cell: any, cellInfo: any) => {
              // Track cell selection for formula bar
            },
            afterUpdateCell: (r: number, c: number, oldVal: any, newVal: any) => {
              setIsDirty(true);
            },
          }}
        />
      </div>
    </div>
  );
}
