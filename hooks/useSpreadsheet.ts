'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { SpreadsheetData } from '@/types/spreadsheet';

export function useSpreadsheet(fileUrl?: string) {
  const [data, setData] = useState<SpreadsheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSpreadsheet = async (url: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length === 0) {
        throw new Error('Empty spreadsheet');
      }

      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1);

      setData({
        headers,
        rows,
        metadata: {
          sheetName,
          rowCount: rows.length,
          columnCount: headers.length,
        },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load spreadsheet');
    } finally {
      setLoading(false);
    }
  };

  const updateCell = (rowIndex: number, colIndex: number, value: any) => {
    if (!data) return;

    const newRows = [...data.rows];
    if (!newRows[rowIndex]) {
      newRows[rowIndex] = [];
    }
    newRows[rowIndex][colIndex] = value;

    setData({
      ...data,
      rows: newRows,
    });
  };

  const exportToExcel = () => {
    if (!data) return;

    const ws = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, data.metadata?.sheetName || 'Sheet1');
    XLSX.writeFile(wb, 'export.xlsx');
  };

  useEffect(() => {
    if (fileUrl) {
      loadSpreadsheet(fileUrl);
    }
  }, [fileUrl]);

  return {
    data,
    loading,
    error,
    loadSpreadsheet,
    updateCell,
    exportToExcel,
  };
}
