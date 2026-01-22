/**
 * Types for Spreadsheet
 */

export interface CellData {
  value: any;
  formula?: string;
  style?: CellStyle;
}

export interface StyledCell {
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
  fontColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  horizontalAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  numberFormat?: string;
}

export interface SpreadsheetData {
  headers: string[];
  rows: any[][];
  styles?: CellStyle[][];
  metadata?: {
    sheetName?: string;
    rowCount?: number;
    columnCount?: number;
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
