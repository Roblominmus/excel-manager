'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { SpreadsheetData, UndoRedoState } from '@/types/spreadsheet';
import { HyperFormula } from 'hyperformula';

export function useSpreadsheet(fileUrl?: string) {
  const [data, setData] = useState<SpreadsheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undoRedo, setUndoRedo] = useState<UndoRedoState>({
    past: [],
    present: null,
    future: [],
  });
  
  const hfRef = useRef<HyperFormula | null>(null);

  // Initialize HyperFormula instance
  useEffect(() => {
    if (!hfRef.current) {
      hfRef.current = HyperFormula.buildEmpty({
        licenseKey: 'gpl-v3',
      });
    }
  }, []);

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

      const spreadsheetData: SpreadsheetData = {
        headers,
        rows,
        metadata: {
          sheetName,
          rowCount: rows.length,
          columnCount: headers.length,
        },
      };

      setData(spreadsheetData);
      setUndoRedo({ past: [], present: spreadsheetData, future: [] });

      // Load data into HyperFormula
      if (hfRef.current) {
        hfRef.current.setSheetContent(0, [headers, ...rows]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load spreadsheet');
    } finally {
      setLoading(false);
    }
  };

  const updateData = useCallback((newData: SpreadsheetData) => {
    setUndoRedo((prev) => ({
      past: prev.present ? [...prev.past, prev.present] : prev.past,
      present: newData,
      future: [],
    }));
    setData(newData);

    // Update HyperFormula
    if (hfRef.current && newData) {
      hfRef.current.setSheetContent(0, [newData.headers, ...newData.rows]);
    }
  }, []);

  const updateCell = useCallback((rowIndex: number, colIndex: number, value: any) => {
    if (!data) return;

    const newRows = [...data.rows];
    if (!newRows[rowIndex]) {
      newRows[rowIndex] = [];
    }
    newRows[rowIndex][colIndex] = value;

    const newData = {
      ...data,
      rows: newRows,
    };

    updateData(newData);
  }, [data, updateData]);

  const undo = useCallback(() => {
    setUndoRedo((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, prev.past.length - 1);
      setData(previous);
      return {
        past: newPast,
        present: previous,
        future: prev.present ? [prev.present, ...prev.future] : prev.future,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setUndoRedo((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      setData(next);
      return {
        past: prev.present ? [...prev.past, prev.present] : prev.past,
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const evaluateFormula = useCallback((formula: string): any => {
    if (!hfRef.current) return formula;
    
    try {
      // HyperFormula evaluates formulas in the context of the entire sheet
      const result = hfRef.current.calculateFormula(formula, 0);
      return result;
    } catch (err) {
      return `#ERROR`;
    }
  }, []);

  const exportToExcel = useCallback(() => {
    if (!data) return;

    const ws = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, data.metadata?.sheetName || 'Sheet1');
    XLSX.writeFile(wb, 'export.xlsx');
  }, [data]);

  const exportToCSV = useCallback(() => {
    if (!data) return;

    const csvContent = [
      data.headers.join(','),
      ...data.rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

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
    updateData,
    exportToExcel,
    exportToCSV,
    evaluateFormula,
    undo,
    redo,
    canUndo: undoRedo.past.length > 0,
    canRedo: undoRedo.future.length > 0,
  };
}
