import { Dataset, MapeoColumna, TransformacionDataset, DatasetFusionado } from '../types.ts';
import { storageService } from '../storage/storage.service.ts';
import { DatasetParser } from './parser.ts';
import { CleaningPipeline } from './cleaning-pipeline.ts';

export interface FusionOptions {
  projectId: string;
  datasets: Dataset[];
  mapeos: MapeoColumna[];
  transformaciones: TransformacionDataset[];
  userId: string;
  version?: number;
}

export class FusionEngine {
  public static fuseDatasets(options: FusionOptions): {
    fusionRecord: Omit<DatasetFusionado, 'id'>;
    masterRows: Record<string, any>[];
  } {
    const { projectId, datasets, mapeos, transformaciones, userId, version = 1 } = options;

    if (datasets.length === 0) {
      throw new Error('No hay datasets para fusionar en este proyecto');
    }

    const datasetsFuenteResumen: { id: string; nombre: string; filas_aportadas: number }[] = [];
    const allConsolidatedRows: Record<string, any>[] = [];
    const schemaMap = new Map<string, { tipo: string; origenes: { dataset_id: string; columna_origen: string }[] }>();

    for (const dataset of datasets) {
      // 1. Read original raw file
      const buffer = storageService.readRawFile(dataset.ruta_archivo);
      const parsed = DatasetParser.parseFile(buffer, dataset.formato);

      let currentRows = parsed.rows;
      let currentHeaders = parsed.headers;

      // 2. Apply transformations for this dataset in chronological order
      const dsTransforms = transformaciones
        .filter(t => t.dataset_id === dataset.id)
        .sort((a, b) => new Date(a.ejecutado_en).getTime() - new Date(b.ejecutado_en).getTime());

      for (const t of dsTransforms) {
        const cleanRes = CleaningPipeline.applyTransformation(
          currentRows,
          currentHeaders,
          t.tipo_transformacion,
          t.columna,
          t.configuracion
        );
        currentRows = cleanRes.rows;
        currentHeaders = cleanRes.headers;
      }

      // 3. Apply column mappings to canonical names
      const dsMappings = mapeos.filter(m => m.dataset_id === dataset.id);
      const mappingDict: Record<string, string> = {};
      dsMappings.forEach(m => {
        mappingDict[m.columna_origen] = m.columna_canonica;
      });

      const mappedRows: Record<string, any>[] = currentRows.map(row => {
        const canonicalRow: Record<string, any> = {
          _source_dataset_id: dataset.id,
          _source_dataset_name: dataset.nombre_original
        };

        for (const [key, val] of Object.entries(row)) {
          const targetKey = mappingDict[key] || key;
          canonicalRow[targetKey] = val;

          // Track in schemaMap
          if (!schemaMap.has(targetKey)) {
            const detectedType = dataset.columnas_detectadas.find(c => c.nombre === key)?.tipo || 'texto';
            schemaMap.set(targetKey, {
              tipo: detectedType,
              origenes: [{ dataset_id: dataset.id, columna_origen: key }]
            });
          } else {
            const existing = schemaMap.get(targetKey)!;
            if (!existing.origenes.some(o => o.dataset_id === dataset.id && o.columna_origen === key)) {
              existing.origenes.push({ dataset_id: dataset.id, columna_origen: key });
            }
          }
        }
        return canonicalRow;
      });

      datasetsFuenteResumen.push({
        id: dataset.id,
        nombre: dataset.nombre_original,
        filas_aportadas: mappedRows.length
      });

      allConsolidatedRows.push(...mappedRows);
    }

    // 4. Save to storage/processed/ as Parquet-ready data
    const saved = storageService.saveProcessedParquetData(projectId, version, allConsolidatedRows);

    const esquemaConsolidado = Array.from(schemaMap.entries()).map(([nombre, meta]) => ({
      nombre,
      tipo: meta.tipo,
      origenes: meta.origenes
    }));

    const fusionRecord: Omit<DatasetFusionado, 'id'> = {
      proyecto_id: projectId,
      ruta_parquet: saved.relativePath,
      total_filas_consolidadas: allConsolidatedRows.length,
      tamano_mb: saved.sizeMb,
      version,
      esquema_consolidado: esquemaConsolidado,
      datasets_fuente: datasetsFuenteResumen,
      resumen_calidad: {
        total_columnas: esquemaConsolidado.length,
        total_filas: allConsolidatedRows.length,
        formato_almacenamiento: 'Apache Parquet + JSON Cache'
      },
      fusionado_por: userId,
      fusionado_en: new Date().toISOString()
    };

    return {
      fusionRecord,
      masterRows: allConsolidatedRows
    };
  }
}
