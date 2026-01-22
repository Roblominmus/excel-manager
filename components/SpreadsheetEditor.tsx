'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { SpreadsheetData } from '@/types/spreadsheet';
import { DataGrid, Column, RenderCellProps } from 'react-data-grid';
import { Download, Save, Undo, Redo, FileDown, Maximize2, Minimize2, Search } from 'lucide-react';
import { useSpreadsheet } from '@/hooks/useSpreadsheet';
import 'react-data-grid/lib/styles.css';

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
  isFullscreen = false,
}: SpreadsheetEditorProps) {
  const { 
    data, 
    loading, 
    error, 
    exportToExcel, 
    exportToCSV,
    updateData,
    undo,
    redo,
    canUndo,
    canRedo,
    evaluateFormula,
  } = useSpreadsheet(fileUrl);
  
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<{idx: number, rowIdx: number} | null>(null);
  const [formulaBarValue, setFormulaBarValue] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const gridRef = useRef<any>(null);
  const prevDataRef = useRef<SpreadsheetData | null>(null);
  
  // Notify parent when data is loaded
  // Note: onDataLoaded is intentionally excluded from dependencies to prevent infinite loops
  // when the parent component doesn't memoize the callback. The ref pattern ensures we only
  // call onDataLoaded when data actually changes, not when the callback reference changes.
  useEffect(() => {
    if (data && onDataLoaded && data !== prevDataRef.current) {
      prevDataRef.current = data;
      onDataLoaded(data);
    }
  }, [data]); // onDataLoaded intentionally excluded

  // Pass evaluateFormula to parent when available
  useEffect(() => {
    if (onEvaluateFormulaReady && evaluateFormula) {
      onEvaluateFormulaReady(evaluateFormula);
    }
  }, [evaluateFormula, onEvaluateFormulaReady]);

  // Track cell selection
  const handleCellClick = useCallback((args: { column: any; row: any; rowIdx: number }) => {
    if (!data) return;
    
    // Find column index from column key
    const colIdx = data.headers.indexOf(args.column.key === '__row_number__' ? data.headers[0] : args.column.key);
    if (colIdx === -1 || args.column.key === '__row_number__') return;
    
    setSelectedPosition({ idx: colIdx, rowIdx: args.rowIdx });
    const rawValue = data.rows[args.rowIdx]?.[colIdx] ?? '';
    setFormulaBarValue(String(rawValue));
    setSelectedCell({ row: args.rowIdx, col: colIdx });
  }, [data]);

  // Apply formula bar value to cell on Enter
  const handleFormulaBarKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedCell && data) {
      const newRows = [...data.rows];
      if (!newRows[selectedCell.row]) {
        newRows[selectedCell.row] = [];
      }
      newRows[selectedCell.row][selectedCell.col] = formulaBarValue;
      updateData({ ...data, rows: newRows });
      setIsDirty(true);
      if (onDataChange) {
        onDataChange(newRows, true);
      }
    }
  };

  // Convert data to DataGrid format
  const rows = useMemo(() => {
    return data?.rows.map((row, idx) => {
      const rowObj: any = { id: idx };
      data.headers.forEach((header, colIdx) => {
        const cellValue = row[colIdx] ?? '';
        // If it's a formula, evaluate it
        if (typeof cellValue === 'string' && cellValue.startsWith('=')) {
          try {
            const result = evaluateFormula(cellValue);
            rowObj[header] = result;
          } catch {
            rowObj[header] = cellValue;
          }
        } else {
          rowObj[header] = cellValue;
        }
      });
      return rowObj;
    }) ?? [];
  }, [data, evaluateFormula]);

  // Get column letter from index (0 = A, 1 = B, etc.)
  const getColumnLetter = (index: number): string => {
    let letter = '';
    let num = index;
    while (num >= 0) {
      letter = String.fromCharCode(65 + (num % 26)) + letter;
      num = Math.floor(num / 26) - 1;
    }
    return letter;
  };

  const columns: Column<any>[] = useMemo(() => {
    const cols: Column<any>[] = [];
    
    // Add row number column
    cols.push({
      key: '__row_number__',
      name: '',
      width: 50,
      frozen: true,
      resizable: false,
      renderCell: (props: RenderCellProps<any>) => (
        <div style={{ 
          textAlign: 'center', 
          color: 'var(--text-secondary)',
          fontWeight: 600,
          backgroundColor: 'var(--gray-100)',
        }}>
          {props.rowIdx + 1}
        </div>
      ),
    });

    // Add data columns with column letters
    data?.headers.forEach((header, idx) => {
      cols.push({
        key: header,
        name: `${getColumnLetter(idx)} - ${header}`,
        resizable: true,
        editable: true,
        width: 120,
      });
    });
    
    return cols;
  }, [data]);

  const handleRowsChange = useCallback((newRows: any[]) => {
    if (!data) return;
    
    const updatedData = newRows.map(row => {
      return data.headers.map(header => row[header]);
    });
    
    const newData = {
      ...data,
      rows: updatedData,
    };
    
    updateData(newData);
    setIsDirty(true);
    
    if (onDataChange) {
      onDataChange(updatedData, true);
    }
  }, [data, updateData, onDataChange]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z for undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
          setIsDirty(true);
        }
      }
      // Ctrl+Y or Ctrl+Shift+Z for redo
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        if (canRedo) {
          redo();
          setIsDirty(true);
        }
      }
      // Ctrl+S for save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (onSave) {
          onSave();
          setIsDirty(false);
        }
      }
      // Ctrl+F for find
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setShowFindReplace(true);
      }
      // Escape to close find/replace
      if (e.key === 'Escape' && showFindReplace) {
        setShowFindReplace(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo, onSave, showFindReplace]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-gray-900 mx-auto mb-3"></div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading spreadsheet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center bg-red-50 p-6 border border-red-200 max-w-md">
          <p className="font-medium text-red-900 mb-1">Error loading spreadsheet</p>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--gray-100)' }}>
            <svg className="w-8 h-8" style={{ color: 'var(--gray-400)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No spreadsheet loaded</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Select a file to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Toolbar */}
      <div className="px-4 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--gray-50)' }}>
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            {fileName || data.metadata?.sheetName || 'Sheet'}
            {isDirty && <span className="text-orange-500 ml-1">•</span>}
          </h3>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {data.metadata?.rowCount} rows × {data.metadata?.columnCount} columns
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="px-2 py-1.5 text-sm flex items-center gap-1.5 transition-colors disabled:opacity-40"
            style={{ 
              backgroundColor: 'var(--bg-primary)', 
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
            title="Undo (Ctrl+Z)"
          >
            <Undo size={14} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="px-2 py-1.5 text-sm flex items-center gap-1.5 transition-colors disabled:opacity-40"
            style={{ 
              backgroundColor: 'var(--bg-primary)', 
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
            title="Redo (Ctrl+Y)"
          >
            <Redo size={14} />
          </button>
          <button
            onClick={() => setShowFindReplace(!showFindReplace)}
            className="px-2 py-1.5 text-sm flex items-center gap-1.5 transition-colors"
            style={{ 
              backgroundColor: showFindReplace ? 'rgba(0, 102, 204, 0.1)' : 'var(--bg-primary)', 
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
            title="Find & Replace (Ctrl+F)"
          >
            <Search size={14} />
          </button>
          {onSave && (
            <button
              onClick={() => {
                onSave();
                setIsDirty(false);
              }}
              className="px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors"
              style={{ 
                backgroundColor: 'var(--bg-primary)', 
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
              title="Save (Ctrl+S)"
            >
              <Save size={14} />
              Save
            </button>
          )}
          <button
            onClick={exportToExcel}
            className="px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors"
            style={{ 
              backgroundColor: 'var(--bg-primary)', 
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
            title="Export to Excel"
          >
            <Download size={14} />
            XLSX
          </button>
          <button
            onClick={exportToCSV}
            className="px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors"
            style={{ 
              backgroundColor: 'var(--bg-primary)', 
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
            title="Export to CSV"
          >
            <FileDown size={14} />
            CSV
          </button>
          {onFullscreenToggle && (
            <button
              onClick={onFullscreenToggle}
              className="px-2 py-1.5 text-sm flex items-center gap-1.5 transition-colors"
              style={{ 
                backgroundColor: 'var(--bg-primary)', 
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Formula Bar */}
      <div className="px-4 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)', minWidth: '60px' }}>
          {selectedCell ? `${getColumnLetter(selectedCell.col)}${selectedCell.row + 1}` : ''}
        </span>
        <input
          type="text"
          value={formulaBarValue}
          onChange={(e) => setFormulaBarValue(e.target.value)}
          onKeyDown={handleFormulaBarKeyDown}
          placeholder="Enter formula or value"
          className="flex-1 px-2 py-1 text-sm"
          style={{ 
            backgroundColor: 'var(--bg-primary)', 
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
        />
      </div>

      {/* Find & Replace Panel */}
      {showFindReplace && (
        <div className="px-4 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--gray-50)' }}>
          <input
            type="text"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            placeholder="Find..."
            className="px-2 py-1 text-sm"
            style={{ 
              backgroundColor: 'var(--bg-primary)', 
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              width: '150px',
            }}
          />
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="Replace with..."
            className="px-2 py-1 text-sm"
            style={{ 
              backgroundColor: 'var(--bg-primary)', 
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              width: '150px',
            }}
          />
          <button
            onClick={() => {
              if (!findText || !data) return;
              const newRows = data.rows.map(row => 
                row.map(cell => 
                  typeof cell === 'string' && cell.includes(findText) 
                    ? cell.replace(new RegExp(findText, 'g'), replaceText)
                    : cell
                )
              );
              updateData({ ...data, rows: newRows });
              setIsDirty(true);
              if (onDataChange) onDataChange(newRows, true);
            }}
            className="px-3 py-1 text-sm"
            style={{ 
              backgroundColor: 'var(--primary)', 
              color: 'white',
              border: '1px solid var(--primary)',
            }}
          >
            Replace All
          </button>
          <button
            onClick={() => setShowFindReplace(false)}
            className="px-2 py-1 text-sm"
            style={{ 
              color: 'var(--text-secondary)',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Spreadsheet Grid - Full Height */}
      <div className="flex-1 min-h-0">
        <DataGrid
          ref={gridRef}
          columns={columns}
          rows={rows}
          onRowsChange={handleRowsChange}
          onCellClick={handleCellClick}
          className="rdg-light"
          style={{ height: '100%' }}
          rowHeight={28}
          headerRowHeight={32}
        />
      </div>

      {/* Status Bar */}
      <div className="px-4 py-1.5 flex items-center justify-between text-xs" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--gray-50)' }}>
        <div className="flex items-center gap-4">
          {selectedCell && data && (() => {
            // Calculate statistics for selected cell or range
            const cellValue = data.rows[selectedCell.row]?.[selectedCell.col];
            const numValue = typeof cellValue === 'number' ? cellValue : parseFloat(String(cellValue));
            
            if (!isNaN(numValue)) {
              return (
                <>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    <strong>Value:</strong> {numValue.toLocaleString()}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    <strong>SUM:</strong> {numValue.toLocaleString()}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    <strong>COUNT:</strong> 1
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    <strong>AVG:</strong> {numValue.toLocaleString()}
                  </span>
                </>
              );
            }
            return (
              <span style={{ color: 'var(--text-secondary)' }}>
                Cell: {getColumnLetter(selectedCell.col)}{selectedCell.row + 1}
              </span>
            );
          })()}
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          Ready
        </div>
      </div>
    </div>
  );
}
