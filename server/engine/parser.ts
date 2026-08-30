import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedDatasetResult {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

export class DatasetParser {
  public static parseFile(buffer: Buffer, format: 'csv' | 'xlsx'): ParsedDatasetResult {
    if (format === 'csv') {
      return this.parseCSV(buffer);
    } else if (format === 'xlsx') {
      return this.parseXLSX(buffer);
    }
    throw new Error(`Formato no soportado: ${format}`);
  }

  private static parseCSV(buffer: Buffer): ParsedDatasetResult {
    const csvString = buffer.toString('utf-8');
    const result = Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      transformHeader: (header) => header.trim()
    });

    if (result.errors && result.errors.length > 0 && (!result.data || result.data.length === 0)) {
      throw new Error(`Error al procesar CSV: ${result.errors[0].message}`);
    }

    const headers = result.meta.fields || (result.data[0] ? Object.keys(result.data[0] as object) : []);
    const rows = result.data as Record<string, any>[];

    return {
      headers,
      rows,
      totalRows: rows.length
    };
  }

  private static parseXLSX(buffer: Buffer): ParsedDatasetResult {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('El archivo Excel no contiene hojas de cálculo');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: null,
      raw: false
    });

    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      headers,
      rows,
      totalRows: rows.length
    };
  }
}
