import { RubroProyecto, SugerenciaMapeo } from '../types.ts';

export interface EsquemaCanonicaDef {
  columna: string;
  tipo: string;
  descripcion: string;
  requerido: boolean;
  sinonimos: string[];
}

export const ESQUEMAS_CANONICOS: Record<RubroProyecto, EsquemaCanonicaDef[]> = {
  ventas: [
    { columna: 'fecha', tipo: 'fecha', descripcion: 'Fecha de la transacción o venta', requerido: true, sinonimos: ['fecha_venta', 'fecha_registro', 'fechaventa', 'date', 'created_at', 'periodo', 'dia'] },
    { columna: 'monto_total', tipo: 'decimal', descripcion: 'Importe monetario total de la venta', requerido: true, sinonimos: ['total_soles', 'monto', 'importe_neto', 'total_venta', 'total', 'precio_total', 'revenue', 'ingreso', 'ventas_totales', 'importe'] },
    { columna: 'cantidad', tipo: 'entero', descripcion: 'Unidades vendidas', requerido: true, sinonimos: ['cantidad_vendida', 'unidades', 'cant', 'qty', 'quantity', 'piezas', 'volumen'] },
    { columna: 'producto', tipo: 'texto', descripcion: 'Nombre o descripción del producto', requerido: true, sinonimos: ['nombre_producto', 'articulo', 'item', 'descripcion_item', 'producto_nombre', 'sku_name'] },
    { columna: 'categoria', tipo: 'categoria', descripcion: 'Categoría o rubro del producto', requerido: false, sinonimos: ['linea', 'familia', 'tipo_producto', 'rubro', 'grupo', 'category'] },
    { columna: 'tienda_origen', tipo: 'texto', descripcion: 'Sucursal o canal de venta', requerido: false, sinonimos: ['sucursal', 'sede', 'tienda', 'store', 'punto_venta', 'local', 'filial'] },
    { columna: 'oferta', tipo: 'texto', descripcion: 'Promoción u oferta aplicada', requerido: false, sinonimos: ['promocion', 'descuento_nombre', 'promo', 'codigo_oferta', 'oferta_especial'] },
    { columna: 'campaña', tipo: 'texto', descripcion: 'Campaña comercial asociada (e.g. Black Friday, Cyber)', requerido: false, sinonimos: ['campana', 'campaign', 'evento', 'cyber', 'black_friday', 'navidad'] },
    { columna: 'descuento', tipo: 'decimal', descripcion: 'Monto o porcentaje de descuento', requerido: false, sinonimos: ['descuento_monto', 'monto_descuento', 'discount', 'rebaja', 'porc_desc'] },
    { columna: 'cliente', tipo: 'texto', descripcion: 'Nombre o ID del cliente', requerido: false, sinonimos: ['nombre_cliente', 'customer', 'comprador', 'cliente_nombre', 'dni_cliente'] },
  ],
  comercio: [
    { columna: 'fecha', tipo: 'fecha', descripcion: 'Fecha de la operación', requerido: true, sinonimos: ['fecha', 'dia', 'date', 'periodo'] },
    { columna: 'monto_total', tipo: 'decimal', descripcion: 'Monto total', requerido: true, sinonimos: ['monto', 'total', 'importe', 'ventas', 'subtotal'] },
    { columna: 'cantidad', tipo: 'entero', descripcion: 'Cantidad', requerido: true, sinonimos: ['cantidad', 'unidades', 'qty'] },
    { columna: 'producto', tipo: 'texto', descripcion: 'Producto o servicio', requerido: true, sinonimos: ['producto', 'servicio', 'item'] },
    { columna: 'categoria', tipo: 'categoria', descripcion: 'Categoría comercial', requerido: false, sinonimos: ['categoria', 'linea', 'rubro'] },
    { columna: 'canal', tipo: 'texto', descripcion: 'Canal de distribución', requerido: false, sinonimos: ['canal', 'online_offline', 'medio'] },
  ],
  demografia: [
    { columna: 'departamento', tipo: 'texto', descripcion: 'Región o departamento geográfico', requerido: true, sinonimos: ['region', 'estado', 'depto', 'departamento_nombre', 'region_geografica'] },
    { columna: 'provincia', tipo: 'texto', descripcion: 'Provincia', requerido: false, sinonimos: ['provincia_nombre', 'municipio', 'condado'] },
    { columna: 'distrito', tipo: 'texto', descripcion: 'Distrito o localidad', requerido: false, sinonimos: ['distrito_nombre', 'comuna', 'barrio', 'localidad', 'ciudad'] },
    { columna: 'ubicacion', tipo: 'texto', descripcion: 'Nombre general de la ubicación', requerido: false, sinonimos: ['lugar', 'zona', 'sector', 'area', 'direccion'] },
    { columna: 'latitud', tipo: 'coordenada', descripcion: 'Coordenada de latitud (-90 a 90)', requerido: false, sinonimos: ['lat', 'latitude', 'coord_y', 'y'] },
    { columna: 'longitud', tipo: 'coordenada', descripcion: 'Coordenada de longitud (-180 a 180)', requerido: false, sinonimos: ['long', 'lng', 'longitude', 'coord_x', 'x'] },
    { columna: 'poblacion', tipo: 'entero', descripcion: 'Cantidad de habitantes o población total', requerido: true, sinonimos: ['habitantes', 'num_habitantes', 'pop', 'population', 'total_poblacion', 'personas', 'censo'] },
    { columna: 'edad', tipo: 'entero', descripcion: 'Edad o rango etario', requerido: false, sinonimos: ['grupo_edad', 'rango_etario', 'edad_promedio', 'age'] },
    { columna: 'genero', tipo: 'categoria', descripcion: 'Género o sexo', requerido: false, sinonimos: ['sexo', 'gender'] },
    { columna: 'estrato', tipo: 'categoria', descripcion: 'Nivel socioeconómico o estrato', requerido: false, sinonimos: ['nse', 'nivel_socioeconomico', 'estrato_social', 'clase'] },
    { columna: 'condicion', tipo: 'texto', descripcion: 'Condición demográfica o estado', requerido: false, sinonimos: ['estado_civil', 'ocupacion', 'condicion_laboral'] },
    { columna: 'indicador', tipo: 'decimal', descripcion: 'Métrica o indicador numérico', requerido: false, sinonimos: ['valor', 'indice', 'tasa', 'densidad', 'metrica'] },
  ],
  poblacion: [
    { columna: 'departamento', tipo: 'texto', descripcion: 'Región o departamento', requerido: true, sinonimos: ['region', 'depto', 'departamento'] },
    { columna: 'provincia', tipo: 'texto', descripcion: 'Provincia', requerido: false, sinonimos: ['provincia', 'ciudad'] },
    { columna: 'distrito', tipo: 'texto', descripcion: 'Distrito', requerido: false, sinonimos: ['distrito', 'localidad'] },
    { columna: 'poblacion', tipo: 'entero', descripcion: 'Habitantes totales', requerido: true, sinonimos: ['poblacion', 'habitantes', 'total_habitantes', 'personas'] },
    { columna: 'latitud', tipo: 'coordenada', descripcion: 'Latitud', requerido: false, sinonimos: ['lat', 'latitud'] },
    { columna: 'longitud', tipo: 'coordenada', descripcion: 'Longitud', requerido: false, sinonimos: ['lng', 'long', 'longitud'] },
    { columna: 'indicador', tipo: 'decimal', descripcion: 'Tasa o indicador', requerido: false, sinonimos: ['densidad', 'indice', 'valor'] },
  ],
  territorial: [
    { columna: 'departamento', tipo: 'texto', descripcion: 'Departamento / Región', requerido: true, sinonimos: ['departamento', 'region', 'zona'] },
    { columna: 'provincia', tipo: 'texto', descripcion: 'Provincia', requerido: false, sinonimos: ['provincia'] },
    { columna: 'distrito', tipo: 'texto', descripcion: 'Distrito', requerido: false, sinonimos: ['distrito', 'sector'] },
    { columna: 'latitud', tipo: 'coordenada', descripcion: 'Latitud geográfica', requerido: true, sinonimos: ['latitud', 'lat', 'y'] },
    { columna: 'longitud', tipo: 'coordenada', descripcion: 'Longitud geográfica', requerido: true, sinonimos: ['longitud', 'long', 'lng', 'x'] },
    { columna: 'indicador', tipo: 'decimal', descripcion: 'Intensidad / Densidad territorial', requerido: true, sinonimos: ['intensidad', 'densidad', 'valor', 'monto', 'cantidad', 'poblacion'] },
  ],
  inventario: [
    { columna: 'producto', tipo: 'texto', descripcion: 'Nombre del producto', requerido: true, sinonimos: ['nombre_producto', 'item', 'descripcion', 'articulo'] },
    { columna: 'categoria', tipo: 'categoria', descripcion: 'Categoría', requerido: false, sinonimos: ['categoria', 'familia', 'tipo'] },
    { columna: 'stock_actual', tipo: 'entero', descripcion: 'Unidades en inventario', requerido: true, sinonimos: ['stock', 'cantidad', 'unidades_disponibles', 'existencias'] },
    { columna: 'costo_unitario', tipo: 'decimal', descripcion: 'Costo por unidad', requerido: false, sinonimos: ['costo', 'precio_compra', 'valor_unitario'] },
    { columna: 'precio_venta', tipo: 'decimal', descripcion: 'Precio al público', requerido: false, sinonimos: ['precio', 'precio_lista', 'pvp'] },
    { columna: 'almacen', tipo: 'texto', descripcion: 'Ubicación o bodega', requerido: false, sinonimos: ['bodega', 'deposito', 'sucursal', 'almacen_origen'] },
  ],
  otros: [
    { columna: 'fecha', tipo: 'fecha', descripcion: 'Fecha de registro', requerido: false, sinonimos: ['fecha', 'date', 'periodo'] },
    { columna: 'identificador', tipo: 'texto', descripcion: 'Código o ID', requerido: false, sinonimos: ['id', 'codigo', 'cod', 'sku'] },
    { columna: 'nombre', tipo: 'texto', descripcion: 'Nombre o título', requerido: false, sinonimos: ['nombre', 'descripcion', 'titulo', 'item'] },
    { columna: 'categoria', tipo: 'categoria', descripcion: 'Categoría o grupo', requerido: false, sinonimos: ['categoria', 'tipo', 'clase'] },
    { columna: 'valor', tipo: 'decimal', descripcion: 'Monto o valor numérico', requerido: false, sinonimos: ['monto', 'cantidad', 'total', 'precio', 'valor'] },
  ]
};

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export class SemanticMatcher {
  public static matchColumn(
    columnaOrigen: string,
    rubro: RubroProyecto,
    sampleValues: any[] = []
  ): SugerenciaMapeo | null {
    const normCol = normalizeString(columnaOrigen);
    const esquema = ESQUEMAS_CANONICOS[rubro] || ESQUEMAS_CANONICOS.ventas;

    let bestMatch: { canonica: string; confianza: number; razon: string } = {
      canonica: normCol,
      confianza: 0.3,
      razon: 'Mapeo por defecto según nombre de columna'
    };

    for (const def of esquema) {
      const normCanonica = normalizeString(def.columna);

      // 1. Exact match with canonical name
      if (normCol === normCanonica) {
        return {
          columna_origen: columnaOrigen,
          columna_canonica_sugerida: def.columna,
          confianza: 0.99,
          razon: `Coincidencia exacta con campo canónico "${def.columna}"`,
          ejemplos_valores: sampleValues.slice(0, 3)
        };
      }

      // 2. Match with known synonyms
      for (const syn of def.sinonimos) {
        const normSyn = normalizeString(syn);
        if (normCol === normSyn) {
          return {
            columna_origen: columnaOrigen,
            columna_canonica_sugerida: def.columna,
            confianza: 0.95,
            razon: `Sinónimo reconocido ("${syn}") para campo estándar "${def.columna}"`,
            ejemplos_valores: sampleValues.slice(0, 3)
          };
        }

        // Substring inclusions (e.g. "total_soles" contains "soles" / "total")
        if (normCol.includes(normSyn) || normSyn.includes(normCol)) {
          const confidence = 0.85;
          if (confidence > bestMatch.confianza) {
            bestMatch = {
              canonica: def.columna,
              confianza: confidence,
              razon: `Similitud semántica con "${syn}" -> "${def.columna}"`
            };
          }
        }
      }

      // 3. String edit distance (Levenshtein similarity)
      const maxLen = Math.max(normCol.length, normCanonica.length);
      const dist = levenshteinDistance(normCol, normCanonica);
      const similarity = 1 - dist / maxLen;

      if (similarity > 0.7 && similarity > bestMatch.confianza) {
        bestMatch = {
          canonica: def.columna,
          confianza: Number(similarity.toFixed(2)),
          razon: `Alta similitud léxica (${Math.round(similarity * 100)}%) con "${def.columna}"`
        };
      }
    }

    return {
      columna_origen: columnaOrigen,
      columna_canonica_sugerida: bestMatch.canonica,
      confianza: bestMatch.confianza,
      razon: bestMatch.razon,
      ejemplos_valores: sampleValues.slice(0, 3)
    };
  }

  public static compareDatasetsColumns(
    datasets: { id: string; nombre: string; columnas: { nombre: string; tipo: string; ejemplos: any[] }[] }[],
    rubro: RubroProyecto
  ): {
    columnas_comparadas: {
      columna_canonica: string;
      descripcion: string;
      tipo_esperado: string;
      requerido: boolean;
      coincidencias_por_dataset: {
        dataset_id: string;
        dataset_nombre: string;
        columna_detectada?: string;
        confianza: number;
        sugerencia?: string;
      }[];
    }[];
  } {
    const esquema = ESQUEMAS_CANONICOS[rubro] || ESQUEMAS_CANONICOS.ventas;

    const columnas_comparadas = esquema.map(def => {
      const coincidencias_por_dataset = datasets.map(ds => {
        let bestCol: string | undefined = undefined;
        let bestScore = 0;
        let suggestedReason = '';

        for (const col of ds.columnas) {
          const match = this.matchColumn(col.nombre, rubro, col.ejemplos);
          if (match && match.columna_canonica_sugerida === def.columna && match.confianza > bestScore) {
            bestScore = match.confianza;
            bestCol = col.nombre;
            suggestedReason = match.razon;
          }
        }

        return {
          dataset_id: ds.id,
          dataset_nombre: ds.nombre,
          columna_detectada: bestCol,
          confianza: bestScore,
          sugerencia: suggestedReason
        };
      });

      return {
        columna_canonica: def.columna,
        descripcion: def.descripcion,
        tipo_esperado: def.tipo,
        requerido: def.requerido,
        coincidencias_por_dataset
      };
    });

    return { columnas_comparadas };
  }
}
