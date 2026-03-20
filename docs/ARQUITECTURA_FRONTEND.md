### **Visión General y Stack Tecnológico**

* **Motor de Atributos (Diccionario Dinámico)**  
* **Motor del Lienzo y Workspace (Canvas Engine)**  
* **Inspector de Propiedades Reactivo (Sidebar Derecho)**  
* **Drag & Drop y Persistencia de Estado (Save & Load)**  
* **Orquestación de Eventos (Setup Global)**  
* **Staging Area y Conciliación Masiva (Excel/ZIP)**  
* **Motor de Previsualización (Pre-flight Proofing)**  
* **Compilación a 300 DPI y Renderizado**  
* **Modo Híbrido Web3 (Feature Flag)**  
* **Consenso de Firmas (Bóveda Digital)**  
* **Almacenamiento Local (Local File System Proxy)**  
* **Modelos de Datos (Interfaces TypeScript) y Contrato de API**

### 

### **🧠 ESPECIFICACIÓN DEL MOTOR DE ATRIBUTOS (DICCIONARIO DINÁMICO)**

El Editor debe tener un panel lateral llamado **"Atributos"** con un botón principal: `[ + Crear nuevo atributo ]`. Dependiendo de la familia que se elija, el comportamiento en el lienzo y en el motor de renderizado cambia drásticamente.

#### **1\. CATEGORÍA: SISTEMA (Generados por el Servidor)**

* **Naturaleza:** **FIJOS Y NO EDITABLES.** El usuario no puede crear nuevos atributos de sistema, solo usar los que tú como programador dejas disponibles.  
* **Comportamiento en Editor:** El usuario los arrastra al lienzo. Puede cambiarles el color, tamaño y fuente, pero el texto dirá algo como `{{sistema.folio}}` y estará bloqueado para edición manual.  
* **Catálogo Estricto:**  
  * **UUID / Folio Institucional:** El identificador único alfanumérico.  
  * **Código QR (Web3):** Un *placeholder* cuadrado (imagen dinámica) que el backend reemplazará con el QR de validación hacia la blockchain.  
  * **Fecha Corta:** Ej. `19/03/2026`. Generada en el milisegundo en que se crea el PDF.  
  * **Fecha Larga:** Ej. `19 de Marzo de 2026`.  
  * **Fecha y Hora (Timestamp):** Ej. `19/03/2026 19:28:48`.

#### **2\. CATEGORÍA: EVENTO (Inyectados en el Paso 1 de Creación)**

* **Naturaleza:** **EXTENSIBLES (Textos/Imágenes) \+ FIJOS (Firmas).** \* **Comportamiento del Creador (Docente):** Cuando el maestro seleccione esta plantilla, le aparecerá un formulario pidiéndole llenar estos datos *una sola vez* para todo el lote.  
* **Atributos Extensibles (El Administrador puede crear los que quiera):**  
  * *Textos Dinámicos:* "Nombre del evento", "Horas de duración", "Texto de agradecimiento especial", "Sede".  
  * *Imágenes Dinámicas:* "Logo del Patrocinador Principal", "Logo de la Facultad".  
* **Atributo Especial Fijo: `FIRMANTES`**  
  * No es un texto libre. El administrador arrastra un "Bloque de Firma".  
  * En el editor se ve como una línea con un espacio arriba (para la imagen PNG) y un espacio abajo (para Nombre y Cargo).  
  * *Lógica:* Si la plantilla tiene 2 bloques de firma, al crear el evento el sistema exigirá seleccionar a 2 usuarios del sistema (Autoridades) para que den su consenso.

#### **3\. CATEGORÍA: TITULAR (Extraídos del Excel y ZIP)**

* **Naturaleza:** **100% EXTENSIBLES.** El Administrador inventa los campos según la necesidad del diploma.  
* **Comportamiento del Creador (Docente):** Estos son los campos que el sistema buscará mágicamente en el archivo `.xlsx` y en los `.zip` subidos.  
* **Atributos Extensibles (Ejemplos infinitos):**  
  * *Textos Dinámicos (Columnas de Excel):* "Nombre del Alumno", "Apellidos", "ID / Matrícula", "Promedio Final", "Mención Honorífica".  
  * *Imágenes Dinámicas (Archivos ZIP):* Aquí entra tu lógica de oro. El administrador puede crear una zona para `foto_perfil` y otra zona para `foto_proyecto`.  
* **La Lógica de Sincronización (Mapeo Multizona):**  
  * En el lienzo, "Foto de Perfil" y "Foto de Proyecto" son dos recuadros grises separados.  
  * Cuando el maestro sube los datos, el sistema le pedirá: *"Sube el Excel, luego sube el ZIP para las fotos de perfil, y luego el ZIP para las fotos de proyecto"*.  
  * El sistema usa el "ID / Matrícula" de la fila del Excel para buscar `[ID].jpg` dentro de *ambos* ZIPs y colocarlos en sus recuadros respectivos.

#### **4\. CATEGORÍA: PLANTILLA (El Cascarón Estático)**

* **Naturaleza:** Diseño puro. No son variables.  
* **Comportamiento:** Textos ("Otorga el presente reconocimiento a:"), líneas divisorias, y la imagen de fondo de la constancia. Todo esto se guarda en duro en el JSON y nunca cambia a menos que se edite la plantilla.

### **¿Cómo se debe programar la Interfaz de "Crear Atributo"?**

Cuando el usuario haga clic en `[ + Crear atributo personalizado ]`, el Modal será extremadamente sencillo y directo:

1. **Nombre del Atributo:** Un único campo de texto (Ej. "Foto de Proyecto" o "Promedio Final").  
   * *Regla de Negocio:* Este nombre será **exactamente** el que se muestre en el lienzo (ej. `{{titular.Foto de Proyecto}}`) y será **exactamente** el nombre de la columna que el sistema exigirá en el archivo Excel.  
2. **Categoría:** Selector Dropdown `[ Evento | Titular ]`. *(El sistema inyectará automáticamente el prefijo `evento.` o `titular.` visualmente para organizar, pero el usuario no tiene que teclearlo).*  
3. **Tipo de Dato:** Selector Dropdown `[ Texto | Imagen ]`.  
4. **Botón Guardar:** Al guardar, se inyecta en el menú lateral y está listo para usarse.

*(Por debajo, el programador simplemente usará ese texto exacto como la llave (`fieldId`) del JSON, permitiendo espacios sin problema).*

### **🎨 SECCIÓN 2: MOTOR DEL LIENZO Y ESPACIO DE TRABAJO (CANVAS ENGINE)**

Esta sección define el comportamiento interactivo del área central del "Template Builder". El lienzo no es solo una etiqueta `<canvas>` de HTML; es un entorno de diseño interactivo (`Workspace`) controlado por **Fabric.js** y sincronizado con **Zustand**.

#### **2.1 EL ENTORNO VISUAL Y NAVEGACIÓN (WORKSPACE)**

El usuario no dibuja sobre un espacio infinito, dibuja sobre una representación física de la constancia.

* **Contenedor Principal:** Un div de fondo gris tenue (`bg-slate-100`) que ocupa el centro de la pantalla. Debe tener `overflow: hidden` para controlar el paneo internamente.  
* **La Hoja de Trabajo (Artboard):** El lienzo de Fabric.js debe inicializarse simulando un formato físico (Ej. Carta o A4).  
  * Tendrá un fondo blanco inamovible (`backgroundColor: '#ffffff'`).  
  * Tendrá un efecto de sombra (`box-shadow`) para que parezca una hoja de papel flotando en el contenedor gris.  
* **Zoom y Paneado (Navegación Canvas):**  
  * **Paneado Libre:** Al mantener presionada la `Barra Espaciadora` y hacer clic sostenido (Drag), el cursor cambia a una "manita" (`cursor: grab`) y el usuario puede mover la vista de la hoja (`canvas.relativePan`).  
  * **Zoom Inteligente:** Al presionar `Ctrl + Scroll del ratón`, el lienzo ejecuta `canvas.zoomToPoint()`, acercándose exactamente hacia donde está apuntando el cursor del usuario (comportamiento idéntico a Figma/Canva). El zoom debe estar limitado entre un 10% (0.1) y un 500% (5.0).

#### **2.2 REGLAS ESTRICTAS DE RENDERIZADO POR TIPO**

Dependiendo de si el atributo arrastrado es Texto o Imagen, Fabric.js debe aplicar reglas físicas distintas para evitar que el diseño se rompa al momento de generar el PDF masivo.

**A. El Mandamiento del Texto (`fabric.Textbox`):**

* **Prohibición:** Queda estrictamente prohibido usar `fabric.IText` o `fabric.Text`.  
* **Obligación:** Todo texto (fijo o dinámico) se instanciará como un `fabric.Textbox`.  
* **¿Por qué? (Text Wrapping):** El `Textbox` permite definir un "ancho máximo" (Width). Si el usuario coloca un atributo `{{Nombre del Titular}}` y le da un ancho de 400px, cuando el backend inyecte un nombre de 50 caracteres (ej. "Francisco Javier de la Cruz y los Santos"), el texto hará un salto de línea automático hacia abajo, sin salirse de los márgenes de la hoja.

**B. Contenedores de Imagen Dinámica (Bounding Boxes):**

* Cuando el usuario arrastra un atributo de imagen (Ej. `Foto de Proyecto`), **no** se renderiza una foto.  
* Se instancia un `fabric.Rect` (Rectángulo) con las siguientes propiedades forzadas:  
  * Fondo gris semitransparente (`fill: 'rgba(200, 200, 200, 0.5)'`).  
  * Borde punteado profesional (`strokeDashArray: [5, 5]`, `stroke: '#64748b'`).  
  * Un texto no seleccionable en el centro que indique el nombre del atributo (Ej. "Foto de Proyecto").  
  * Bloqueo de proporción (`lockUniScaling: true`) si se requiere mantener aspecto cuadrado o rectangular.

#### **2.3 INTERCEPCIÓN DEL PORTAPAPELES (CLIPBOARD API)**

Para mantener la tabla `Plantilla_Documental` ligera y evitar que el JSON colapse por guardar imágenes en formato Base64.

* **Evento Paste (`Ctrl + V`):** El componente escuchará `window.addEventListener('paste', handlePaste)`.  
* **Flujo Seguro:**  
  1. Si el usuario pega texto, se crea un `fabric.Textbox` normal.  
  2. Si el usuario pega una imagen de su computadora, el sistema **bloquea el pegado nativo**.  
  3. Toma el archivo (`File`), ejecuta una subida asíncrona simulada (`mockUploadImage`) que devuelve una `URL.createObjectURL()`.  
  4. Se instancia `fabric.Image.fromURL` con esa URL generada.  
  5. Se le inyecta la metadata: `{ category: 'plantilla', type: 'image', isDynamic: false }`.

#### **2.4 SISTEMA DE GUÍAS MAGNÉTICAS (SMART SNAPPING)**

Para garantizar diseños simétricos sin esfuerzo.

* Al arrastrar (`moving`) o redimensionar (`scaling`) un objeto, el sistema calculará las coordenadas (Top, Center, Bottom, Left, Right) del objeto activo contra el centro del lienzo y contra los demás objetos.  
* Si la distancia es menor a `5px` (Snap Threshold), el objeto "saltará" magnéticamente a esa posición exacta.  
* Al hacer el snap, se dibujará dinámicamente una línea guía de color cian (`#06b6d4`) en el lienzo, la cual desaparecerá al soltar el ratón (`mouse:up`).

#### **2.5 HISTORIAL DE ESTADO (UNDO / REDO) MODO SEGURO**

Dado que React y Fabric.js manejan el estado de forma distinta (DOM vs Canvas), el historial debe estar centralizado.

* **Trigger de Guardado:** Cualquier evento `object:modified`, `object:added` u `object:removed` de Fabric detonará un guardado del estado actual del JSON en la pila `past` de Zustand.  
* **Bloqueo de Ciclos Infinitos:** Cuando el usuario presione `Ctrl + Z` (Undo), el sistema cargará el JSON anterior usando `canvas.loadFromJSON()`. Durante esta recarga, se debe apagar temporalmente el *Trigger de Guardado* para evitar que el acto de "deshacer" se guarde como un nuevo cambio.

#### **2.6 ATAJOS DE TECLADO GLOBALES (SHORTCUTS)**

El editor debe sentirse como una aplicación nativa. Un *Custom Hook* (`useCanvasShortcuts`) escuchará:

* `Supr` / `Backspace`: Elimina los objetos actualmente activos (`canvas.getActiveObjects()`).  
* `Ctrl + C`: Clona la selección en una variable de memoria local del navegador, copiando profundamente (Deep Copy) las propiedades `fieldId`, `category` y `isDynamic`.  
* `Ctrl + V`: Pega la memoria actual en el lienzo, desplazada por `+15px` en X y Y para no sobreponerse exactamente al original.

### **SECCIÓN 3: INSPECTOR DE PROPIEDADES REACTIVO (RIGHT SIDEBAR)**

El Inspector de Propiedades es el panel de control lateral derecho. Su arquitectura debe ser **100% reactiva y guiada por el contexto (Context-Aware)**. No debe mostrar herramientas de texto si el usuario selecciona una imagen.

La sincronización entre el `activeObject` de Fabric.js y el estado de React es el desafío técnico principal de este módulo.

#### **3.1 ARQUITECTURA DE SINCRONIZACIÓN (REACT VS FABRIC)**

Para evitar bucles infinitos de renderizado entre el Canvas y React, se establece el siguiente flujo de datos unidireccional utilizando Zustand:

1. **Escucha de Selección:** El componente del Lienzo suscribe eventos nativos de Fabric (`selection:created`, `selection:updated`, `selection:cleared`).  
2. **Mutación del Estado:** Cuando se dispara un evento, se actualiza la variable `useEditorStore.activeObject` con la referencia al objeto actual (o `null` si se limpió la selección).

**Actualización Inversa:** Cuando el usuario cambia un valor en un `<input>` del panel derecho, React ejecuta un método `updateActiveObject(key, value)`. Este método hace:  
JavaScript  
activeObject.set(key, value);

canvas.renderAll(); // Fuerza a Fabric a repintar

saveHistorySnapshot(); // Guarda en el Undo/Redo

3. 

#### **3.2 ESTADO CERO: CONFIGURACIÓN DE LA HOJA (CANVAS ROOT)**

Si `activeObject` es `null` (el usuario hizo clic en el fondo gris), el Inspector mostrará las propiedades globales del documento físico.

* **Formato de Hoja:** Dropdown para seleccionar tamaños estándar (A4, Carta, Oficio). Al cambiar, muta el `width` y `height` del lienzo principal.  
* **Orientación:** Botones Toggle \[ Vertical | Horizontal \]. Si el usuario cambia de Vertical a Horizontal, el sistema invierte los valores de ancho y alto de la hoja instantáneamente.  
* **Fondo Global (Background):** Selector de color sólido o botón para cargar una "Imagen de Fondo" (`canvas.setBackgroundImage`).

#### **3.3 CONTROLES GEOMÉTRICOS Y CAPAS (UNIVERSALES)**

Si hay un objeto seleccionado (sea de la familia Plantilla, Evento, Titular o Sistema), esta sección siempre debe estar visible.

* **Coordenadas y Dimensiones:**  
  * Inputs `X` (`left`) y `Y` (`top`) para precisión milimétrica.  
  * Inputs `W` (Ancho) y `H` (Alto).  
  * *Regla Matemática:* Fabric.js maneja el escalado (`scaleX`, `scaleY`) en lugar de mutar el ancho/alto base. El input de la UI debe mostrar el tamaño real: `Math.round(activeObject.width * activeObject.scaleX)`. Al modificar el input de la UI, el sistema debe recalcular y aplicar el nuevo `scaleX / scaleY` o forzar el `width/height` si es un `Textbox`.  
* **Motor de Capas (Z-Index):**  
  * Panel de 4 botones iconográficos: "Traer al frente" (`canvas.bringToFront`), "Adelante" (`canvas.bringForward`), "Atrás" (`canvas.sendBackwards`), "Enviar al fondo" (`canvas.sendToBack`).  
* **Bloqueo (Locking):** Botón de candado que activa `lockMovementX`, `lockMovementY`, `lockScalingX` y `lockScalingY` para evitar ediciones accidentales del cascarón.

#### **3.4 INSPECTOR DE TIPOGRAFÍA (SOLO PARA `fabric.Textbox`)**

Si el objeto seleccionado es de tipo `text` o `Textbox`, se despliega este motor de edición avanzado.

* **Motor de Fuentes (Google Fonts):** Un `<select>` que lista fuentes institucionales (Ej. Roboto, Times New Roman, Montserrat, Marcellus). *Arquitectura:* Al cambiar de fuente, el sistema debe invocar la API de FontFaceObserver o usar WebFontLoader para asegurar que la fuente esté descargada en el navegador ANTES de ejecutar `canvas.renderAll()`, evitando el parpadeo de fuentes (FOUT).  
* **Color de Relleno (`fill`):** Un input `type="color"` o un componente Picker hexadecimal (ej. react-color) que aplique directamente al texto.  
* **Alineación Flex (`textAlign`):** Grupo de botones (Izquierda, Centro, Derecha, Justificado). Especialmente crítico para diplomas institucionales donde los párrafos legales deben ir justificados.  
* **Estilos Atómicos:** Botones independientes que mutan `fontWeight` (normal/bold), `fontStyle` (normal/italic) y `underline` (booleano).

#### **3.5 INSPECTOR DE CONTENEDORES E IMÁGENES (`fabric.Image` / `fabric.Rect`)**

Si el objeto es un Bounding Box (contenedor de imágenes dinámicas como la "Foto del Titular") o una forma estática.

* **Bordes Inteligentes (`stroke`):** Inputs para cambiar el color del borde y el grosor (`strokeWidth`).  
* **Línea Punteada (`strokeDashArray`):** Un switch booleano. Si está activo, inyecta el arreglo `[5, 5]` para crear un borde punteado (estándar para placeholders de variables en Certifier).  
* **Opacidad:** Slider numérico del 0 al 100% que muta la propiedad `opacity` del 0.0 al 1.0 en Fabric.

#### **3.6 SECCIÓN DE METADATOS Y DEBUG (EL CORAZÓN WEB3)**

Esta sección es exclusiva para tu arquitectura y es lo que te diferencia de Canva. Es una tarjeta visual al final del panel derecho que sirve como "Verificador de Mapeo".

* **Categoría y Tipo:** Muestra *Badges* (etiquetas no editables) leyendo las propiedades custom del objeto. (Ej. Badge Verde: `Titular`, Badge Azul: `Imagen`).  
* **Field ID (Input de Mapeo):** Un input de texto que lee la propiedad `fieldId`.  
  * *Regla de Negocio:* Si la categoría es `plantilla`, este input se oculta (los elementos fijos no se mapean). Si es `titular` o `evento`, muestra la llave (Ej. `foto_proyecto`). El Administrador puede corregir la llave directamente desde aquí si cometió un error tipográfico al crear el atributo.

### **SECCIÓN 4: DRAG & DROP Y CICLO DE VIDA DEL ESTADO (SAVE & LOAD)**

Esta sección define el "pegamento" entre la interfaz de React (Sidebar) y el motor de Fabric.js (Canvas), así como el flujo bidireccional de datos hacia la base de datos PostgreSQL. El objetivo es garantizar una persistencia absoluta: lo que el usuario diseña es exactamente lo que se recupera de la base de datos meses después.

#### **4.1 MOTOR DE INYECCIÓN Y DRAG & DROP (HTML5 a FABRIC)**

Para que los botones de la barra lateral izquierda (Atributos, Textos, Formas) aparezcan en el lienzo, se utilizará la API nativa de Drag & Drop de HTML5, vinculada a los eventos de Fabric.js.

* **Fase 1: Drag Start (En el Sidebar de React):**  
  * Cada botón arrastrable debe tener `draggable={true}`.  
  * Al iniciar el arrastre (`onDragStart`), el componente inyecta un *Payload JSON* en el `dataTransfer` del evento.  
  * *Ejemplo de Payload:* `{"type": "Textbox", "category": "titular", "fieldId": "nombre_completo", "text": "{{nombre_completo}}"}`.  
* **Fase 2: Drop (En el Canvas de Fabric):**  
  * El lienzo debe estar suscrito al evento nativo `drop`.  
  * Al soltar, el sistema lee el *Payload* del `dataTransfer`.  
  * **Cálculo de Coordenadas Crítico:** El sistema debe calcular la posición exacta donde se soltó el cursor relativo al canvas, considerando el nivel de Zoom y el Paneado actual.  
  * Se utiliza: `const pointer = canvas.restorePointerVpt(e);` para instanciar el nuevo objeto (sea `fabric.Textbox` o `fabric.Rect`) exactamente en las coordenadas `pointer.x` y `pointer.y`.

#### **4.2 SERIALIZACIÓN PROFUNDA (EXPORTACIÓN A JSON)**

Cuando el usuario presiona "Guardar Cambios" (como se ve en la UI superior derecha), el estado visual debe convertirse en datos puros.

* **El Problema Nativo:** Por defecto, `canvas.toJSON()` de Fabric.js solo guarda propiedades visuales (color, tamaño, coordenadas). Ignora por completo si un texto es de la "Familia Titular" o si un cuadro es un "Código QR".  
* **La Solución Arquitectónica (Inyección de Custom Properties):**  
  * Se debe invocar la serialización enviando un arreglo estricto con nuestro Diccionario de Datos:

JavaScript  
const propiedadesExtendidas \= \['id', 'isDynamic', 'category', 'type', 'fieldId', 'placeholder', 'name'\];

const esquemaFabricJSON \= canvas.toJSON(propiedadesExtendidas);

*   
  * Este JSON resultante es el que se envía mediante la API (Ej. `PUT /api/templates/:id`) para guardarse en el campo `Esquema_Fabric_JSON` de la tabla `Plantilla_Documental`.

#### **4.3 HIDRATACIÓN Y RECONSTRUCCIÓN (CARGA EXACTA)**

Este es el proceso más delicado. Cuando el usuario hace clic en "Editar Plantilla" desde el Dashboard, el editor debe abrirse luciendo idéntico a la última sesión.

* **Paso 1: Fetching del JSON.** El frontend obtiene el `Esquema_Fabric_JSON` desde PostgreSQL.  
* **Paso 2: Pre-carga de Tipografías (CRÍTICO).** \* *Riesgo:* Si Fabric.js pinta el lienzo antes de que el navegador descargue las fuentes personalizadas (Ej. *Dancing Script* o *Marcellus*), las cajas de texto (`fabric.Textbox`) calcularán mal su ancho y el texto se verá cortado o desalineado.  
  * *Solución:* Antes de cargar el JSON, el sistema debe leer qué familias tipográficas se usan en el JSON y usar la API `document.fonts.load()` o la librería `webfontloader` para forzar su descarga en el navegador.  
* **Paso 3: Carga en Fabric (`canvas.loadFromJSON`).**  
  * Una vez cargadas las fuentes y las imágenes externas (logos), se invoca:

JavaScript  
canvas.loadFromJSON(esquemaFabricJSON, () \=\> {

    canvas.renderAll();

    // Restablecer el historial de Undo/Redo a cero después de cargar

    useEditorStore.getState().clearHistory(); 

});

*   
* **Paso 4: Verificación de Metadatos.** Tras la carga, todos los objetos recuperan mágicamente su `category` y `fieldId`. Si el usuario hace clic en el nombre del alumno cargado, el Panel Derecho (Inspector) reconocerá inmediatamente que es un atributo de tipo `Titular` y mostrará los controles correctos.

#### **4.4 FLUJO DE GUARDADO Y EXPERIENCIA DE USUARIO (UX)**

* **Estado de "Cambios sin guardar":**  
  * En el store de Zustand existirá una bandera booleana `hasUnsavedChanges`.  
  * Se volverá `true` con cualquier evento `object:modified`, `object:added` o `object:removed` en el lienzo.  
  * El botón superior derecho "Guardar cambios" se iluminará (Ej. azul primario) solo cuando esta bandera sea `true`.  
* **Prevención de Pérdida de Datos:**  
  * Si el usuario intenta salir de la página (Ej. presionando el botón de retroceso del navegador o haciendo clic en el logo del ITSON) mientras `hasUnsavedChanges` es `true`, el navegador lanzará un *Warning* nativo (`window.onbeforeunload`) advirtiendo que los cambios se perderán.

### **SECCIÓN 5: ORQUESTACIÓN DE EVENTOS Y CONTEXTO GLOBAL (SETUP)**

Esta sección define la primera etapa del ciclo de vida de emisión. El usuario operativo (Creador) selecciona una plantilla preexistente y el sistema lee el JSON de Fabric.js para generar dinámicamente un formulario que solicita **exclusivamente** los datos de la familia `EVENTO`.

#### **5.1 LECTURA DE PLANTILLA Y GENERACIÓN DE FORMULARIO DINÁMICO**

El sistema no tiene formularios fijos. El Frontend escanea el `Esquema_Fabric_JSON` y renderiza los inputs correspondientes a las variables que la plantilla exige.

* **Escaneo de Textos:** Por cada objeto con `{ category: 'evento', type: 'text' }` (Ej. `fieldId: 'nombre_congreso'`), se renderiza un `<input type="text">` o un `<textarea>` en la UI.  
* **Escaneo de Imágenes:** Por cada objeto con `{ category: 'evento', type: 'image' }` (Ej. `fieldId: 'logo_patrocinador'`), se renderiza un componente `Dropzone` para que el creador suba esa imagen específica.  
* **Escaneo de Firmantes:** Por cada objeto con `{ category: 'evento', type: 'signature_block' }`, se renderiza un `<select>` que lista a los usuarios de la base de datos con rol de "Autoridad/Firmante".

#### **5.2 INYECCIÓN Y GUARDADO DEL "PRE-MOLDE"**

* Una vez que el Creador llena este formulario, el Frontend no muta la plantilla original (para no dañarla).  
* Crea una "Copia de Instancia" vinculada a este nuevo Evento.  
* Reemplaza los placeholders de texto por los textos reales capturados.  
* Reemplaza las URL de las imágenes de evento por las recién subidas.  
* Este nuevo JSON pre-llenado se guarda en la tabla `Evento_Academico` bajo el campo `Contexto_Global_Inyectado`.

#### **5.3 ABSTRACCIÓN DEL FLUJO DE FIRMAS (FRONTEND VS BACKEND)**

* A nivel visual (Frontend), el bloque de firma sigue siendo un espacio en blanco (`Placeholder`).  
* El sistema guarda los IDs de los firmantes seleccionados y pasa el evento a estado `PENDIENTE`.  
* *Lógica de Resolución:* Una vez que los directivos autorizan en su bóveda, el Backend toma la URL del PNG transparente de sus firmas, busca las coordenadas (`left`, `top`) de los `signature_blocks` en el JSON del evento, e inserta las imágenes tal cual como si fueran imágenes regulares, listas para el renderizado final del PDF.

### 

### **SECCIÓN 6: STAGING AREA Y CONCILIACIÓN MASIVA (DATA BINDING)**

Una vez que el Evento tiene su Contexto Global definido y las firmas aprobadas (o en proceso paralelo), el Creador debe alimentar el sistema con la población estudiantil. Esta interfaz es el **Staging Area** (Área de Preparación).

#### **6.1 ANÁLISIS DE REQUERIMIENTOS Y GENERACIÓN DE PLANTILLAS DE MUESTRA**

Para garantizar cero errores de compatibilidad, el sistema le dice al usuario exactamente qué formato de tabla necesita subir.

* **Algoritmo de Extracción:** El sistema escanea el JSON del Evento buscando todos los objetos con `{ category: 'titular', type: 'text' }` (Ej. `matricula`, `nombre_completo`, `promedio`).  
* **Botón "Descargar CSV/Excel de Ejemplo":** \* Al hacer clic, el Frontend (usando librerías como `xlsx` o `papaparse`) genera un archivo al vuelo.  
  * Los encabezados (Fila 1\) de este archivo serán exactamente los `fieldIds` detectados.  
  * *UX:* Esto elimina la fricción de "¿Cómo se llamaba la columna? ¿Era 'Nombre' o 'Nombre Completo'?". El sistema le da el archivo listo para llenar.

#### **6.2 MÓDULO DE INGESTA DE DATOS TABULARES (OPCIONES DE CARGA)**

La interfaz presentará un panel principal con tres vías de ingreso de datos para cubrir cualquier caso de uso administrativo:

1. **Botón "Subir Excel (.xlsx)" y Botón "Subir CSV":**  
   * Abre un explorador de archivos o permite Drag & Drop.  
   * El sistema lee el archivo, extrae el arreglo de JSONs (Filas) y ejecuta el algoritmo de "Auto-Mapping" (Sincronización Inteligente) verificando que las columnas coincidan con las variables de la plantilla.  
2. **Botón "Carga Manual (Añadir Registro)":**  
   * Útil para eventos muy pequeños (Ej. 3 diplomas) o para corregir a un alumno de última hora.  
   * Renderiza una tabla vacía en pantalla (Data Grid) donde el usuario teclea los datos directamente celda por celda.

#### **6.3 MÓDULO DE INGESTA MULTIMEDIA (MAPEO MULTIZONA DE ZIPS)**

Si la plantilla exige imágenes dinámicas por alumno (`{ category: 'titular', type: 'image' }`), se activa este módulo crítico.

* **Interfaz Dinámica:** Por cada `fieldId` de imagen (Ej. `foto_perfil`, `foto_proyecto`), el Frontend renderiza un componente `Dropzone` independiente.  
* **Regla de Sincronización Relacional:** El sistema instruye al usuario: *"Asegúrate de que las imágenes dentro del archivo .ZIP se llamen igual que la primera columna de tu Excel (Ej. Matrícula)"*.  
* **Procesamiento en Memoria:** Al subir el `.zip`, el Frontend (o un Web Worker usando `JSZip`) puede leer los nombres de los archivos en el ZIP y pre-validarlos contra la columna del Excel para alertar instantáneamente si falta la foto de algún alumno.

#### **6.4 EL DATA GRID INTERACTIVO (TABLA DE VALIDACIÓN)**

Una vez cargados los datos tabulares y los ZIPs (si aplica), el sistema despliega una tabla robusta (`shadcn/ui Table` o `MUI DataGrid`).

* **Columnas Mostradas:** Los atributos del titular (Matrícula, Nombre) \+ Miniaturas (Avatares) de las imágenes vinculadas desde el ZIP.  
* **Columna de Estado (Feedback Visual):**  
  * 🟢 **Válido:** Todos los campos requeridos existen y la foto se encontró en el ZIP.  
  * 🔴 **Error Crítico:** Falta un dato obligatorio (Ej. celda en blanco) o no se encontró `0000021394.jpg` en el ZIP de fotos de perfil.  
* **Edición Quirúrgica Inline:** Si una celda tiene un error ortográfico o falta una foto, el usuario puede hacer doble clic en la celda para corregir el texto, o hacer clic en la miniatura roja de la foto para subir la imagen de ese alumno individualmente, sin necesidad de corregir y volver a subir todo el archivo Excel o ZIP pesado.

#### **6.5 CONFIRMACIÓN Y PASE A GENERACIÓN**

* Solo cuando el 100% de las filas en el Data Grid estén en estado 🟢 **Válido**, se habilita el botón principal: `[ Confirmar Lote y Generar Documentos ]`.  
* Al presionar este botón, el Frontend empaqueta el arreglo final de datos conciliados (El Payload masivo) y lo envía al Backend para que comience la orquestación, asignación de Folios Institucionales, generación de PDFs físicos y cálculo de los Hashes para la blockchain de Polygon.

### **SECCIÓN 7: MOTOR DE PREVISUALIZACIÓN Y PRUEBAS (PRE-FLIGHT PROOFING)**

En la industria de la impresión masiva, nunca se procesa un lote completo sin antes generar una "Prueba de Galera" o *Proof*. El sistema debe proteger al usuario de sus propios errores de diseño o mapeo.

#### **7.1 GENERACIÓN DE MUESTRA (WATERMARKED PREVIEW)**

En el *Staging Area* (Data Grid), antes de habilitar el botón "Generar Documentos", debe existir una funcionalidad obligatoria de Previsualización.

* **Flujo UI:** El usuario selecciona la "Fila 1" de su tabla validada y hace clic en `[ Generar Previsualización ]`.  
* **Proceso Backend Efímero:** 1\. El Backend toma el JSON de la Plantilla, las imágenes inyectadas del Evento y los datos de la Fila 1 del Excel/ZIP. 2\. Genera un único archivo PDF en la memoria RAM del servidor. 3\. Le estampa una marca de agua diagonal en rojo claro que diga **"DOCUMENTO DE PRUEBA \- SIN VALIDEZ OFICIAL"**. 4\. No genera ningún Hash ni toca la Blockchain de Polygon.  
* **Despliegue:** El PDF se envía al Frontend y se muestra en un Modal grande (Visor de PDF nativo o `react-pdf`).

#### **7.2 VALIDACIÓN VISUAL DEL TEXT WRAPPING**

El usuario debe auditar visualmente la muestra para confirmar dos cosas críticas:

1. **Que el Justificado funcione:** Si el texto legal del evento era muy largo, debe verificar que el `fabric.Textbox` lo haya acomodado correctamente y no se superponga con las firmas.  
2. **Que el Recorte de Imagen (Crop) sea correcto:** Si la foto de perfil del alumno era muy alargada, debe validar que el Bounding Box la haya centrado y recortado bien sin deformar la cara del titular (`object-fit: cover` en el renderizado backend).

Solo si el usuario marca un *Checkbox* que diga `"He revisado la previsualización y confirmo que el diseño es correcto"`, se desbloqueará el botón de Generación Masiva.

### 

### **SECCIÓN 8: COMPILACIÓN DE ALTA FIDELIDAD Y RENDERIZADO (PRINT-READY PIPELINE)**

El JSON que genera Fabric.js usa coordenadas basadas en píxeles de pantalla (típicamente 96 DPI). Sin embargo, las constancias universitarias exigen calidad de impresión (300 DPI). Esta sección define cómo el motor traduce el JSON a un PDF de grado comercial.

#### **8.1 ESTRATEGIA DE RENDERIZADO EN EL SERVIDOR (HEADLESS CANVAS)**

Para garantizar que el PDF final sea 100% idéntico a lo que el usuario vio en su pantalla en el Editor, el Backend no debe intentar "adivinar" las coordenadas.

* **Tecnología Recomendada:** Usar una librería de Node.js como `fabric` (la versión de servidor respaldada por `node-canvas`) o utilizar un navegador Headless (Ej. `Puppeteer`) para renderizar el lienzo de forma invisible en el servidor.  
* **El Algoritmo de Compilación:**  
  1. El Backend levanta un Canvas virtual.  
  2. Inyecta el `Esquema_Fabric_JSON`.  
  3. Ejecuta una función de mapeo que recorre los objetos:  
     * Si `fieldId === 'nombre_completo'`, muta el texto del objeto por el nombre real de la fila 1\.  
     * Si `fieldId === 'foto_perfil'`, carga el PNG de la foto usando la ruta del S3/Local y usa el método `setSrc()` nativo de Fabric para reemplazar el recuadro punteado.  
     * Si `category === 'sistema' && type === 'qr'`, invoca a la librería `qrcode`, genera la imagen del código y la estampa en las coordenadas.

#### **8.2 ESCALAMIENTO A 300 DPI (MULTIPLIER)**

Para que las firmas, textos y logos no salgan borrosos, el Backend debe aplicar un multiplicador matemático al momento de exportar.

* **El Factor de Escala:** `300 DPI / 96 DPI = 3.125`.

En lugar de generar un PDF del tamaño de la pantalla, el Backend exporta el lienzo virtual multiplicando su resolución.  
JavaScript  
// Ejemplo conceptual en el Backend

const imagenAltaResolucion \= canvas.toDataURL({

  format: 'png',

  multiplier: 3.125 // \<- Este es el secreto de la alta definición

});

*   
* Finalmente, se inyecta esta imagen generada dentro de un contenedor PDF (usando `pdf-lib` o `pdfkit`) y se guarda físicamente en el sistema de archivos local (/storage).

#### **8.3 OPTIMIZACIÓN DE MEMORIA (GARBAGE COLLECTION)**

Al generar un lote de 500 constancias de alta resolución, la memoria RAM del servidor Node.js puede saturarse.

* **Regla de Arquitectura:** El proceso de generación debe usar *Streams* o ejecutar "Limpieza de Lienzo" (`canvas.clear()`) después de cada alumno procesado para liberar la memoria de las imágenes cargadas. Las imágenes compartidas (como la plantilla de fondo y el logo del evento) deben guardarse en caché (Memoria compartida) para no descargarlas 500 veces del sistema de archivos local (mediante la Proxy API).

### **SECCIÓN 9: MOTOR DE VERIFICACIÓN Y MODO HÍBRIDO (FEATURE FLAGS WEB3)**

Esta sección define la arquitectura del **Switch Híbrido (On-Chain vs Off-Chain)**. El sistema no debe estar atado obligatoriamente a la blockchain para funcionar; debe actuar como un Orquestador Documental Web2 tradicional por defecto, con la capacidad de "elevar" su seguridad a Web3 (Polygon) bajo demanda.

#### **9.1 CONFIGURACIÓN DEL EVENTO (EL FEATURE FLAG WEB3)**

Durante el "Paso 1: Setup Global" (cuando el Creador inicializa el Evento y selecciona la Plantilla), la interfaz debe presentar un componente tipo *Toggle Switch* (Interruptor).

* **UI/UX:** Un Switch etiquetado como \[ Notarizar en Blockchain (Red Polygon) \].  
  * *Off (Por Defecto):* El sistema emitirá los documentos localmente. Cero costo de transacción.  
  * *On:* El sistema advierte que el lote será anclado criptográficamente y requerirá consenso estricto.  
* **Persistencia:** Este valor booleano se guarda en la tabla Evento\_Academico en el campo Feature\_Flag\_Web3. Toda la lógica del backend dependerá exclusivamente de este campo.

#### **9.2 IMPACTO EN EL PIPELINE DE GENERACIÓN (BACKEND)**

Cuando el Creador presiona \[ Generar Documentos \] en el Staging Area, el flujo del Backend se bifurca leyendo el Feature\_Flag\_Web3 del evento:

**A. Flujo Off-Chain (Switch Apagado):**

1. Genera los PDFs físicos usando la plantilla de Fabric.js.  
2. Asigna los Folios Institucionales de manera secuencial.  
3. Genera un Código QR que apunta a: https://certificados.itson.mx/verify?folio=ITSON-2026-001.  
4. Guarda los PDFs en el directorio /storage/events/\[ID\]/outputs y guarda el registro en PostgreSQL. *(Fin del proceso).*

**B. Flujo On-Chain (Switch Encendido):**

1. Genera PDFs, Folios y URLs para el QR.  
2. **Data Hashing:** Extrae el Payload JSON puro (Datos del alumno \+ Contexto del evento).  
3. Pasa el Payload por un algoritmo criptográfico unidireccional ($SHA-256$).  
4. Construye un **Árbol de Merkle** con todos los hashes del lote de 500 alumnos.  
5. Emite una única transacción a la red pública de Polygon inyectando el *Merkle Root* en el Smart Contract.  
6. El QR generado cambia su estructura de seguridad apuntando a: https://certificados.itson.mx/verify?folio=ITSON-2026-001\&hash=0xabc123....

#### **9.3 ARQUITECTURA DEL PORTAL DE VALIDACIÓN (/verify Endpoint)**

El portal público de validación debe ser una página estática, rápida y universal. Su lógica interna actuará como un enrutador inteligente dependiendo de los parámetros que reciba en la URL al escanear el Código QR de la Familia SISTEMA.

**Fase 1: Búsqueda Local (Base de Datos)**

* El frontend extrae el folio de la URL y hace un GET /api/documents/verify/:folio.  
* El backend consulta la tabla Documento\_Folio.  
* Revisa el campo de control de seguridad principal: isValid. Si isValid \=== false (El documento fue revocado administrativamente), el sistema **aborta inmediatamente** y muestra una pantalla roja de ALERTA DE FRAUDE O REVOCACIÓN.

**Fase 2: Bifurcación de la Validación**

* **Si el evento NO es Web3 (Off-Chain):**  
  * El sistema simplemente corrobora que el folio exista, que isValid sea true, y despliega la pantalla de éxito con los datos del alumno y el botón para "Descargar PDF Original".  
* **Si el evento SÍ es Web3 (On-Chain):**  
  * El sistema detecta que la URL trae un parámetro \&hash=.  
  * **Paso A (Re-Hashing al vuelo):** El Backend toma el Payload guardado en su base de datos y lo vuelve a hashear ($SHA-256$) en ese instante exacto. Compara el hash resultante con el hash de la URL. *(Si alguien alteró la base de datos local, los hashes no coincidirán).*  
  * **Paso B (Validación RPC Polygon):** Si el hash local coincide, el Backend hace una llamada de lectura (Read-Only) al nodo de Polygon. Pregunta al Smart Contract: *"¿El hash 0xabc123 es válido dentro del Merkle Root del evento y NO ha sido revocado en la blockchain?"*.  
  * Solo si el Smart Contract devuelve true, se despliega la pantalla de éxito, añadiendo un *Badge* Dorado o Verde brillante que diga: **"Verificado Criptográficamente en Web3"** e incluyendo un enlace al explorador de bloques (Polygonscan) para la auditoría técnica.

#### **9.4 RECUPERACIÓN ANTE DESASTRES Y CAÍDA DE REDES (FALLBACKS)**

El sistema debe estar preparado para eventualidades de red:

* Si la red Polygon está congestionada o el nodo RPC (ej. Alchemy / Infura) no responde durante el escaneo del QR, el sistema no debe fallar con un error 500\.  
* Debe hacer un "Fallback" a validación Off-Chain, mostrando los datos correctos de la base de datos local, pero mostrando una advertencia amarilla (Warning): *"Validación institucional exitosa. La verificación en Blockchain está temporalmente fuera de servicio por congestión de red"*.

  ###  **SECCIÓN 10: BÓVEDA DIGITAL Y CONSENSO DE FIRMAS (APPROVAL WORKFLOW)**

Esta sección define el mecanismo de "Separación de Poderes". El Creador (Docente) diseña y carga la población de estudiantes, pero carece de los permisos para plasmar las firmas oficiales. El sistema requiere un flujo de autorización asíncrono y concurrente por parte de las Autoridades Académicas.

#### **10.1 LA BÓVEDA DIGITAL (ONBOARDING DE AUTORIDADES)**

Antes de que un usuario con el rol `Firmante` pueda participar en un consenso, debe inicializar su perfil de seguridad.

* **Carga de Activos:** La interfaz solicitará al directivo que suba una imagen de su firma autógrafa.  
* **Validación de Formato:** El Frontend debe aplicar reglas estrictas en el Dropzone: Solo se aceptan archivos `.png` con canal alfa (fondo transparente) para evitar que la firma tape el diseño del diploma o el texto subyacente.  
* **Almacenamiento Aislado:** La imagen se sube a un directorio privado en el sistema de archivos local (/storage/vault/signatures). La URL de esta imagen se guarda en la tabla `Boveda_Firma`. *Nadie, excepto el backend del sistema durante el proceso de compilación final, tiene acceso de lectura a esta URL.*

  #### **10.2 EL PANEL DE CONSENSO (BANDEJA DE ENTRADA DEL FIRMANTE)**

Cuando el Creador envía un Lote a firmas (y el Administrador autoriza la cantidad de folios institucionales), el evento pasa al radar de las autoridades asignadas.

* **Notificación:** El sistema inserta registros en la tabla pivote `Consenso_Firmantes` con el estado `Aprobado = null` (Pendiente).  
* **UI del Directivo:** Al iniciar sesión, el Firmante ve un *Dashboard* (tipo Bandeja de Entrada) con los eventos que requieren su atención.  
* **Auditoría Previa:** Al abrir una solicitud, el Firmante no ve el Excel crudo. El sistema le muestra la **Previsualización de Muestra** (Sección 7\) y un resumen numérico: *"Estás a punto de autorizar la emisión de 350 Constancias para el Congreso de Software"*.

  #### **10.3 FLUJO DE APROBACIÓN CONCURRENTE Y RECHAZOS**

El sistema soporta N cantidad de firmas (Ej. 3 directivos). No importa el orden en que firmen (Consenso en Paralelo).

* **El Rechazo (Veto):** Si el Firmante detecta un error (Ej. El logo del evento es incorrecto), presiona el botón `[ Rechazar ]`.  
  * El sistema despliega un Modal obligatorio exigiendo un `Motivo_Rechazo` (Texto).  
  * La tabla `Consenso_Firmantes` actualiza el registro a `false`.  
  * El evento entero aborta su misión, pasa a estado `RECHAZADO` y notifica al Creador para que corrija y vuelva a iniciar el proceso.  
* **La Aprobación (Firma Criptográfica):** Si todo es correcto, el Firmante presiona `[ Autorizar y Firmar ]`.  
  * El sistema puede solicitar re-autenticación (Ej. Contraseña, PIN o 2FA) para garantizar el No-Repudio.  
  * La tabla `Consenso_Firmantes` actualiza a `true` y guarda un `Timestamp` exacto del acto.

  #### **10.4 EL TRIGGER DE INYECCIÓN (DATA MERGING)**

El motor de compilación backend está programado para "escuchar" la tabla de consenso.

* Una vez que el 100% de los firmantes requeridos por la plantilla han dado su aprobación (`true`), el evento cambia automáticamente a estado `FIRMADO`.  
* **Mapeo Geométrico:** El Backend lee el `Esquema_Fabric_JSON`. Busca todos los objetos con `{ type: 'signature_block' }`.  
* **Inyección Transaccional:** El Backend cruza el `fieldId` del bloque de firma (Ej. `firma_1`) con el usuario asignado en el Setup del Evento. Va a la `Boveda_Firma` de ese usuario, extrae el PNG de su firma y lo inyecta en las coordenadas exactas de X y Y definidas en el diseño de Fabric.js.  
* El sistema procede a generar los PDFs masivos (Sección 8\) y notariar en Polygon (Sección 9).


  ### **11: ALMACENAMIENTO LOCAL (LFS \- Local File System)**

Se descarta el uso de proveedores externos de Object Storage (AWS S3 / MinIO) a favor de un sistema de archivos local administrado directamente por el servidor de la aplicación (Node.js / Next.js).

Para garantizar la escalabilidad, evitar colisiones de nombres y, sobre todo, **proteger activos sensibles (como las firmas criptográficas y los PDFs generados)**, el sistema no utilizará la carpeta estática `public/` de Next.js para el almacenamiento transaccional. En su lugar, se creará un directorio privado en la raíz del proyecto llamado `/storage`, el cual será servido a través de *Rutas de API Autenticadas*.

#### **A. ESTRUCTURA DE DIRECTORIOS (FILE SYSTEM TREE)**

El sistema creará las carpetas dinámicamente utilizando la librería nativa `fs` (File System) de Node.js, siguiendo esta jerarquía relacional estricta:

Plaintext

/tu-proyecto-nextjs

├── /src

├── /public            \<-- (Solo para CSS, fuentes e íconos estáticos del sistema)

└── /storage           \<-- (NÚCLEO DE ALMACENAMIENTO PRIVADO)

    │

    ├── /templates     \<-- (Activos de la Familia "Plantilla")

    │   ├── /tpl\_01km236...   \<-- (ID único de la Plantilla)

    │   │   ├── background.png

    │   │   └── fixed\_logo.png

    │   └── /tpl\_09fm442...

    │

    ├── /events        \<-- (Activos de la Familia "Evento" y "Titular")

    │   ├── /evt\_550e840...   \<-- (ID único del Evento)

    │   │   ├── /inputs       \<-- (Lo que sube el Docente)

    │   │   │   ├── logo\_patrocinador.png

    │   │   │   ├── poblacion\_alumnos.xlsx

    │   │   │   └── fotos\_perfil.zip  \<-- (Se elimina tras la generación)

    │   │   │

    │   │   └── /outputs      \<-- (Los PDFs finales generados por el servidor)

    │   │       ├── ITSON-2026-001.pdf

    │   │       └── ITSON-2026-002.pdf

    │

    └── /vault         \<-- (BÓVEDA DE ALTA SEGURIDAD)

        └── /signatures

            ├── usr\_admin123\_firma.png

            └── usr\_rector456\_firma.png

#### **B. JUSTIFICACIÓN DE LA ESTRUCTURA**

1. **Aislamiento por Entidad (`/templates` vs `/events`):**  
   * **Plantillas:** Se guardan por el `ID_Plantilla`. Si una plantilla usa un fondo azul, ese fondo se guarda aquí. Si el evento A y el evento B usan la misma plantilla, el sistema solo carga el fondo azul una vez desde aquí. Esto ahorra muchísimo espacio en el disco duro.  
   * **Eventos:** Se guardan por el `ID_Evento`. Aquí vive todo lo contextual. Al aislarlo por evento, si un coordinador sube un Excel o un logotipo que se llama "logo.png", jamás sobrescribirá el "logo.png" de otro evento que esté ocurriendo al mismo tiempo. Además, los PDFs generados se agrupan ordenadamente por lote.  
2. **La Bóveda Aislada (`/vault`):** Las firmas autógrafas NUNCA deben mezclarse con las carpetas de eventos o plantillas. Deben estar en una carpeta de máxima seguridad, ya que un mismo directivo (Rector) firmará cientos de eventos distintos con el mismo archivo `.png`.

   #### **C. SEGURIDAD Y DESPACHO DE ARCHIVOS (PROXY API ROUTE)**

Dado que la carpeta `/storage` estará fuera de `/public`, los archivos no tendrán una URL directa en internet (Ej. `http://localhost:3000/storage/vault/firma.png` dará error 404). Esta es una medida de seguridad intencional.

Para que el Editor de Fabric.js o el visor de PDFs puedan acceder a las imágenes, se desarrollará un Endpoint en Next.js (`GET /api/files`) que actuará como guardián:

* **Mecanismo de URL:** Los JSONs de Fabric guardarán rutas relativas o referenciales, por ejemplo: `/api/files?path=templates/tpl_01km236/background.png`.  
* **Reglas del Endpoint:**  
  1. Recibe la petición.  
  2. Verifica la sesión del usuario (Auth).  
  3. Verifica si el usuario tiene permisos para ver esa ruta (Ej. Si la ruta incluye `/vault/signatures`, solo el motor de compilación o el dueño de la firma pueden acceder).  
  4. Si todo es correcto, utiliza `fs.createReadStream` para enviar el archivo al navegador con el `Content-Type` adecuado (`image/png`, `application/pdf`).

  #### **D. MANEJO DE ZIPS Y BASURA (GARBAGE COLLECTION)**

* Cuando se suban paquetes `.zip` de fotografías, se guardarán temporalmente en `/events/[ID]/inputs/`.  
* El servidor descomprimirá el ZIP en la memoria RAM o en una subcarpeta temporal.  
* Una vez que el sistema compile y genere los PDFs finales en la carpeta `/outputs`, **se debe ejecutar un script automático que elimine el archivo `.zip` original y la carpeta temporal extraída**. Esto evitará que el disco duro de tu servidor se llene rápidamente. (Solo se conserva el archivo Excel como respaldo de auditoría).