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

export interface OpenFile {
  id: string;
  name: string;
  url: string;
  data: SpreadsheetData | null;
  isDirty: boolean;
}

export interface UndoRedoState {
  past: SpreadsheetData[];
  present: SpreadsheetData | null;
  future: SpreadsheetData[];
}
