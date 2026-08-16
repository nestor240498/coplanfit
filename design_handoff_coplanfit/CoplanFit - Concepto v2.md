# CoplanFit — App de Nutrición y Seguimiento para Entrenadores Personales (v2)

> Actualización del documento de concepto original, incorporando las decisiones de diseño tomadas durante la fase de mockups (logo, navegación, constructor de plan, ficha de cliente, comparaciones).

## Identidad de marca

**Logo elegido:** Isotipo + wordmark (propuesta 1a). Dos formas superpuestas en azul marino (#1B2A4A) y verde lima (#8BC53F) representando al entrenador y al cliente co-planificando. Funciona como ícono de app en versión sólida (56×56, radio 14px).

**Paleta:**
- Azul marino `#1B2A4A` — color primario, headers, texto fuerte
- Verde lima `#8BC53F` — acento, CTAs, estados positivos
- Fondo neutro `#F7F8FA`
- Rojo/coral `#B4442E` / `#FFE4DF` — alertas, alergias, pagos pendientes
- Verde claro `#EAF6D9` / `#4B7A1F` — estados "vigente", objetivos

**Tipografía:** Manrope (800/700, encabezados) + Inter (400–700, cuerpo).

**Dirección visual elegida:** "Navy Pro" — headers en azul marino oscuro, cuerpo de pantalla en fondo claro, tarjetas blancas con sombra suave.

## Navegación (Fase 1 — Entrenador)

Tab bar inferior fija en las pantallas raíz: **Clientes / Suscripción / Perfil**. Las pantallas de detalle (ficha de cliente, constructor de plan, asistente IA, vista previa, comparaciones, historial) se abren en pila con flecha "‹ atrás" en el header y no muestran tab bar.

## Pantallas

### 1. Login / onboarding
Formulario simple: correo, contraseña, CTA "Iniciar sesión", link a "Crear cuenta".

### 2. Lista de clientes
Buscador, contador de cupo (ej. "8/10" según paquete de suscripción), lista de tarjetas (nombre, objetivo, versión de plan vigente), botón flotante "+" para agregar cliente.

### 3. Nuevo cliente
Formulario mínimo al crear: nombre completo, correo/teléfono (opcional), edad, objetivo. El resto de los datos (alergias, condiciones, medidas) se completa después en la ficha.

### 4. Ficha de cliente
Header con nombre editable (ícono ✎) y botón "‹" para volver. Cuatro tabs:

- **Datos**: alergias, condiciones, alimentos a evitar, objetivo, notas adicionales; cada categoría permite agregar/quitar chips vía un sheet "Agregar a la ficha" (selector de tipo: condición/alergia/evita + campo de búsqueda + sugeridos). Muestra "Última medición antropométrica: [fecha]" como referencia rápida.
- **Salud**: edad, objetivo, notas médicas.
- **Antropometría**: pantalla dedicada a medidas corporales — peso, % de grasa, estatura, medición corporal (cintura, cadera, brazo — desplegadas individualmente), índice de masa corporal, relación cintura/cadera, plicometría (tríceps, abdominal, subescapular — desplegados individualmente), fecha de última actualización. Botón **"Actualizar medición"** abre una pantalla con todos los campos habilitados para edición; al guardar, se crea una nueva entrada en el historial (no sobrescribe la anterior). Link "Ver historial completo".
  - **Historial de antropometría**: lista de entradas pasadas con resumen (peso, % grasa, cintura, IMC). Selección máxima de **2** entradas vía checkbox (la tercera opción se deshabilita visualmente hasta liberar una) para comparar.
  - **Comparar mediciones**: tabla lado a lado de las 2 mediciones seleccionadas con flechas ↑/↓ indicando si el cambio es favorable según el objetivo del cliente.
- **Planes**: lista de versiones de plan (vigente resaltada), botón **"+ Nueva versión del plan"**, selección máxima de **2** versiones vía checkbox para comparar.
  - **Comparar planes**: tabla comida por comida (desayuno, almuerzo, merienda, cena, suplementos) mostrando qué cambió entre las dos versiones seleccionadas, resaltado en verde lo agregado/aumentado.

### 5. Constructor de plan (configuración base)
Antes de invocar la IA, el entrenador configura:
- **Comidas del día**: lista editable (nombre + hora), cada una removible (×), botón "+ Agregar comida" que abre un sheet con nombre, tipo (comida/merienda) y selector de hora tipo rueda (hora/minuto/AM-PM).
- **Hidratación**: cantidad mínima de agua diaria (editable, ej. 2.5 L).
- **Suplementación**: lista de suplementos con su horario resumido, cada uno editable (nombre, dosis, horario) o eliminable; botón "+ Agregar suplemento" abre un sheet con nombre, dosis y horario (opciones: cualquier hora, en ayunas, antes/después de entrenar, después de X comida, después de cierta hora).
- **Nota adicional para la IA**: campo de texto libre (preferencias, restricciones puntuales de la semana).
- CTA "Generar sugerencias con IA".

### 6. Asistente de IA
Sugerencias organizadas por grupo de alimento: **Carbohidratos, Proteínas, Vegetales, Grasas, Suplementos**. Cada sugerencia es un ítem de checklist con cantidad editable (chip con ✎) y opción "+ Agregar alimento" por grupo (abre sheet: grupo, alimento, cantidad + unidad, motivo opcional). CTA final "Generar vista previa del plan".

### 7. Vista previa del plan / Exportar PDF
Documento con header de marca, nombre del cliente, tabla de comidas con 2 opciones por comida, lista de mercado agrupada por chips de color, notas de suplementos, y pie de página con **nombre y rol del entrenador** (ej. "Daniel Baldivés — Personal Trainer"), generado a partir del perfil del entrenador. Selector de color de acento para el PDF. CTA "Exportar PDF".

### 8. Mi perfil (entrenador)
Nombre, correo, nombre del negocio, logo para PDF (subida de imagen). Estos datos alimentan el pie de página del PDF exportado.

### 9. Suscripción y pagos
Paquete actual con barra de uso (clientes activos / límite del paquete), próximo cobro, método de pago, botón "Subir de paquete".

### 10. Panel Super Admin
Cola de reportes de pago móvil pendientes de validar (nombre, monto, referencia), acciones "Validar" / "Rechazar".

## Notas de alcance
- Fase 1 = vista del entrenador únicamente (no incluye vista del cliente/asesorado en este set de mockups).
- Diseño estático (no interactivo); pensado para iOS y Android por igual, sin chrome de sistema en los mockups.
- Se exploraron 3 direcciones visuales (Navy Pro, Light SaaS, Dark Contrast) y 3 logos (isotipo+wordmark, monograma, símbolo abstracto); esta versión documenta únicamente la dirección elegida (Navy Pro + logo isotipo).
