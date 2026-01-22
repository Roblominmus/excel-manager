'use client';

import React, { useEffect, useMemo } from 'react';
import { DataGrid, Column } from 'react-data-grid';
import { Download, Save } from 'lucide-react';
import { useSpreadsheet } from '@/hooks/useSpreadsheet';
import 'react-data-grid/lib/styles.css';

interface SpreadsheetEditorProps {
  fileUrl?: string;
  onDataChange?: (data: any[][]) => void;
}

export default function SpreadsheetEditor({ fileUrl, onDataChange }: SpreadsheetEditorProps) {
  const { data, loading, error, updateCell, exportToExcel } = useSpreadsheet(fileUrl);

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
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="flex gap-2 mb-6 justify-center">
            <div className="w-4 h-4 bg-blue-600 rounded animate-shimmer"></div>
            <div className="w-4 h-4 bg-purple-600 rounded animate-shimmer" style={{ animationDelay: '150ms' }}></div>
            <div className="w-4 h-4 bg-green-600 rounded animate-shimmer" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="text-gray-700 font-medium text-lg">Loading spreadsheet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-red-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-bold text-red-700 text-lg mb-2">Error loading spreadsheet</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-purple-50">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-700 font-semibold text-xl mb-2">No spreadsheet loaded</p>
          <p className="text-gray-500">Select a file from the File Manager to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="border-b bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{data.metadata?.sheetName}</h3>
              <p className="text-xs text-gray-600 font-medium">
                {data.metadata?.rowCount} rows × {data.metadata?.columnCount} columns
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToExcel}
            className="btn px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 flex items-center gap-2 shadow-md font-semibold"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div className="flex-1 overflow-auto p-4 bg-gray-50">
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
          <DataGrid
            columns={columns}
            rows={rows}
            onRowsChange={handleRowsChange}
            className="h-full spreadsheet-grid"
          />
        </div>
      </div>
    </div>
  );
}
