import { TipoTransformacion, TransformacionDataset } from '../types.ts';

export interface CleaningResult {
  rows: Record<string, any>[];
  headers: string[];
  filas_antes: number;
  filas_despues: number;
  filas_afectadas: number;
  resumen_accion: string;
}

export class CleaningPipeline {
  public static applyTransformation(
    rows: Record<string, any>[],
    headers: string[],
    tipo: TipoTransformacion,
    columna?: string,
    config: Record<string, any> = {}
  ): CleaningResult {
    const filas_antes = rows.length;
    let newRows = [...rows.map(r => ({ ...r }))];
    let newHeaders = [...headers];
    let affectedCount = 0;
    let resumen = '';

    switch (tipo) {
      case 'eliminar_nulos': {
        if (columna) {
          newRows = newRows.filter(r => {
            const val = r[columna];
            const isNull = val === null || val === undefined || val === '' || String(val).trim().toLowerCase() === 'nan' || String(val).trim().toLowerCase() === 'null';
            if (isNull) affectedCount++;
            return !isNull;
          });
          resumen = `Se eliminaron ${affectedCount} filas con valores nulos en la columna "${columna}"`;
        } else {
          newRows = newRows.filter(r => {
            const hasNull = Object.values(r).some(val => val === null || val === undefined || val === '' || String(val).trim().toLowerCase() === 'nan');
            if (hasNull) affectedCount++;
            return !hasNull;
          });
          resumen = `Se eliminaron ${affectedCount} filas que contenían valores nulos en cualquier columna`;
        }
        break;
      }

      case 'rellenar_nulos': {
        if (!columna) throw new Error('Se requiere especificar la columna para rellenar nulos');
        const metodo = config.metodo || 'valor_personalizado'; // 'media' | 'mediana' | 'moda' | 'valor_personalizado'
        const customVal = config.valor_personalizado ?? 'N/A';

        let fillValue: any = customVal;

        if (metodo === 'media' || metodo === 'mediana') {
          const numbers = newRows
            .map(r => Number(r[columna]))
            .filter(n => !isNaN(n) && n !== null && n !== undefined)
            .sort((a, b) => a - b);

          if (numbers.length > 0) {
            if (metodo === 'media') {
              const sum = numbers.reduce((acc, v) => acc + v, 0);
              fillValue = Number((sum / numbers.length).toFixed(2));
            } else {
              const mid = Math.floor(numbers.length / 2);
              fillValue = numbers.length % 2 !== 0 ? numbers[mid] : (numbers[mid - 1] + numbers[mid]) / 2;
            }
          }
        } else if (metodo === 'moda') {
          const freqMap = new Map<any, number>();
          newRows.forEach(r => {
            const val = r[columna];
            if (val !== null && val !== undefined && val !== '') {
              freqMap.set(val, (freqMap.get(val) || 0) + 1);
            }
          });
          let maxFreq = 0;
          for (const [k, count] of freqMap.entries()) {
            if (count > maxFreq) {
              maxFreq = count;
              fillValue = k;
            }
          }
        }

        newRows.forEach(r => {
          const val = r[columna];
          if (val === null || val === undefined || val === '' || String(val).trim().toLowerCase() === 'nan' || String(val).trim().toLowerCase() === 'null') {
            r[columna] = fillValue;
            affectedCount++;
          }
        });
        resumen = `Se rellenaron ${affectedCount} valores nulos en "${columna}" usando método "${metodo}" (Valor: ${fillValue})`;
        break;
      }

      case 'eliminar_duplicados': {
        const keyCols = config.columnas_clave && Array.isArray(config.columnas_clave) && config.columnas_clave.length > 0
          ? config.columnas_clave
          : headers;

        const seen = new Set<string>();
        const uniqueRows: Record<string, any>[] = [];

        for (const r of newRows) {
          const keyObj: Record<string, any> = {};
          keyCols.forEach((c: string) => { keyObj[c] = r[c]; });
          const hash = JSON.stringify(keyObj);

          if (seen.has(hash)) {
            affectedCount++;
          } else {
            seen.add(hash);
            uniqueRows.push(r);
          }
        }
        newRows = uniqueRows;
        resumen = `Se eliminaron ${affectedCount} filas duplicadas`;
        break;
      }

      case 'convertir_tipo': {
        if (!columna) throw new Error('Se requiere especificar la columna a convertir');
        const targetType = config.tipo_destino; // 'numero' | 'fecha' | 'texto' | 'booleano'

        newRows.forEach(r => {
          const val = r[columna];
          if (val === null || val === undefined || val === '') return;

          let convertedVal = val;
          if (targetType === 'numero') {
            const cleanStr = String(val).replace(/[^0-9.-]+/g, '');
            const num = Number(cleanStr);
            if (!isNaN(num)) convertedVal = num;
          } else if (targetType === 'fecha') {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
              convertedVal = d.toISOString().split('T')[0];
            }
          } else if (targetType === 'texto') {
            convertedVal = String(val);
          } else if (targetType === 'booleano') {
            const str = String(val).toLowerCase();
            convertedVal = ['true', '1', 'si', 's'].includes(str);
          }

          if (convertedVal !== val) {
            r[columna] = convertedVal;
            affectedCount++;
          }
        });
        resumen = `Se transformó el tipo de datos de "${columna}" a "${targetType}" en ${affectedCount} registros`;
        break;
      }

      case 'normalizar_fechas': {
        if (!columna) throw new Error('Se requiere especificar la columna de fecha');
        newRows.forEach(r => {
          const val = r[columna];
          if (!val) return;
          const d = new Date(val);
          if (!isNaN(d.getTime())) {
            const iso = d.toISOString().split('T')[0];
            if (iso !== val) {
              r[columna] = iso;
              affectedCount++;
            }
          }
        });
        resumen = `Se normalizaron ${affectedCount} fechas al formato estándar YYYY-MM-DD en "${columna}"`;
        break;
      }

      case 'renombrar_columna': {
        const nuevoNombre = config.nuevo_nombre;
        if (!columna || !nuevoNombre) throw new Error('Se requiere columna actual y nuevo nombre');
        newRows.forEach(r => {
          r[nuevoNombre] = r[columna];
          delete r[columna];
        });
        newHeaders = newHeaders.map(h => (h === columna ? nuevoNombre : h));
        affectedCount = newRows.length;
        resumen = `Columna "${columna}" renombrada a "${nuevoNombre}"`;
        break;
      }

      case 'eliminar_columna': {
        if (!columna) throw new Error('Se requiere especificar la columna a eliminar');
        newRows.forEach(r => {
          delete r[columna];
        });
        newHeaders = newHeaders.filter(h => h !== columna);
        affectedCount = newRows.length;
        resumen = `Se eliminó la columna "${columna}" de la estructura`;
        break;
      }

      case 'limpiar_espacios': {
        if (columna) {
          newRows.forEach(r => {
            if (typeof r[columna] === 'string') {
              const cleaned = r[columna].trim().replace(/\s+/g, ' ');
              if (cleaned !== r[columna]) {
                r[columna] = cleaned;
                affectedCount++;
              }
            }
          });
          resumen = `Espacios limpiados en la columna "${columna}" (${affectedCount} registros)`;
        } else {
          newRows.forEach(r => {
            Object.keys(r).forEach(k => {
              if (typeof r[k] === 'string') {
                const cleaned = r[k].trim().replace(/\s+/g, ' ');
                if (cleaned !== r[k]) {
                  r[k] = cleaned;
                  affectedCount++;
                }
              }
            });
          });
          resumen = `Se limpiaron espacios en blanco redundantes en todo el dataset`;
        }
        break;
      }

      case 'limpiar_caracteres_especiales': {
        if (!columna) throw new Error('Se requiere columna para limpiar caracteres especiales');
        newRows.forEach(r => {
          if (typeof r[columna] === 'string') {
            const cleaned = r[columna].replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,_-]/g, '');
            if (cleaned !== r[columna]) {
              r[columna] = cleaned;
              affectedCount++;
            }
          }
        });
        resumen = `Se sanearon caracteres especiales en "${columna}" (${affectedCount} registros)`;
        break;
      }

      case 'estandarizar_texto': {
        if (!columna) throw new Error('Se requiere columna para estandarizar texto');
        const modo = config.modo || 'mayusculas'; // 'mayusculas' | 'minusculas' | 'capitalizado'
        newRows.forEach(r => {
          if (typeof r[columna] === 'string') {
            let processed = r[columna];
            if (modo === 'mayusculas') processed = processed.toUpperCase();
            else if (modo === 'minusculas') processed = processed.toLowerCase();
            else if (modo === 'capitalizado') {
              processed = processed.toLowerCase().replace(/(^|\s)\S/g, (l: string) => l.toUpperCase());
            }
            if (processed !== r[columna]) {
              r[columna] = processed;
              affectedCount++;
            }
          }
        });
        resumen = `Se estandarizó formato de texto a ${modo} en "${columna}" (${affectedCount} registros)`;
        break;
      }

      default:
        throw new Error(`Tipo de transformación desconocido: ${tipo}`);
    }

    return {
      rows: newRows,
      headers: newHeaders,
      filas_antes,
      filas_despues: newRows.length,
      filas_afectadas: affectedCount,
      resumen_accion: resumen
    };
  }
}
