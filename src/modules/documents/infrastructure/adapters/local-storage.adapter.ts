import { promises as fs } from 'fs';
import * as path from 'path';
import { StorageAdapter } from '@/src/modules/documents/domain/interfaces/storage.interface';

/**
 * Adaptador de almacenamiento local para archivos PDF
 * Guarda los PDFs en el sistema de archivos local
 * 
 * Configuración:
 * - DOCUMENT_STORAGE_PATH: directorio base para almacenar PDFs (default: ./storage/documents)
 */
export class LocalStorageAdapter implements StorageAdapter {
  private basePath: string;

  constructor(basePath?: string) {
    const configuredPath = basePath || process.env.DOCUMENT_STORAGE_PATH || './storage/documents';
    this.basePath = path.resolve(configuredPath);
  }

  async save(key: string, buffer: Buffer): Promise<string> {
    try {
      // Crear directorio si no existe
      await fs.mkdir(this.basePath, { recursive: true });

      // Sanitizar el key para evitar path traversal attacks
      const fileName = `${this.sanitizeKey(key)}.pdf`;
      const filePath = path.join(this.basePath, fileName);

      // Guardar el archivo
      await fs.writeFile(filePath, buffer);

      // Retornar solo el identificador seguro del archivo.
      return fileName;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to save PDF: ${errorMessage}`);
    }
  }

  async retrieve(storageUrl: string): Promise<Buffer> {
    try {
      const filePath = this.resolveStoragePath(storageUrl);

      // Leer y retornar el archivo
      const buffer = await fs.readFile(filePath);
      return buffer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to retrieve PDF: ${errorMessage}`);
    }
  }

  async exists(storageUrl: string): Promise<boolean> {
    try {
      const filePath = this.resolveStoragePath(storageUrl);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async delete(storageUrl: string): Promise<void> {
    try {
      const filePath = this.resolveStoragePath(storageUrl);

      await fs.unlink(filePath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to delete PDF: ${errorMessage}`);
    }
  }

  /**
   * Sanitiza el key para evitar caracteres problemáticos en nombres de archivo
   */
  private sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9_-]/g, '-').substring(0, 255);
  }

  private resolveStoragePath(storageUrl: string): string {
    const normalized = storageUrl.trim();

    // Solo se aceptan identificadores de archivo sin rutas para prevenir traversal.
    if (normalized.includes('/') || normalized.includes('\\')) {
      throw new Error('Invalid storage URL: path traversal detected');
    }

    const fileName = path.basename(normalized);
    const normalizedBasePath = path.normalize(this.basePath);
    const normalizedFilePath = path.normalize(path.join(normalizedBasePath, fileName));

    if (!normalizedFilePath.startsWith(normalizedBasePath)) {
      throw new Error('Invalid storage URL: path traversal detected');
    }

    return normalizedFilePath;
  }
}
