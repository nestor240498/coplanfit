# Handoff: CoplanFit — App móvil de nutrición y seguimiento (Fase 1, vista Entrenador)

## Overview
CoplanFit es una app móvil para entrenadores personales: gestionan clientes, construyen planes nutricionales con ayuda de un asistente de IA (organizado por grupo de alimento), dan seguimiento antropométrico, comparan versiones de plan/medidas en el tiempo, y exportan planes en PDF con su marca. Incluye suscripción por paquetes y un panel Super Admin para validar pagos móviles.

## About the Design Files
Los archivos de este paquete son **referencias de diseño hechas en HTML** (`CoplanFit Diseño (referencia).dc.html`) — mockups estáticos que muestran el look & feel y el flujo esperado, **no código de producción para copiar tal cual**. La tarea es **recrear estos diseños en el stack real de la app** (React Native, Flutter, Swift/Kotlin nativo, etc. — el que ya use o se decida para el proyecto), aplicando los patrones y librerías propias de ese entorno.

## Fidelity
**Alta fidelidad (hifi)** en visual: colores, tipografía, spacing y jerarquía están definidos y deben respetarse. **Baja fidelidad en interacción**: son mockups estáticos, no un prototipo clickeable — las transiciones, validaciones de formulario y microinteracciones deben diseñarse siguiendo los patrones nativos de la plataforma, usando los flujos aquí descritos como guía funcional.

Dirección visual elegida: **"Navy Pro"** (fila `1d` en el archivo de referencia) y logo **isotipo + wordmark** (`1a`). El archivo de referencia contiene además 2 direcciones visuales descartadas (Light SaaS, Dark Contrast) y 2 logos descartados (monograma, símbolo abstracto) — ignorar esas secciones.

## Design Tokens

**Colores**
| Token | Hex | Uso |
|---|---|---|
| Navy (primario) | `#1B2A4A` | Headers, texto fuerte, botones secundarios |
| Lima (acento) | `#8BC53F` | CTAs primarios, checks, estado positivo |
| Fondo | `#F7F8FA` | Fondo de pantalla |
| Superficie | `#FFFFFF` | Tarjetas |
| Borde | `#DDE2EA` | Inputs, separadores |
| Texto secundario | `#5A6270` / `#8B93A3` | Labels, subtítulos |
| Alerta / alergia | `#B4442E` sobre `#FFE4DF` | Alergias, pagos pendientes |
| Éxito / vigente | `#4B7A1F` sobre `#EAF6D9` | Estados "vigente", objetivos, favorable |

**Tipografía:** Manrope 800/700 (encabezados, 14–19px en mobile), Inter 400–700 (cuerpo, 9–13px en mobile — escalar a mínimos de accesibilidad nativa en producción, no usar los px del mockup literalmente en pantallas reales).

**Radios:** tarjetas 10px, inputs 8px, botones 10px, contenedor de pantalla 28px (mockup only, no aplica a frame real de dispositivo), chips 20px (pill).

**Sombras:** tarjetas `0 2-8px 24px rgba(27,42,74,0.06-0.18)` — sombra suave, nunca dura.

## Navegación
Tab bar inferior fija (3 items) en pantallas raíz: **Clientes / Suscripción / Perfil**. Pantallas de detalle usan navegación en pila con back arrow "‹" en el header, sin tab bar visible. Ver diagrama de flujo en la sección Screens.

## Screens / Views

### Login / Onboarding
Campos correo + contraseña, CTA "Iniciar sesión" (lima, texto navy), link "Crear cuenta".

### Lista de clientes (raíz, tab "Clientes")
- Buscador de clientes.
- Badge de cupo de suscripción (ej. "8/10").
- Tarjetas: avatar circular, nombre, objetivo + versión de plan vigente.
- FAB "+" (ancla inferior derecha) → Nuevo cliente.

### Nuevo cliente
Form corto: nombre completo (requerido), correo/teléfono (opcional), edad, objetivo (select). Nota: resto de datos se completa luego en la ficha. CTA "Crear cliente".

### Ficha de cliente
Header: back arrow + nombre (editable, ícono ✎) + edad/fecha de alta. 4 tabs: **Datos / Salud / Antropometría / Planes**.

- **Datos**: chips por categoría (alergias, condiciones, alimentos a evitar) con × para quitar y "+ Agregar" que abre bottom sheet (selector tipo dato + búsqueda + sugeridos comunes). Objetivo (select), notas libres. Muestra fecha de última medición antropométrica (solo lectura, link implícito al tab Antropometría).
- **Salud**: edad, notas médicas generales.
- **Antropometría** — **sección independiente**, con:
  - Campos individuales: peso, % grasa, estatura, cintura, cadera, brazo, IMC (calculado), relación cintura/cadera (calculada), pliegues cutáneos (tríceps, abdominal, subescapular).
  - Botón **"Actualizar medición"** → pantalla con TODOS los campos en modo edición → al guardar, crea una **nueva entrada** en el historial (append, no overwrite); IMC y relación cintura/cadera se recalculan server-side/cliente.
  - Link "Ver historial completo" → lista de entradas pasadas con selección por checkbox, **máximo 2 seleccionables simultáneamente** (deshabilitar visualmente la 3ra opción hasta liberar una) → botón "Comparar seleccionadas" → pantalla de comparación en tabla (columna por fecha, flechas ↑/↓ de tendencia relativas al objetivo del cliente).
- **Planes**: lista de versiones (vigente resaltada con borde lima + badge), botón "+ Nueva versión del plan" (→ Constructor de plan), checkboxes de selección **máximo 2**, botón "Comparar seleccionadas" → tabla comida-por-comida resaltando diffs.

### Constructor de plan
Configuración previa a la IA — todo editable por el entrenador:
- **Comidas del día**: cada fila = nombre + hora, con × para quitar; "+ Agregar comida" → sheet (nombre, tipo comida/merienda, time picker tipo rueda hora/min/AM-PM).
- **Hidratación**: input de agua mínima diaria (litros).
- **Suplementación**: lista de suplementos (nombre + horario resumido), tap para editar (nombre, dosis, horario, botón eliminar) vs. "+ Agregar suplemento" (mismo formulario, vacío; opciones de horario: cualquier hora, en ayunas, antes/después de entrenar, después de X comida, después de cierta hora).
- **Nota adicional para la IA**: textarea libre.
- CTA "Generar sugerencias con IA".

### Asistente de IA
Checklist agrupado por: Carbohidratos, Proteínas, Vegetales, Grasas, Suplementos. Cada ítem: checkbox + nombre + chip de cantidad editable (✎). "+ Agregar alimento" por grupo → sheet (selector de grupo, nombre de alimento, cantidad + unidad, motivo opcional — útil para justificar sustituciones por alergias). CTA "Generar vista previa del plan".

### Vista previa del plan / Exportar PDF
Documento tipo hoja: header con logo, nombre del cliente, tabla de comidas (2 opciones por comida), lista de mercado agrupada (chips por color/grupo), notas de suplementos, footer con **nombre y rol del entrenador** (desde su perfil). Selector de color de acento del PDF. CTA "Exportar PDF".

### Mi perfil (entrenador, tab "Perfil")
Nombre, correo, nombre del negocio, logo (upload) — alimenta el footer del PDF exportado. CTA "Guardar cambios".

### Suscripción (tab "Suscripción")
Tarjeta de paquete activo con barra de uso (clientes activos/límite), próximo cobro con countdown, método de pago, CTA "Subir de paquete".

### Panel Super Admin
Cola de reportes de pago móvil: nombre, monto, referencia, acciones Validar/Rechazar por fila.

## State Management (guía funcional, no técnica)
- Cliente: perfil base + colecciones independientes de `condiciones`, `alergias`, `alimentosEvitar`, `medicionesAntropométricas[]` (histórico append-only), `versionesPlan[]` (histórico append-only, una marcada `vigente`).
- Selección de comparación: array de máx. 2 IDs (mediciones o versiones de plan) — la UI debe bloquear una 3ra selección sin deseleccionar antes.
- Constructor de plan: estado local de `comidas[]`, `aguaMinima`, `suplementos[]`, `notaIA` — al confirmar, se envía a generación IA; el resultado (`sugerenciasPorGrupo`) es editable antes de confirmarse como plan.
- Perfil de entrenador: 1 registro (nombre, correo, negocio, logoUrl) reutilizado en cada export de PDF.

## Assets
Sin imágenes/fotografía — todo iconografía simple con formas (círculos/rects) como placeholder de avatares y logo. El logo final (isotipo + wordmark, propuesta 1a) debe producirse en vector (SVG) para uso real en la app y en el PDF exportado.

## Files
- `CoplanFit Diseño (referencia).dc.html` — mockups completos (logos explorados, 3 direcciones visuales, y flujo detallado de todas las pantallas descritas arriba). Abrir en navegador.
- `CoplanFit - Concepto v2.md` — documento de producto actualizado con el alcance y las decisiones de diseño tomadas.
