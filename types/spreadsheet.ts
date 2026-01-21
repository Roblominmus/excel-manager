/**
 * Types for Spreadsheet
 */

export interface CellData {
  value: any;
  formula?: string;
  style?: CellStyle;
}

export interface CellStyle {
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  backgroundColor?: string;
  color?: string;
}

export interface SpreadsheetData {
  headers: string[];
  rows: any[][];
  metadata?: {
    sheetName: string;
    rowCount: number;
    columnCount: number;
  };
}
