"use client";

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
   PanelRightOpen,
  Plus,
  Redo2,
  Underline,
  Undo2,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadFont } from "@/components/template-builder/font-loader";
import type { SelectedObjectState } from "@/components/template-builder/types";

const FONT_FAMILIES = [
  "Roboto",
  "Times New Roman",
  "Montserrat",
  "Marcellus",
  "Open Sans",
  "Lato",
  "Playfair Display",
  "Dancing Script",
  "Georgia",
  "Arial",
];

interface EditorCanvasToolbarProps {
  textSelected: boolean;
  selectedObject: SelectedObjectState | null;
  currentFontSize: number;
  isSidebarVisible: boolean;
  isPropertiesVisible: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onToggleSidebar: () => void;
  onToggleProperties: () => void;
  onApplyTextStyle: (value: Record<string, unknown>) => void;
}

export function EditorCanvasToolbar({
  textSelected,
  selectedObject,
  currentFontSize,
  isSidebarVisible,
  isPropertiesVisible,
  onUndo,
  onRedo,
  onToggleSidebar,
  onToggleProperties,
  onApplyTextStyle,
}: EditorCanvasToolbarProps) {
  return (
 // Mantenemos el alto fijo en 300px para que nada lo mueva
    <div className="h-[300px] w-full border-b border-slate-200 bg-white overflow-hidden">
      
      {/* Usamos items-stretch para que los contenedores hijos puedan llenar el alto.
         p-0 para que los botones laterales lleguen hasta los bordes si es necesario.
      */}
      <div className="flex h-full items-stretch p-0">
        
        {/* LADO IZQUIERDO: Botón Sidebar - Ocupa todo el alto */}
        <div className="flex flex-row border-r border-slate-100 min-w-[80px]">
          <Button
            type="button"
            variant={isSidebarVisible ? "secondary" : "ghost"}
            // h-full para estirarse, rounded-none para estética de sidebar
            className="flex-1 flex-col gap-2 rounded-none border-b border-slate-100 h-full py-6"
            onClick={onToggleSidebar}
          >
            <PanelRightOpen className={`h-6 w-6 transition-transform duration-300 ${isSidebarVisible ? "" : "rotate-180"}`} />
            <span className="text-[10px] font-medium  tracking-wider">Sidebar</span>
          </Button>
          
          {/* Controles de Undo/Redo en la parte inferior del bloque izquierdo */}
          <div className="flex p-2 gap-1 justify-center bg-slate-50/50">
            <Button variant="ghost" size="icon-sm" onClick={onUndo} className="h-9 w-9">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onRedo} className="h-9 w-9">
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      <div className="flex min-w-0 flex-1 items-center justify-center px-2">
        {textSelected && selectedObject && (
          <div className="flex w-full items-center justify-center gap-2 overflow-x-auto py-1">
            <select
              className="h-10 min-w-48 rounded-xl border border-slate-300 bg-white px-3 text-sm"
              value={selectedObject.fontFamily ?? "Roboto"}
              onChange={(event) => {
                const family = event.target.value;
                loadFont(family).then(() =>
                  onApplyTextStyle({ fontFamily: family }),
                );
              }}
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>

            <select
              className="h-10 min-w-36 rounded-xl border border-slate-300 bg-white px-3 text-sm"
              value={
                selectedObject.fontWeight === "700" ||
                selectedObject.fontWeight === "bold"
                  ? "bold"
                  : "normal"
              }
              onChange={(event) =>
                onApplyTextStyle({
                  fontWeight: event.target.value === "bold" ? "700" : "normal",
                })
              }
            >
              <option value="normal">Regular</option>
              <option value="bold">Negrita</option>
            </select>

            <div className="flex items-center rounded-xl border border-slate-300">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  onApplyTextStyle({
                    fontSize: Math.max(8, currentFontSize - 1),
                  })
                }
              >
                <Minus className="h-4 w-4" />
              </Button>
              <input
                type="number"
                className="h-10 w-14 border-x border-slate-300 bg-transparent text-center text-sm outline-none"
                value={Math.round(currentFontSize)}
                min={8}
                max={160}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value)) {
                    onApplyTextStyle({ fontSize: value });
                  }
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  onApplyTextStyle({ fontSize: currentFontSize + 1 })
                }
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <input
              type="color"
              className="h-10 w-10 cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
              value={
                typeof selectedObject.fill === "string"
                  ? selectedObject.fill
                  : "#0f172a"
              }
              onChange={(event) =>
                onApplyTextStyle({ fill: event.target.value })
              }
              title="Color de texto"
            />

            <div className="h-6 w-px bg-slate-300" />

            <Button
              type="button"
              variant={
                selectedObject.fontWeight === "700" ||
                selectedObject.fontWeight === "bold"
                  ? "secondary"
                  : "ghost"
              }
              size="icon-sm"
              onClick={() =>
                onApplyTextStyle({
                  fontWeight:
                    selectedObject.fontWeight === "700" ||
                    selectedObject.fontWeight === "bold"
                      ? "normal"
                      : "700",
                })
              }
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={
                selectedObject.fontStyle === "italic" ? "secondary" : "ghost"
              }
              size="icon-sm"
              onClick={() =>
                onApplyTextStyle({
                  fontStyle:
                    selectedObject.fontStyle === "italic" ? "normal" : "italic",
                })
              }
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={selectedObject.underline ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() =>
                onApplyTextStyle({ underline: !selectedObject.underline })
              }
            >
              <Underline className="h-4 w-4" />
            </Button>

            <div className="h-6 w-px bg-slate-300" />

            <Button
              type="button"
              variant={
                selectedObject.textAlign === "left" ? "secondary" : "ghost"
              }
              size="icon-sm"
              onClick={() => onApplyTextStyle({ textAlign: "left" })}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={
                selectedObject.textAlign === "center" ? "secondary" : "ghost"
              }
              size="icon-sm"
              onClick={() => onApplyTextStyle({ textAlign: "center" })}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={
                selectedObject.textAlign === "right" ? "secondary" : "ghost"
              }
              size="icon-sm"
              onClick={() => onApplyTextStyle({ textAlign: "right" })}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={
                selectedObject.textAlign === "justify" ? "secondary" : "ghost"
              }
              size="icon-sm"
              onClick={() => onApplyTextStyle({ textAlign: "justify" })}
            >
              <AlignJustify className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
     {/* LADO DERECHO: Botón Props - Ocupa todo el alto */}
        <div className="flex flex-col border-l border-slate-100 min-w-[80px]">
          <Button
            type="button"
            variant={isPropertiesVisible ? "secondary" : "ghost"}
            // h-full y flex-col para que el icono y el texto se apilen verticalmente
            className="h-full flex-col gap-2 rounded-none py-6"
            onClick={onToggleProperties}
          >
            <PanelRightOpen size={10} className={` transition-transform duration-300 ${isPropertiesVisible ? "rotate-180" : ""}`} />
            <span className="text-[10px] font-medium  tracking-wider">Propiedades</span>
          </Button>
        </div>
    </div>
    </div>
    
  );
}
