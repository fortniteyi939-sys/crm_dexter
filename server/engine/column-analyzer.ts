import { ColumnaDetectada, CalidadMetadatos } from '../types.ts';

export class ColumnAnalyzer {
  public static analyze(rows: Record<string, any>[], headers: string[]): {
    columnas: ColumnaDetectada[];
    calidad: CalidadMetadatos;
  } {
    const totalRows = rows.length;
    let totalEmptyCells = 0;
    let tieneCoordenadas = false;
    let tieneFechas = false;
    let tieneMontos = false;

    // Detect duplicates in first 1000 sample rows
    const sampleForDuplicates = rows.slice(0, 1000);
    const seen = new Set<string>();
    let duplicatesDetected = 0;
    for (const r of sampleForDuplicates) {
      const key = JSON.stringify(r);
      if (seen.has(key)) {
        duplicatesDetected++;
      } else {
        seen.add(key);
      }
    }

    const columnas: ColumnaDetectada[] = headers.map(header => {
      let nullCount = 0;
      const values: any[] = [];
      const distinctSet = new Set();
      let isNumeric = true;
      let isInteger = true;
      let isDate = true;
      let isBoolean = true;
      let numericSum = 0;
      let numericCount = 0;
      let minVal: any = undefined;
      let maxVal: any = undefined;

      const normHeader = header.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      if (['lat', 'latitud', 'latitude', 'long', 'longitud', 'longitude', 'lng'].includes(normHeader)) {
        tieneCoordenadas = true;
      }
      if (['fecha', 'date', 'periodo', 'mes', 'anio', 'created_at', 'timestamp'].some(k => normHeader.includes(k))) {
        tieneFechas = true;
      }
      if (['monto', 'total', 'precio', 'ingreso', 'costo', 'venta', 'importe'].some(k => normHeader.includes(k))) {
        tieneMontos = true;
      }

      for (let i = 0; i < totalRows; i++) {
        const val = rows[i][header];
        if (val === null || val === undefined || val === '' || String(val).trim().toLowerCase() === 'nan' || String(val).trim().toLowerCase() === 'null') {
          nullCount++;
          totalEmptyCells++;
          continue;
        }

        values.push(val);
        distinctSet.add(String(val));

        // Numeric checks
        const numVal = Number(val);
        if (isNaN(numVal)) {
          isNumeric = false;
          isInteger = false;
        } else {
          numericSum += numVal;
          numericCount++;
          if (!Number.isInteger(numVal)) {
            isInteger = false;
          }
          if (minVal === undefined || numVal < minVal) minVal = numVal;
          if (maxVal === undefined || numVal > maxVal) maxVal = numVal;
        }

        // Date check
        if (typeof val === 'string' && isNaN(Date.parse(val))) {
          isDate = false;
        } else if (typeof val === 'number') {
          // If it's a small number or not a reasonable timestamp, not date
          if (val < 1000000000 && val > 3000) {
            isDate = false;
          }
        }

        // Boolean check
        const strVal = String(val).toLowerCase();
        if (!['true', 'false', '1', '0', 'si', 'no', 's', 'n', 't', 'f'].includes(strVal)) {
          isBoolean = false;
        }
      }

      // Determine final type
      let tipo: ColumnaDetectada['tipo'] = 'texto';
      if (['latitud', 'longitud', 'lat', 'lng', 'lat_long', 'coordenadas'].includes(normHeader)) {
        tipo = 'coordenada';
      } else if (values.length > 0 && isNumeric) {
        tipo = isInteger ? 'entero' : 'decimal';
      } else if (values.length > 0 && isDate && (normHeader.includes('fecha') || normHeader.includes('date') || normHeader.includes('periodo'))) {
        tipo = 'fecha';
      } else if (values.length > 0 && isBoolean) {
        tipo = 'booleano';
      } else if (distinctSet.size > 0 && distinctSet.size <= 25 && totalRows > 50) {
        tipo = 'categoria';
      }

      const pctNull = totalRows > 0 ? Number(((nullCount / totalRows) * 100).toFixed(1)) : 0;
      const ejemplos = Array.from(distinctSet).slice(0, 5);

      return {
        nombre: header,
        tipo,
        total_nulos: nullCount,
        porcentaje_nulos: pctNull,
        total_unicos: distinctSet.size,
        ejemplos,
        min: minVal,
        max: maxVal,
        promedio: numericCount > 0 ? Number((numericSum / numericCount).toFixed(2)) : undefined
      };
    });

    const totalCells = totalRows * headers.length;
    const completenessScore = totalCells > 0 ? Math.max(0, 100 - (totalEmptyCells / totalCells) * 100) : 100;
    const duplicatePenalty = totalRows > 0 ? Math.min(20, (duplicatesDetected / totalRows) * 100) : 0;
    const qualityScore = Math.max(10, Math.min(100, Math.round(completenessScore - duplicatePenalty)));

    return {
      columnas,
      calidad: {
        puntuacion_calidad: qualityScore,
        total_filas: totalRows,
        total_columnas: headers.length,
        celdas_vacias: totalEmptyCells,
        duplicados_detectados: duplicatesDetected,
        tiene_coordenadas: tieneCoordenadas,
        tiene_fechas: tieneFechas,
        tiene_montos: tieneMontos
      }
    };
  }
}
