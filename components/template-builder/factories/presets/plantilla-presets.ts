import type { PresetFactory } from "@/components/template-builder/factories/preset-registry";

export const plantillaTitulo: PresetFactory = ({ Textbox, centered }) =>
  new Textbox("Titulo principal", {
    ...centered,
    width: 300,
    fontSize: 40,
    fontWeight: "bold",
    textAlign: "center",
    fill: "#0f172a",
    isDynamic: false,
    category: "plantilla",
    elementType: "text",
    fieldId: "titulo_principal",
  });

export const plantillaSubtitulo: PresetFactory = ({ Textbox, centered }) =>
  new Textbox("Anadir un subtitulo", {
    ...centered,
    width: 300,
    textAlign: "center",

    fontSize: 24,
    fill: "#1e293b",
    isDynamic: false,
    category: "plantilla",
    elementType: "text",
    fieldId: "subtitulo",
  });

export const plantillaParrafo: PresetFactory = ({ Textbox, centered }) =>
  new Textbox("Anadir texto normal", {
    ...centered,
    width: 300,
    textAlign: "center",
    fontSize: 16,
    fill: "#334155",
    isDynamic: false,
    category: "plantilla",
    elementType: "text",
    fieldId: "texto_normal",
  });

export const plantillaTexto: PresetFactory = ({ Textbox, centered }) =>
  new Textbox("Texto fijo de plantilla", {
    ...centered,
    width: 300,
    textAlign: "center",

    fontSize: 22,
    fill: "#0f172a",
    isDynamic: false,
    category: "plantilla",
    elementType: "text",
    fieldId: "texto_plantilla",
    placeholder: "{{texto_plantilla}}",
  });

export const plantillaForma: PresetFactory = ({ Rect, centered }) =>
  new Rect({
    ...centered,
    width: 300,
    textAlign: "center",
    height: 84,
    rx: 12,
    ry: 12,
    fill: "#e2e8f0",
    stroke: "#94a3b8",
    strokeWidth: 1,
    isDynamic: false,
    category: "plantilla",
    elementType: "shape",
    fieldId: "forma_plantilla",
  });
