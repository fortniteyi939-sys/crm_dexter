import fs from 'fs';
import path from 'path';

export class StorageService {
  private baseDir: string;
  private rawDir: string;
  private processedDir: string;
  private tempDir: string;

  constructor(basePath: string = './storage') {
    this.baseDir = path.resolve(process.cwd(), basePath);
    this.rawDir = path.join(this.baseDir, 'raw');
    this.processedDir = path.join(this.baseDir, 'processed');
    this.tempDir = path.join(this.baseDir, 'temp');
    this.initDirectories();
  }

  private initDirectories() {
    [this.baseDir, this.rawDir, this.processedDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  public saveRawFile(filename: string, buffer: Buffer): { filepath: string; relativePath: string; size: number } {
    const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filepath = path.join(this.rawDir, safeName);
    fs.writeFileSync(filepath, buffer);
    return {
      filepath,
      relativePath: path.join('storage', 'raw', safeName),
      size: buffer.length
    };
  }

  public readRawFile(filepathOrRelative: string): Buffer {
    const fullPath = path.isAbsolute(filepathOrRelative) 
      ? filepathOrRelative 
      : path.resolve(process.cwd(), filepathOrRelative);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Archivo no encontrado: ${filepathOrRelative}`);
    }
    return fs.readFileSync(fullPath);
  }

  public saveProcessedParquetData(projectId: string, version: number, data: any[]): { filepath: string; relativePath: string; sizeMb: number } {
    const filename = `proyecto_${projectId}_v${version}_master.parquet.json`;
    const filepath = path.join(this.processedDir, filename);
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(filepath, content, 'utf-8');
    const stats = fs.statSync(filepath);
    return {
      filepath,
      relativePath: path.join('storage', 'processed', filename),
      sizeMb: Number((stats.size / (1024 * 1024)).toFixed(2))
    };
  }

  public readProcessedData(projectId: string, version?: number): any[] | null {
    // Find matching processed file
    const files = fs.readdirSync(this.processedDir);
    const prefix = `proyecto_${projectId}`;
    const matching = files
      .filter(f => f.startsWith(prefix))
      .sort()
      .reverse();

    if (matching.length === 0) return null;
    const targetFile = version 
      ? `proyecto_${projectId}_v${version}_master.parquet.json`
      : matching[0];

    const fullPath = path.join(this.processedDir, targetFile);
    if (!fs.existsSync(fullPath)) return null;

    const content = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(content);
  }

  public getStorageStats() {
    const countFiles = (dir: string) => {
      if (!fs.existsSync(dir)) return 0;
      return fs.readdirSync(dir).length;
    };
    return {
      rawFiles: countFiles(this.rawDir),
      processedFiles: countFiles(this.processedDir),
      tempFiles: countFiles(this.tempDir),
      baseDir: this.baseDir
    };
  }
}

export const storageService = new StorageService();
