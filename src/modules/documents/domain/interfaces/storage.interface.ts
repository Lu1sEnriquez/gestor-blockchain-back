/**
 * Interfaz para abstracción de almacenamiento de PDFs
 * Soporta múltiples backends: local, S3, Azure Blob, etc.
 */
export interface StorageAdapter {
  /**
   * Guarda un PDF en el almacenamiento
   * @param key Identificador único del documento (ej: folio UUID o hash)
   * @param buffer Contenido binario del PDF
   * @param metadata Metadatos opcionales (tipo, tamaño, etc)
   * @returns URL o referencia para acceso posterior
   */
  save(key: string, buffer: Buffer, metadata?: Record<string, unknown>): Promise<string>;

  /**
   * Recupera un PDF del almacenamiento
   * @param storageUrl URL o referencia retornada por save()
   * @returns Buffer con contenido del PDF
   */
  retrieve(storageUrl: string): Promise<Buffer>;

  /**
   * Verifica si un documento existe en el almacenamiento
   * @param storageUrl URL o referencia del documento
   * @returns true si existe, false en caso contrario
   */
  exists(storageUrl: string): Promise<boolean>;

  /**
   * Elimina un documento del almacenamiento (para cleanup)
   * @param storageUrl URL o referencia del documento
   */
  delete(storageUrl: string): Promise<void>;
}

/**
 * DTO para solicitar recuperación de documento
 */
export interface RecoverDocumentDTO {
  folioId: string;
  requesterUserId: string;
  reason?: string; // Motivo de la recuperación (auditoría)
}

/**
 * Resultado de recuperación de documento
 */
export interface RecoveryResult {
  folioId: string;
  institutionalFolio: string;
  enrollmentId: string;
  originalDataHash: string;
  rawPayloadData: Record<string, unknown>;
  pdfBuffer: Buffer;
  recoveredAt: Date;
  recoveryReason?: string;
}
