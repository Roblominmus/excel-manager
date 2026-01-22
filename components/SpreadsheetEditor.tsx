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
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading spreadsheet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-600">
          <p className="font-medium">Error loading spreadsheet</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">No spreadsheet loaded</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="border-b px-6 py-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{data.metadata?.sheetName}</h3>
          <p className="text-xs text-gray-500">
            {data.metadata?.rowCount} rows × {data.metadata?.columnCount} columns
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download size={18} />
            Export
          </button>
        </div>
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
