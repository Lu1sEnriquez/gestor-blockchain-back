import type { InsertionPreset } from '@/components/template-builder/types';

/**
 * Fabric class constructors resolved at runtime via getFabricExport.
 */
type FabricTextbox = new (
  text: string,
  options: Record<string, unknown>,
) => Record<string, unknown>;

type FabricRect = new (
  options: Record<string, unknown>,
) => Record<string, unknown>;

type FabricGroup = new (
  objects: Array<Record<string, unknown>>,
  options: Record<string, unknown>,
) => Record<string, unknown>;

type FabricLine = new (
  points: number[],
  options: Record<string, unknown>,
) => Record<string, unknown>;

export interface PresetFactoryContext {
  Textbox: FabricTextbox;
  Rect: FabricRect;
  Group: FabricGroup;
  Line: FabricLine;
  centered: Record<string, unknown>;
}

export type PresetFactory = (ctx: PresetFactoryContext) => Record<string, unknown>;

// ── Registry (Open/Closed) ──

const registry = new Map<InsertionPreset, PresetFactory>();

export function registerPreset(preset: InsertionPreset, factory: PresetFactory): void {
  registry.set(preset, factory);
}

export function getPresetFactory(preset: InsertionPreset): PresetFactory | undefined {
  return registry.get(preset);
}

// ── Auto-register all built-in presets ──

import {
  plantillaTitulo,
  plantillaSubtitulo,
  plantillaParrafo,
  plantillaTexto,
  plantillaForma,
} from '@/components/template-builder/factories/presets/plantilla-presets';
import {
  eventoTexto,
  eventoFirma,
} from '@/components/template-builder/factories/presets/evento-presets';
import {
  titularTexto,
  titularImagen,
} from '@/components/template-builder/factories/presets/titular-presets';
import {
  sistemaQr,
  sistemaFolio,
} from '@/components/template-builder/factories/presets/sistema-presets';

registerPreset('plantilla-titulo', plantillaTitulo);
registerPreset('plantilla-subtitulo', plantillaSubtitulo);
registerPreset('plantilla-parrafo', plantillaParrafo);
registerPreset('plantilla-texto', plantillaTexto);
registerPreset('plantilla-forma', plantillaForma);
registerPreset('evento-texto', eventoTexto);
registerPreset('evento-firma', eventoFirma);
registerPreset('titular-texto', titularTexto);
registerPreset('titular-imagen', titularImagen);
registerPreset('sistema-qr', sistemaQr);
registerPreset('sistema-folio', sistemaFolio);
