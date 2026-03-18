import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LocalStorageAdapter } from '@/src/modules/documents/infrastructure/adapters/local-storage.adapter';

describe('LocalStorageAdapter - Unit Tests', () => {
  let adapter: LocalStorageAdapter;
  let tempDir: string;

  beforeEach(async () => {
    // Crear directorio temporal para pruebas
    tempDir = path.join(os.tmpdir(), `test-storage-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    adapter = new LocalStorageAdapter(tempDir);
  });

  afterEach(async () => {
    // Limpiar directorio temporal
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignorar errores de limpieza
    }
  });

  describe('save', () => {
    it('should save a PDF buffer to disk', async () => {
      const key = 'test-folio-123';
      const buffer = Buffer.from('fake pdf content');

      const storageUrl = await adapter.save(key, buffer);

      expect(storageUrl).toContain('test-folio-123.pdf');

      // Verificar que el archivo fue creado
      const fileExists = await adapter.exists(storageUrl);
      expect(fileExists).toBe(true);
    });

    it('should sanitize unsafe characters in key', async () => {
      const key = 'folio/../../evil.pdf';
      const buffer = Buffer.from('content');

      const storageUrl = await adapter.save(key, buffer);

      // El key debe ser sanitizado
      expect(storageUrl).not.toContain('..');
      expect(storageUrl).not.toContain('/');

      const fileExists = await adapter.exists(storageUrl);
      expect(fileExists).toBe(true);
    });

    it('should create directory if it does not exist', async () => {
      const nonExistentDir = path.join(os.tmpdir(), `new-storage-${Date.now()}`);
      const newAdapter = new LocalStorageAdapter(nonExistentDir);

      const key = 'test-file';
      const buffer = Buffer.from('content');

      const storageUrl = await newAdapter.save(key, buffer);

      const fileExists = await newAdapter.exists(storageUrl);
      expect(fileExists).toBe(true);

      // Limpiar
      await fs.rm(nonExistentDir, { recursive: true, force: true });
    });
  });

  describe('retrieve', () => {
    it('should retrieve saved PDF content', async () => {
      const key = 'test-folio-456';
      const originalBuffer = Buffer.from('important pdf data');

      const storageUrl = await adapter.save(key, originalBuffer);
      const retrievedBuffer = await adapter.retrieve(storageUrl);

      expect(retrievedBuffer).toEqual(originalBuffer);
    });

    it('should throw error if file does not exist', async () => {
      const nonExistentUrl = path.join(tempDir, 'nonexistent.pdf');

      await expect(adapter.retrieve(nonExistentUrl)).rejects.toThrow(
        'Failed to retrieve PDF',
      );
    });

    it('should prevent path traversal attacks', async () => {
      const maliciousUrl = path.join(tempDir, '..', '..', 'etc', 'passwd');

      await expect(adapter.retrieve(maliciousUrl)).rejects.toThrow(
        'path traversal detected',
      );
    });
  });

  describe('exists', () => {
    it('should return true for saved file', async () => {
      const key = 'test-exists';
      const buffer = Buffer.from('content');

      const storageUrl = await adapter.save(key, buffer);
      const exists = await adapter.exists(storageUrl);

      expect(exists).toBe(true);
    });

    it('should return false for nonexistent file', async () => {
      const nonExistentUrl = path.join(tempDir, 'does-not-exist.pdf');
      const exists = await adapter.exists(nonExistentUrl);

      expect(exists).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete saved file', async () => {
      const key = 'test-delete';
      const buffer = Buffer.from('content');

      const storageUrl = await adapter.save(key, buffer);
      expect(await adapter.exists(storageUrl)).toBe(true);

      await adapter.delete(storageUrl);
      expect(await adapter.exists(storageUrl)).toBe(false);
    });

    it('should throw error if trying to delete outside basePath', async () => {
      const maliciousUrl = path.join(tempDir, '..', '..', 'etc', 'passwd');

      await expect(adapter.delete(maliciousUrl)).rejects.toThrow(
        'path traversal detected',
      );
    });
  });
});
