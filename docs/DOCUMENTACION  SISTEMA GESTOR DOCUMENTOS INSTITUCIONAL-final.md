

## FASE DE ANÁLISIS: 1. DOCUMENTO DE VISIÓN Y ALCANCE (V 2.0)
1.1 Propósito del Documento
El propósito de este documento es recopilar, analizar y definir las necesidades de alto nivel y las
características del sistema de orquestación documental híbrido (Web2/Web3) para el Instituto Tecnológico de
Sonora (ITSON). Proporciona una base común para que los desarrolladores, los directivos institucionales y los
auditores externos comprendan las capacidades, los límites operativos, la tolerancia a fallos y la justificación
tecnológica del proyecto.
1.2 Declaración del Problema
El problema de la gestión, emisión y validación burocrática de constancias académicas afecta a los
departamentos de Control Escolar, la planta docente y la comunidad de egresados del ITSON. El impacto de
este problema es una alta latencia en la obtención de firmas, riesgos de errores humanos en la asignación de
folios, y vulnerabilidad ante la falsificación documental. Adicionalmente, los sistemas tradicionales sufren de
"pudrición de enlaces" (Link Rot) y pérdida de archivos históricos, mientras que las implementaciones
Blockchain estándar son frágiles ante errores humanos (ej. errores ortográficos en nombres), ya que la
inmutabilidad de la red impide la corrección directa de un documento sellado. Una solución exitosa sería el
desarrollo de un sistema informático con tolerancia a fallos que orqueste la generación documental mediante
Data Hashing (hashear datos puros en lugar de archivos binarios), integre almacenamiento estático con
opciones de recuperación visual bajo demanda, y permita la corrección de errores administrativos mediante
revocaciones formales y emisiones complementarias, manteniendo intacta la capa de confianza criptográfica
en la red pública Polygon.
1.3 Declaración de la Visión
Para el Instituto Tecnológico de Sonora (ITSON), que tiene la necesidad de modernizar sus flujos
administrativos, garantizar la inmutabilidad de sus credenciales y prevenir la pérdida de información histórica,
el sistema propuesto es una plataforma de orquestación documental Software as a Service (SaaS) que
automatiza la generación de archivos PDF dinámicos y certifica su validez. A diferencia de los sistemas
tradicionales centralizados o los validadores de archivos estáticos que fallan ante el cambio de metadatos
ocultos, nuestro producto implementa una arquitectura híbrida basada en Data Hashing. Comprime
criptográficamente la información transaccional (Payload) mediante Árboles de Merkle y ancla la raíz en
Polygon. Acompaña esta seguridad lógica con una capa de preservación física mediante Object Storage
(S3/MinIO), ofreciendo un portal de auditoría que re-hashea los datos en tiempo real y permite la descarga
inalterada del documento visual.
1.4 Perfiles de los Interesados (Stakeholders)
Perfil de
## Interesado
Rol en el
## Sistema
Necesidades y Objetivos Principales
## Alta Dirección /
## Rectoría
## Patrocinador /
## Firmante
Proteger el prestigio de la institución mitigando el
fraude documental. Emitir firmas concurrentes de
manera masiva y eficiente.

## Control Escolar Administrador /
## Auditor
Mantener trazabilidad estricta. Gestionar la
recuperación visual de documentos (aportando
recursos gráficos perdidos). Ejecutar
revocaciones en Smart Contracts y generar
Emisiones Complementarias para subsanar
errores humanos.
Docentes y
## Coordinadores
## Creador
(Operativo)
Reducir el tiempo en generar constancias.
Inyectar textos libres y logotipos específicos por
evento. Conciliar datos masivos mediante Mapeo
Multizona (múltiples .zip) en el Staging Area.
Egresados y
## Alumnos
## Beneficiario
## Final
Obtener sus credenciales en menor tiempo y
poseer un respaldo digital perpetuo, verificable y
portátil, respaldado en la Blockchain pública.
## Empleadores /
## Terceros
## Validador
## Externo
Disponer de un mecanismo público e instantáneo
(Código QR) para confirmar la integridad de los
datos de un candidato y descargar la copia visual
original del documento.
1.5 Alcance del Sistema (System Scope)
Para garantizar la viabilidad del proyecto de titulación y su grado empresarial, se establecen los siguientes
límites arquitectónicos:
1.5.1 Funcionalidades Dentro del Alcance (In-Scope)
● Motor de Plantillas Dinámicas: Interfaz de diseño (Drag & Drop) para mapear variables estáticas,
dinámicas (catálogos) y de entrada libre, soportando orígenes de datos polimórficos.
● Área de Preparación (Staging Area) y Mapeo Multizona: Interfaz para la importación y conciliación
de archivos estructurados (
.xlsx/.csv) y paquetes multimedia paralelos (múltiples .zip), con capacidad
de edición quirúrgica.
● Flujos de Consenso: Implementación de RBAC granular y firmas digitales concurrentes.
● Almacenamiento Híbrido y Recuperación Visual: Integración con Object Storage (AWS S3 / MinIO)
para la custodia de PDFs originales, complementado con un módulo de reconstrucción al vuelo
(Fallback) en caso de pérdida de activos estáticos.
● Criptografía Basada en Datos (Data Hashing): Generación de hashes $SHA-256$ a partir del
Payload JSON en lugar del archivo binario, garantizando la validación sin depender de metadatos del
## PDF.

● Tolerancia a Fallos Web3: Integración con la red Polygon mediante Árboles de Merkle, soportando
lógica de revocación de estados (
revokeHash) y orquestación de Emisiones Complementarias
(múltiples lotes/Merkle Roots por evento) para corregir errores tipográficos post-emisión.
1.5.2 Limitaciones y Exclusiones (Out-of-Scope)
● Transacciones Financieras: El sistema no integrará pasarelas de pago para el cobro de aranceles
estudiantiles por la emisión de títulos o constancias.
● Gestión Académica Central (Kardex): El sistema no reemplazará al Sistema de Información
Académica del ITSON en cuanto al control de calificaciones; funcionará como un orquestador
documental alimentado por archivos estructurados.
● Custodia de Llaves Privadas del Alumno: Para mantener la usabilidad (Web2.5), el sistema no
exigirá que los estudiantes operen wallets criptográficas individuales (ej. MetaMask). El anclaje se
realizará de manera institucional.
● Mutabilidad On-Chain: El sistema no intentará "borrar" registros de la Blockchain, respetando la
naturaleza Append-Only de la tecnología DLT. Las correcciones se manejarán estrictamente a través
de transacciones de cambio de estado (Revocación) y anexos (Emisiones Complementarias).



## FASE DE ANÁLISIS: 2. ESPECIFICACIÓN DE REQUERIMIENTOS DEL SISTEMA (SRS) -
## V 2.0
2.1 Requerimientos Funcionales (RF)
Los Requerimientos Funcionales definen las acciones específicas, comportamientos y procesos de tolerancia
a fallos que el sistema informático debe ejecutar de manera obligatoria para satisfacer los flujos de negocio
institucionales.
● RF-01 (Gestión RBAC Granular): El sistema debe permitir al rol Administrador crear, modificar,
suspender y eliminar cuentas de usuario, asignándoles perfiles basados en la combinación de
permisos atómicos específicos (e.g.,
crear_evento, firmar_documentos, revocar_folio,
emitir_complemento).
● RF-02 (Motor de Plantillas y Selectores Multidimensionales): El sistema debe proveer una interfaz
visual (Drag & Drop) para el diseño de plantillas documentales. El motor debe generar un esquema
JSON que clasifique las variables en:
○ Contexto Global: Selectores dinámicos hidratados desde la base de datos (ej. Autoridades
firmantes) y campos de entrada libre (ej. Logotipo del evento, textos de agradecimiento)
capturados por el Creador al inicializar el evento.
○ Contexto de Fila (Mapeo Multizona): Variables mapeadas desde columnas del archivo
estructurado importado. En caso de recursos gráficos, el motor debe soportar múltiples zonas
de carga independientes (múltiples paquetes
.zip) y conciliar las imágenes (ej. foto de perfil,
foto de proyecto) utilizando la llave primaria (Matrícula) como índice relacional.
● RF-03 (Bóveda Digital de Firmas): El sistema debe obligar a los usuarios con el permiso
firmar_documentos a inicializar una bóveda digital dentro de su perfil, la cual almacenará su cargo
oficial y una imagen de su firma autógrafa en formato PNG transparente.
● RF-04 (Conciliación en Staging Area): Al importar los datos (.xlsx / .csv y .zip), el sistema no debe
compilar los documentos inmediatamente. Debe renderizar un Data Grid interactivo que exponga el
cruce de datos, alerte sobre información o gráficos faltantes, y permita la edición quirúrgica de
registros individuales hasta obtener validación completa.
● RF-05 (Consenso Escalonado y Separación de Poderes): El ciclo de vida de un evento debe estar
estrictamente separado en etapas: Creación (
## PENDIENTE
## ), Aprobación Administrativa (
## AUTORIZADO
## ),
Consenso de Firmas (
## FIRMADO
) y Generación Final (
## COMPLETADO
). El sistema notificará a las
autoridades para la recolección de firmas únicamente después de que el rol Administrador haya
validado el evento y autorizado la cantidad de folios institucionales solicitados.
● RF-06 (Asignación JIT y Nomenclatura): El sistema debe asignar folios institucionales de manera
atómica transaccional durante la generación final del documento. Estos folios deben obedecer a una
nomenclatura lógica configurable (ej.
ITSON-NAV-2026-0001), previniendo saltos numéricos.
● RF-07 (Notarización Web3 mediante Data Hashing): Si la notarización Web3 está activa, el sistema
no debe hashear el archivo binario final (PDF). En su lugar, debe extraer el Payload transaccional
(JSON con los datos puros del registro), calcular el hash unidereccional ($SHA-256$) de dicha
información, construir un Árbol de Merkle y registrar el Merkle Root en el Smart Contract de Polygon.
● RF-08 (Almacenamiento Híbrido Primario): Tras la compilación exitosa, el sistema debe almacenar
automáticamente los archivos PDF originales en un proveedor de Almacenamiento de Objetos (Object
Storage como AWS S3 o MinIO). El sistema guardará la URL estática resultante en la base de datos
local para su posterior distribución.
● RF-09 (Recuperación Visual Bajo Demanda - Fallback): En caso de corrupción, pérdida de
metadatos o caída del proveedor de almacenamiento primario (S3), el sistema debe permitir al
Administrador reconstruir el PDF al vuelo. Utilizará el Payload original guardado en PostgreSQL y

solicitará manualmente los recursos gráficos faltantes, regenerando la copia visual sin alterar la
validación de los datos en Blockchain.
● RF-10 (Revocación Booleana y Emisiones Complementarias): Para corregir errores humanos
post-emisión sin violar la inmutabilidad de Web3, el sistema debe permitir la revocación actualizando la
bandera booleana del folio afectado (
isValid = false) y directamente en el mapa de estados del Smart
Contract. Posteriormente, permitirá generar un Lote Complementario dentro del mismo Evento,
emitiendo un folio nuevo, recalculando un hash fresco y anclando un nuevo Merkle Root a la
Blockchain para asegurar la trazabilidad histórica de la corrección.
● RF-11 (Validación Pública en Tiempo Real): El Código QR incrustado en cada documento redirigirá
al portal /verify. Este portal debe: 1) Extraer el Payload original de la base de datos; 2) Ejecutar un
Re-Hashing (SHA-256) en memoria en ese instante; 3) Verificar que el estado local sea válido (
isValid
== true
) y que el hash no esté revocado, para luego validar su Merkle Proof en Polygon; 4) Desplegar
visualmente la autenticidad y habilitar la descarga del documento desde el Object Storage
● RF-12 (Registro de Trazabilidad y Caja Negra): El sistema debe implementar un módulo de auditoría
transversal que registre de manera inmutable cada acción crítica ejecutada (e.g., creación,
autorización, firmas, generación de documentos y revocaciones). El registro debe almacenar el
identificador del usuario, la acción realizada, la fecha exacta y un objeto JSON (Snapshot) con el
detalle de los datos alterados, sirviendo como evidencia forense institucional.

2.2 Requerimientos No Funcionales (RNF)
Los Requerimientos No Funcionales establecen las restricciones, criterios de rendimiento, tolerancia a fallos y
normativas bajo las cuales debe operar el sistema.
● RNF-01 (Cumplimiento LFPDPPP): La capa Web3 (On-Chain) tiene estrictamente prohibido recibir o
almacenar Datos Personales Identificables (PII) como nombres o matrículas. Solo procesará hashes
alfanuméricos irreversibles.
● RF-02 (Motor de Plantillas y Prefijos Inmutables): El sistema debe proveer una interfaz visual (Drag
& Drop) para el diseño de plantillas documentales. Al momento de la creación, el Administrador deberá
definir un Prefijo de Folio único para esa plantilla (ej.
## NA
para Agradecimientos). Este prefijo será
inmutable tras su creación y funcionará como la llave base para aislar el contador de folios de dicha
plantilla respecto a las demás.
● RNF-03 (Optimización de Gas Fees): El sistema debe garantizar la viabilidad financiera mediante la
compresión de transacciones. Independientemente del tamaño del lote (1 o 5,000 constancias), el
sistema ejecutará una sola transacción de escritura (1 Merkle Root) en la red Polygon por cada
consenso aprobado.
● RNF-04 (Tiempos de Respuesta y Disponibilidad Visual): La descarga de los documentos alojados
en el almacenamiento de objetos (S3/MinIO) debe tener un tiempo de respuesta menor a 1.5
segundos. En caso de requerir la ejecución del módulo de Recuperación Visual Bajo Demanda
(RF-09), la compilación del documento no debe exceder los 3.0 segundos.
● RNF-05 (Integridad Transaccional): Toda operación que involucre cambios de estado, revocaciones,
o asignación de folios Just-in-Time, debe ejecutarse mediante transacciones ACID (Atomicidad,
Consistencia, Aislamiento, Durabilidad) a nivel de la base de datos relacional para evitar registros
huérfanos.
● RF-06 (Asignación JIT, Nomenclatura y Contadores Aislados): El sistema debe asignar folios
institucionales de manera atómica transaccional. La secuencia numérica será estrictamente
independiente por cada plantilla. El contador de una plantilla (ej. Agradecimientos) iniciará en 0 y
solo incrementará cuando se generen documentos de esa plantilla específica. La nomenclatura final

será construida dinámicamente:
[Prefijo_Plantilla] + [Año] + [-] +
[Secuencia_Independiente]
. Para evitar colisiones (Race Conditions) en la generación masiva, el
sistema utilizará una tabla de secuencias con bloqueo de fila (Row Lock) en la base de datos.

## FASE DE ANÁLISIS: 3. MODELADO DE NEGOCIO Y CASOS DE USO (UML) - V 2.0
El modelado de casos de uso describe la interacción dinámica entre los actores (usuarios o sistemas
externos) y la plataforma de orquestación documental, definiendo los límites del sistema, los flujos
transaccionales y los protocolos de tolerancia a fallos.
3.1 Catálogo General de Casos de Uso
A continuación, se enlistan los Casos de Uso (CU) principales, agrupados por el Actor que los detona según el
modelo de Control de Acceso Basado en Roles (RBAC):
Actor: Administrador del Sistema
● CU-01: Gestionar Usuarios, Roles Relacionales y Permisos Atómicos.
● CU-02: Diseñar Plantillas Documentales (Drag & Drop), configurar variables multidimensionales
y asignar un Prefijo Institucional Inmutable que inicializará un contador de folios independiente
y aislado para dicha plantilla.
● CU-03: Ejecutar módulo de Recuperación Visual Bajo Demanda (Fallback de S3).
Actor: Creador de Eventos (Docente / Coordinador)
● CU-04: Inicializar Evento e inyectar Contexto Global (Ej. Seleccionar plantilla, asignar Firmantes,
capturar textos libres y logos del evento).
● CU-05: 6. El Creador audita visualmente y presiona "Solicitar Aprobación". 7. El Sistema guarda el
Payload JSON en la base de datos y cambia el estado del evento a
## PENDIENTE
## . 8. El Administrador
revisa la solicitud, aprueba la cantidad de folios y el sistema cambia el estado a
## AUTORIZADO
## ,
detonando en ese momento las notificaciones al panel de los Firmantes.
● CU-06: Consultar estado de los eventos propios (Histórico local).
Actor: Firmante (Autoridad Académica)
● CU-07: Configurar Bóveda Digital (Subir firma visual PNG transparente y cargo oficial).
● CU-08: Consultar Bandeja de Entrada de Lotes Pendientes (Consenso Concurrente).
● CU-09: Emitir firma de aprobación (o rechazo) concurrente para un Lote.
## Actor: Auditor / Control Escolar
● CU-10: Consultar Panel de Histórico Global y descargar expedientes originales desde Object Storage.
● CU-11: Ejecutar Revocación de Hash en Smart Contract (Web3).
● CU-12: Orquestar Emisión Complementaria para corrección de datos inmutables.
Actor: Validador Externo (Público)
● CU-13: Escanear Código QR, validar Data Hash en tiempo real e inspeccionar documento visual
original.

3.2 Especificación Detallada de Casos de Uso Críticos
Para demostrar la robustez y tolerancia a fallos del sistema, se detallan a continuación las especificaciones
algorítmicas de los flujos centrales de la arquitectura.
CU-05: Carga Masiva y Mapeo Multizona en Staging Area

## Atributo Descripción Formal
Identificador CU-05
Nombre Carga y Conciliación Multizona en Staging Area.
Actor Principal Creador de Eventos (Docente / Coordinador).
Precondiciones El usuario ha iniciado sesión, posee el permiso crear_evento y ha
completado la inyección de Contexto Global (CU-04). La plantilla
seleccionada demanda múltiples recursos gráficos por alumno.
Postcondiciones El evento cambia su estado a PENDIENTE_FIRMAS. El Payload
JSON consolidado se guarda en la base de datos relacional.
Flujo Principal (Ruta Feliz):
- El Sistema renderiza la interfaz de inyección de datos, detectando en el esquema JSON que se
requieren múltiples imágenes por fila (ej.
foto_perfil y foto_proyecto).
- El Sistema habilita una zona para el archivo estructurado y múltiples zonas de carga independientes
(Mapeo Multizona) para los archivos
## .zip.
- El Creador adjunta el archivo .xlsx (población objetivo) y sube los paquetes .zip correspondientes a
cada zona solicitada.
- El Sistema extrae los archivos en memoria temporal y utiliza la llave primaria (ej. Matrícula) para
conciliar los datos del Excel con las imágenes de los distintos
## .zip.
- El Sistema renderiza el Data Grid (Tabla interactiva) mostrando el cruce exacto. Todas las filas validan
exitosamente en color verde.
- El Creador audita visualmente y presiona "Enviar a Bandeja de Firmas".
- El Sistema destruye los archivos .zip temporales, guarda el Payload JSON en la base de datos y
detona notificaciones a las Autoridades.
Flujo Alterno (Asimetría de Datos y Edición Quirúrgica):
● Paso 5a: El Sistema detecta que en el ZIP_2 falta la fotografía correspondiente a la matrícula
## "243410".

● Paso 5b: El Sistema renderiza el Data Grid, marcando la fila anómala en rojo y bloqueando el botón de
envío.
● Paso 5c: El Creador hace clic en la fila, abriendo el modal de Edición Quirúrgica. Sube manualmente la
fotografía faltante exclusivamente para ese registro.
● Paso 5d: El Sistema revalida la fila (cambia a verde) y desbloquea el flujo principal.

CU-12: Revocación y Emisión Complementaria (Disaster Recovery)
## Atributo Descripción Formal
Identificador CU-12
Nombre Ejecución de Emisión Complementaria On-Chain.
## Actor Principal Auditor / Control Escolar.
Precondiciones El evento ya fue emitido y anclado a Polygon. Se ha detectado un
error humano (ej. error ortográfico en un nombre) en un folio
específico.
Postcondiciones El hash original es revocado en el Smart Contract. Se genera un
nuevo Lote (con nuevo folio, hash y Merkle Root) asociado al mismo
ID de Evento.
Flujo Principal (Ruta Feliz):
- El Auditor localiza el folio erróneo en el Histórico de Eventos y selecciona la opción "Revocar y
## Corregir".
- El Sistema solicita confirmación y firma una transacción Web3 invocando la función revokeHash() en el
Smart Contract de Polygon.
- El Sistema actualiza el estado local del folio a REVOCADO.
- El Sistema abre un formulario pre-llenado con el Payload original del alumno afectado (Iniciando la
## Emisión Complementaria).
- El Auditor corrige el error ortográfico en el campo correspondiente (ej. cambia "Luiss" por "Luis") y
confirma.

- El Sistema asigna un nuevo folio institucional secuencial.
- El Sistema genera un nuevo archivo PDF físico y lo envía al Object Storage (S3/MinIO).
- El Sistema calcula el nuevo $SHA-256$ del Payload corregido, construye un nuevo Árbol de Merkle
(aunque sea de 1 solo registro) y envía el nuevo Merkle Root a Polygon, asociándolo al ID del Evento
original.

CU-13: Validación Pública mediante Data Hashing
## Atributo Descripción Formal
Identificador CU-13
Nombre Validación Pública Inmutable y Descarga Visual.
Actor Principal Validador Externo (Empleador / Tercero).
Precondiciones El Validador Externo posee el documento físico o digital y un
dispositivo móvil con conexión a internet.
Postcondiciones El Validador confirma la inmutabilidad de los datos y obtiene acceso
a la copia visual original.
Flujo Principal (Ruta Feliz):
- El Validador escanea el Código QR, el cual lo redirige al portal /verify con el Folio y el Hash como
parámetros en la URL.
- El Sistema (Next.js) consulta la base de datos PostgreSQL, obteniendo el Payload original en formato
## JSON.
- El Sistema ejecuta el algoritmo $SHA-256$ sobre el Payload en memoria (Re-Hashing en Tiempo
## Real).
- El Sistema compara el hash calculado contra el parámetro de la URL y ejecuta una consulta de lectura
al nodo RPC de Polygon para verificar la Merkle Proof.
- El Smart Contract confirma que el Hash pertenece al Merkle Root del evento y no ha sido revocado.
- El Sistema despliega en pantalla un identificador de éxito ("Datos Inmutables - No Alterados"),
mostrando los datos clave del alumno.

- El Sistema habilita un botón interactivo para "Descargar Copia Visual (PDF)". Al hacer clic, el Validador
descarga el PDF original intacto directamente desde el Object Storage (AWS S3 / MinIO).
Flujo Alterno (Datos Alterados o Revocados):
● Paso 5a: El Sistema detecta que el folio fue marcado como revocado en la base de datos local, o que
el Smart Contract devuelve un estado inválido para el hash proporcionado.
● Paso 5b: El Sistema interrumpe el flujo, oculta el botón de descarga del PDF y despliega una pantalla
de alerta crítica ("DOCUMENTO REVOCADO O ALTERADO").

## FASE DE DISEÑO: 4. MODELO DE DATOS Y ENTIDADES (DICCIONARIO
## CONCEPTUAL)
## ESTÁNDAR DE AUDITORÍA UNIVERSAL (HERENCIA DE ENTIDADES)
Regla Arquitectónica: Absolutamente todas las entidades descritas a continuación heredan implícitamente tres
campos de control gestionados por el ORM, garantizando la inmutabilidad histórica del sistema:
● isActive (Booleano): Por defecto true. Define el borrado lógico (Soft Delete).
● createdAt (Timestamp): Fecha y hora exacta de la creación del registro.
● updatedAt (Timestamp): Fecha y hora exacta de la última mutación de los datos.
Núcleo 1: Control de Acceso y Seguridad (RBAC) Gestiona quién entra al sistema y quién tiene poder de
firma institucional. Entidad: Usuario
● ID_Usuario (Identificador Único - PK)
● Nombre_Completo (Cadena de texto)
● Correo_Institucional (Cadena de texto - Único)
● Roles_Asignados (Arreglo JSON - Lista de roles que posee, ej. ["Admin", "Creador"])
Entidad: Boveda_Firma (Relación 1 a 1 con Usuario)
● ID_Boveda (Identificador Único - PK)
● ID_Usuario (Llave Foránea - FK)
● Cargo_Oficial (Cadena de texto - Ej. "Director de Ingeniería")
● URL_Firma_PNG (Cadena de texto - Enlace al bucket de S3 donde vive la imagen de la firma
autógrafa) (Nota: El campo Estado original es sustituido por la herencia universal
isActive).
Núcleo 2: Diseño y Orquestación (Eventos y Plantillas) Gestiona el cascarón visual y la agrupación
transaccional. Entidad: Plantilla_Documental
Entidad: Plantilla_Documental
## ●
ID_Plantilla
(Identificador Único - PK)
## ●
Nombre_Plantilla
(Cadena de texto)
## ●
Prefijo_Folio
(Cadena de texto - UNIQUE e Inmutable - Ej. "NA", "NC")
## ●
Esquema_Craft_JSON
(Objeto JSON)
## ●
Creador_ID
(Llave Foránea - FK a Usuario)
Entidad: Evento_Academico
● ID_Evento (Identificador Único - PK)
● Nombre_Evento (Cadena de texto - Ej. "Congreso de Software 2026")
● ID_Plantilla (Llave Foránea - FK)
● ID_Creador (Llave Foránea - FK)
## ●
Estado_Consenso
(Enumerador:
## PENDIENTE
## ,
## AUTORIZADO
## ,
## FIRMADO
## ,
## COMPLETADO
## ,
## RECHAZADO
## )
● Feature_Flag_Web3 (Booleano - ¿Va a Polygon o es solo local?)
● Contexto_Global_Inyectado (Objeto JSON - Aquí se guardan los logos y textos libres que el Creador
inyectó para TODO el evento).
Entidad: Consenso_Firmantes (Tabla pivote N:M entre Evento y Bovedas)

● ID_Evento (Llave Foránea - FK)
● ID_Boveda (Llave Foránea - FK)
● Aprobado (NULLEABLE Booleano null = PENDIENTE, false = RECHAZADO, true= APROBADO)
● Fecha_Firma (Marca de tiempo - Timestamp)
● Entidad: Registro_Auditoria (Historial Forense Institucional) Esta tabla actúa como una
bitácora inmutable (caja negra) que documenta quién, cuándo y qué acción se realizó sobre
cualquier entidad del sistema.
## ○
ID_Auditoria
(Identificador Único - PK)
## ○
ID_Usuario
(Llave Foránea - FK a Usuario - Quien ejecutó la acción)
## ○
Accion_Realizada
(Enumerador:
## CREAR
## ,
## AUTORIZAR
## ,
## FIRMAR
## ,
## GENERAR_DOCS
## ,
## REVOCAR
## ,
## ACTUALIZAR
## ,
## ELIMINAR
## )
## ○
Entidad_Afectada
(Cadena de texto - Ej. "Evento_Academico", "Documento_Folio")
## ○
ID_Entidad
(Cadena de texto - El ID del registro modificado)
## ○
Detalle_Snapshot
(Objeto JSON - Guarda los valores exactos aprobados o
modificados, ej. folios autorizados)
## ○
IP_Origen
(Cadena de texto opcional - Para rastreo de red)

Núcleo 3: Motor de Notarización y Recuperación (El "Core" Híbrido) Aquí es donde ocurre la magia de las
Emisiones Complementarias, el Data Hashing y la Tolerancia a Fallos. Entidad: Lote_Emision (Relación 1 a
N con Evento) Aclaración Arquitectónica: Un Evento puede tener varios Lotes. El Lote 1 son los 500 alumnos
originales. El Lote 2 es una "Emisión Complementaria" para corregir a 1 alumno.
● ID_Lote (Identificador Único - PK)
● ID_Evento (Llave Foránea - FK)
● Tipo_Lote (Enumerador: ORIGINAL, COMPLEMENTARIO)
● Merkle_Root_Hash (Cadena de texto - La raíz criptográfica que consolida todo el lote)
● Tx_Hash_Polygon (Cadena de texto - El recibo de la transacción en la Blockchain)
● Estado_Red (Enumerador: EN_COLA, CONFIRMADO, FALLIDO)
Entidad: Secuencia_Plantilla (Gestor Atómico de Contadores) Esta tabla actúa como el contador aislado
para cada plantilla. Al estar en una tabla separada, evita que la tabla principal de plantillas se bloquee durante
una generación masiva.
## ●
ID_Secuencia
(Identificador Único - PK)
## ●
ID_Plantilla
(Llave Foránea - FK - Relación estricta con la plantilla dueña del contador)
## ●
year_Emision
(Entero - Ej. 2026. Permite que el contador
## NA
se reinicie a 1 cada inicio de año para
cumplir con el formato
## NA026-0001
## ).
## ●
Secuencia_Actual
(Entero - El número actual del contador. Inicia en 0 y aumenta solo cuando se
usa su
ID_Plantilla
## ).
● Regla Arquitectónica: La combinación de
(ID_Plantilla, year_Emision

## )
forma una Llave Única
## Compuesta.

Entidad: Documento_Folio (Relación 1 a N con Lote) Esta es la tabla más importante del sistema. Es la
que se consulta al escanear el QR.

● ID_Documento (Identificador Único - PK)
● ID_Lote (Llave Foránea - FK)
● Folio_Institucional (Cadena de texto única - Ej. ITSON-2026-00501)
● Matricula_Identificador (Cadena de texto - Para búsquedas rápidas en el Histórico)
● Payload_Datos_Puros (Objeto JSON - La información intacta del Excel para hacer el Re-Hashing al
vuelo).
● Data_Hash_Original (Cadena de texto - El SHA-256 original de este alumno).
● URL_PDF_S3 (Cadena de texto - El enlace inmutable al documento físico guardado en el Object
## Storage).
● isValid (Booleano): Por defecto es true (Válido). Define de forma atómica y rápida si la constancia
sigue siendo legalmente válida. Cuando el Administrador ejecuta la revocación en Polygon, el sistema
simplemente actualiza este campo a
false (Revocado).
Análisis del Arquitecto Fíjate en la elegancia de este diseño, Luis:
- Si necesitas revocar un documento: Solo cambias el valor de isValid a false en la entidad
Documento_Folio e invocas el Smart Contract.
- Si necesitas emitir una corrección: Creas un nuevo registro en Lote_Emision asociado al mismo
Evento, pero con Tipo_Lote = COMPLEMENTARIO, y le insertas su nuevo Documento_Folio.
- Si el PDF físico en S3 se borra accidentalmente: El Administrador usa la Plantilla Documental + el
Contexto_Global_Inyectado (del Evento) + el Payload_Datos_Puros (del Documento) y puede
"redibujar" el archivo visualmente exacto (Módulo de Recuperación Visual). Este modelo relacional
está listo para implementarse en MySQL, PostgreSQL, Oracle o SQL Server. No tiene dependencias.


## LOGICA DE CREACION Y FASES DOCUMENTOS
El sistema de folios institucionales
(para que nunca se repitan ni haya conflictos entre eventos).
Ese problema es uno de los más difíciles en gestores documentales y casi siempre aparece en
producción.
Propuesta Original del Usuario:
## ○ PENDIENTE
## ○ ↓
## ○ AUTORIZADO
## ○ ↓
## ○ FIRMADO
## ○ ↓
## ○ COMPLETADO
● Problema Detectado: Se mezcla la aprobación administrativa con las firmas, lo que puede causar
confusión.
● Flujo Propuesto con Definiciones de Estado:
## ○ PENDIENTE:
■ Se crea el evento.
■ Se definen plantilla, contexto, logos, folios solicitados y descripción.
■ Aún no tiene autorización del administrador.
■ Estado_Evento = PENDIENTE.
## ○ AUTORIZADO:
■ El administrador revisa y aprueba el evento.
■ Se aprueba el número de folios (pueden ser menos de los solicitados).
■ El evento queda listo para firmas.
■ Estado_Evento = AUTORIZADO.
## ○ FIRMADO:
■ Los firmantes aprueban el evento (uso de
Consenso_Firmantes
## ).
■ Pasa a este estado cuando todos firman.
■ Significa que el evento y los documentos están aprobados, pero aún no existen los
documentos.
■ Estado_Evento = FIRMADO.
## ○ COMPLETADO:
■ Se suben el Excel, el ZIP de evidencias y la lista final de participantes.
■ El sistema valida datos, genera certificados y asigna folios.
■ Estado_Evento = COMPLETADO.
● Flujo Completo Real (Etapas):
## ○ CREAR EVENTO
## ○ ↓
## ○ PENDIENTE
## ○ ↓
○ Admin revisa
## ○ ↓
## ○ AUTORIZADO
## ○ ↓
○ Firmantes aprueban

## ○ ↓
## ○ FIRMADO
## ○ ↓
○ Subir Excel + ZIP
## ○ ↓
○ Generar documentos
## ○ ↓
## ○ COMPLETADO
● Recomendación Adicional (Estado de Error):
○ Agregar el estado RECHAZADO.
○ Puede ocurrir si:
■ El administrador rechaza (de PENDIENTE → RECHAZADO).
■ Un firmante rechaza (de AUTORIZADO → RECHAZADO).
● Estructura en la Base de Datos (DB):
## ○
Estado_Evento
## ENUM( 'PENDIENTE', 'AUTORIZADO', 'FIRMADO', 'COMPLETADO',
## 'RECHAZADO' )
● Punto Fuerte del Diseño (Arquitectura Correcta):
○ Se separan correctamente:
■ Aprobación del administrador (administrativa).
■ Firmas institucionales (institucional).
■ Generación documental.
## ● Próxima Recomendación:
○ Diseñar el sistema de folios institucionales para evitar repeticiones y conflictos entre
eventos.

