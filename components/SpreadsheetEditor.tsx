'use client';

import React, { useEffect, useMemo } from 'react';
import { SpreadsheetData } from '@/types/spreadsheet';
import { DataGrid, Column } from 'react-data-grid';
import { Download, Save } from 'lucide-react';
import { useSpreadsheet } from '@/hooks/useSpreadsheet';
import 'react-data-grid/lib/styles.css';

interface SpreadsheetEditorProps {
  fileUrl?: string;
  onDataLoaded?: (data: SpreadsheetData) => void;
  onDataChange?: (data: any[][]) => void;
}

export default function SpreadsheetEditor({ fileUrl, onDataLoaded, onDataChange }: SpreadsheetEditorProps) {
  const { data, loading, error, updateCell, exportToExcel } = useSpreadsheet(fileUrl);
  
  // Notify parent when data is loaded
  useEffect(() => {
    if (data && onDataLoaded) {
      onDataLoaded(data);
    }
  }, [data, onDataLoaded]);

  // Convert data to DataGrid format
  const rows = useMemo(() => {
    return data?.rows.map((row, idx) => {
      const rowObj: any = { id: idx };
      data.headers.forEach((header, colIdx) => {
        rowObj[header] = row[colIdx] ?? '';
      });
      return rowObj;
    }) ?? [];
  }, [data]);

  const columns: Column<any>[] = useMemo(() => {
    return data?.headers.map((header) => ({
      key: header,
      name: header,
      resizable: true,
      editable: true,
    })) ?? [];
  }, [data]);

  const handleRowsChange = (newRows: any[]) => {
    if (!data) return;
    
    const updatedData = newRows.map(row => {
      return data.headers.map(header => row[header]);
    });
    
    if (onDataChange) {
      onDataChange(updatedData);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-gray-900 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">Loading spreadsheet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center bg-red-50 p-6 border border-red-200 max-w-md">
          <p className="font-medium text-red-900 mb-1">Error loading spreadsheet</p>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-900 font-medium mb-1">No spreadsheet loaded</p>
          <p className="text-gray-500 text-sm">Select a file to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 px-4 py-2 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-gray-900 text-sm">{data.metadata?.sheetName || 'Sheet'}</h3>
          <span className="text-xs text-gray-500">
            {data.metadata?.rowCount} rows × {data.metadata?.columnCount} columns
          </span>
        </div>
        <button
          onClick={exportToExcel}
          className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-sm flex items-center gap-2 transition-colors"
        >
          <Download size={14} />
          Export
        </button>
      </div>

      {/* Spreadsheet Grid */}
      <div className="flex-1 overflow-auto">
        <DataGrid
          columns={columns}
          rows={rows}
          onRowsChange={handleRowsChange}
          className="h-full"
        />
      </div>
    </div>
  );
}
