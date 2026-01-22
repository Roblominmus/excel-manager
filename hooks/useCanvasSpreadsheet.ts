'use client';

import { useState, useCallback } from 'react';
import type { Sheet } from '@fortune-sheet/core';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

export function useCanvasSpreadsheet() {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load file with full style preservation using ExcelJS
   */
  const loadFile = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      
      const workbook = new ExcelJS.Workbook();
      
      // Detect format from URL
      if (url.includes('.csv')) {
        const text = new TextDecoder().decode(arrayBuffer);
        const rows = text.split('\n').map(row => row.split(','));
        const sheet = convertToFortuneSheet('Sheet1', rows);
        setSheets([sheet]);
      } else {
        // Excel or ODS format
        await workbook.xlsx.load(arrayBuffer);
        
        const fortuneSheets: Sheet[] = [];
        
        workbook.eachSheet((worksheet, _sheetId) => {
          const sheet = convertExcelJSToFortuneSheet(worksheet);
          fortuneSheets.push(sheet);
        });
        
        setSheets(fortuneSheets.length > 0 ? fortuneSheets : [createEmptySheet()]);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error loading file:', error);
      setError(error.message || 'Failed to load spreadsheet');
      // Create empty sheet on error
      setSheets([createEmptySheet()]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Convert ExcelJS worksheet to Fortune Sheet format with styles
   */
  const convertExcelJSToFortuneSheet = (worksheet: ExcelJS.Worksheet): Sheet => {
    const cellData: any[][] = [];
    
    worksheet.eachRow({ includeEmpty: true }, (row, rowIndex) => {
      const rowData: any[] = [];
      
      row.eachCell({ includeEmpty: true }, (cell, colIndex) => {
        const fortuneCell: any = {
          v: cell.value, // Value
          m: cell.text,  // Display text
        };
        
        // Preserve cell styles
        if (cell.style) {
          const ct: any = {};
          
          // Background color
          if (cell.style.fill && cell.style.fill.type === 'pattern') {
            const fill = cell.style.fill as ExcelJS.FillPattern;
            if (fill.fgColor?.argb) {
              fortuneCell.bg = '#' + fill.fgColor.argb.substring(2);
            }
          }
          
          // Font styles
          if (cell.style.font) {
            if (cell.style.font.bold) fortuneCell.bl = 1;
            if (cell.style.font.italic) fortuneCell.it = 1;
            if (cell.style.font.underline) fortuneCell.un = 1;
            if (cell.style.font.color?.argb) {
              fortuneCell.fc = '#' + cell.style.font.color.argb.substring(2);
            }
            if (cell.style.font.size) {
              fortuneCell.fs = cell.style.font.size;
            }
            if (cell.style.font.name) {
              fortuneCell.ff = cell.style.font.name;
            }
          }
          
          // Alignment
          if (cell.style.alignment) {
            if (cell.style.alignment.horizontal) {
              fortuneCell.ht = cell.style.alignment.horizontal === 'center' ? 0 : 
                               cell.style.alignment.horizontal === 'right' ? 2 : 1;
            }
            if (cell.style.alignment.vertical) {
              fortuneCell.vt = cell.style.alignment.vertical === 'middle' ? 0 :
                               cell.style.alignment.vertical === 'bottom' ? 2 : 1;
            }
          }
          
          // Number format
          if (cell.style.numFmt) {
            fortuneCell.ct = { fa: cell.style.numFmt, t: 'n' };
          }
        }
        
        // Handle formulas
        if (cell.formula) {
          fortuneCell.f = '=' + cell.formula;
        }
        
        rowData[colIndex - 1] = fortuneCell;
      });
      
      cellData[rowIndex - 1] = rowData;
    });
    
    // Get column widths
    const columnWidths: { cw: number }[] = [];
    worksheet.columns.forEach((col, index) => {
      columnWidths.push({ cw: col.width || 100 });
    });
    
    return {
      name: worksheet.name,
      celldata: flattenCellData(cellData),
      config: {
        columnlen: columnWidths.reduce((acc, col, i) => {
          acc[i] = col.cw * 7; // Convert to pixels
          return acc;
        }, {} as Record<number, number>),
      },
      id: worksheet.id.toString(),
      order: worksheet.id - 1,
      status: 1,
    };
  };

  /**
   * Flatten 2D array to Fortune Sheet celldata format
   */
  const flattenCellData = (data: any[][]): any[] => {
    const celldata: any[] = [];
    data.forEach((row, r) => {
      if (row) {
        row.forEach((cell, c) => {
          if (cell !== undefined && cell !== null) {
            celldata.push({ r, c, v: cell });
          }
        });
      }
    });
    return celldata;
  };

  /**
   * Create an empty sheet
   */
  const createEmptySheet = (): Sheet => ({
    name: 'Sheet1',
    celldata: [],
    config: {},
    id: '0',
    order: 0,
    status: 1,
    row: 100,
    column: 26,
  });

  /**
   * Convert Fortune Sheet data to simple array format
   */
  const convertToFortuneSheet = (name: string, rows: unknown[][]): Sheet => {
    const celldata: any[] = [];
    rows.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell !== undefined && cell !== null && cell !== '') {
          celldata.push({
            r,
            c,
            v: { v: cell, m: String(cell) },
          });
        }
      });
    });
    
    return {
      name,
      celldata,
      config: {},
      id: '0',
      order: 0,
      status: 1,
    };
  };

  /**
   * Export to Excel with full style preservation
   */
  const exportToExcel = useCallback(async (filename: string) => {
    const workbook = new ExcelJS.Workbook();
    
    sheets.forEach((sheet) => {
      const worksheet = workbook.addWorksheet(sheet.name);
      
      // Convert Fortune Sheet celldata back to ExcelJS format
      if (sheet.celldata) {
        sheet.celldata.forEach((cell: any) => {
          const excelCell = worksheet.getCell(cell.r + 1, cell.c + 1);
          const cellValue = cell.v;
          
          if (typeof cellValue === 'object') {
            excelCell.value = cellValue.v;
            
            // Restore styles
            if (cellValue.bg) {
              excelCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF' + cellValue.bg.replace('#', '') },
              };
            }
            
            const font: Partial<ExcelJS.Font> = {};
            if (cellValue.bl) font.bold = true;
            if (cellValue.it) font.italic = true;
            if (cellValue.un) font.underline = true;
            if (cellValue.fc) font.color = { argb: 'FF' + cellValue.fc.replace('#', '') };
            if (cellValue.fs) font.size = cellValue.fs;
            if (cellValue.ff) font.name = cellValue.ff;
            if (Object.keys(font).length > 0) {
              excelCell.font = font;
            }
            
            // Restore formula
            if (cellValue.f) {
              excelCell.value = { formula: cellValue.f.replace(/^=/, '') };
            }
          } else {
            excelCell.value = cellValue;
          }
        });
      }
      
      // Restore column widths
      if (sheet.config?.columnlen) {
        Object.entries(sheet.config.columnlen).forEach(([col, width]) => {
          worksheet.getColumn(parseInt(col) + 1).width = (width as number) / 7;
        });
      }
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${filename}.xlsx`);
  }, [sheets]);

  /**
   * Export to ODS format (LibreOffice) using XLSX library
   */
  const exportToODS = useCallback(async (filename: string) => {
    if (sheets.length === 0) return;
    
    // Convert Fortune Sheet format to XLSX workbook
    const wb = XLSX.utils.book_new();
    
    sheets.forEach((sheet) => {
      const data: any[][] = [];
      
      if (sheet.celldata) {
        sheet.celldata.forEach((cell: any) => {
          if (!data[cell.r]) data[cell.r] = [];
          const value = typeof cell.v === 'object' && cell.v !== null && 'v' in cell.v ? cell.v.v : cell.v;
          data[cell.r][cell.c] = value ?? '';
        });
      }
      
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name || 'Sheet1');
    });
    
    // Export as ODS
    XLSX.writeFile(wb, `${filename}.ods`, { bookType: 'ods' });
  }, [sheets]);

  /**
   * Export to CSV
   */
  const exportToCSV = useCallback((filename: string) => {
    if (sheets.length === 0) return;
    
    const sheet = sheets[0];
    const rows: string[][] = [];
    
    if (sheet.celldata) {
      sheet.celldata.forEach((cell: any) => {
        if (!rows[cell.r]) rows[cell.r] = [];
        const value = typeof cell.v === 'object' ? cell.v.v : cell.v;
        rows[cell.r][cell.c] = String(value ?? '');
      });
    }
    
    const csv = rows.map(row => row.join(',')).join('\n');
    saveAs(new Blob([csv], { type: 'text/csv' }), `${filename}.csv`);
  }, [sheets]);

  return {
    sheets,
    setSheets,
    loading,
    error,
    loadFile,
    exportToExcel,
    exportToCSV,
    exportToODS,
  };
}
