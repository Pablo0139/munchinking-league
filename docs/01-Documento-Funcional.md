# Documento Funcional

**Proyecto:** Munchinking League Companion

**Versión:** 1.0

**Estado:** En desarrollo

---

# 1. Introducción

## 1.1 Objetivo

Munchinking League Companion es una aplicación web diseñada para complementar la experiencia de juego de la Munchinking League.

La aplicación será la plataforma oficial para gestionar todas las reglas personalizadas de la competición que actualmente se realizan manualmente.

No sustituirá a Biwenger.

Biwenger continuará utilizándose para:

- Mercado
- Plantillas
- Alineaciones
- Puntuaciones
- Clasificación

La aplicación será responsable de gestionar todas las mecánicas adicionales de la liga.

---

## 1.2 Objetivos

Los principales objetivos del proyecto son:

- Centralizar todas las reglas de la liga.
- Facilitar el trabajo del administrador.
- Mejorar la experiencia de los managers.
- Mantener un historial permanente.
- Crear una interfaz moderna y atractiva.
- Permitir futuras ampliaciones.

---

# 2. Usuarios

La aplicación tendrá únicamente dos tipos de usuarios.

## Manager

Cada manager podrá:

- Iniciar sesión.
- Consultar sus cartas.
- Utilizar cartas.
- Consultar el historial.
- Consultar la biblioteca de cartas.
- Consultar eventos.

---

## Administrador

Además de todas las funciones del manager, podrá:

- Crear usuarios.
- Eliminar usuarios.
- Modificar usuarios.
- Repartir cartas.
- Aplicar efectos.
- Resolver acciones pendientes.
- Reiniciar temporadas.
- Configurar el mazo.
- Consultar estadísticas.

---

# 3. Módulos

La aplicación estará dividida en varios módulos independientes.

## Login

Permite autenticar a los usuarios.

Funciones:

- Inicio de sesión.
- Cierre de sesión.
- Recuperación de contraseña (futuro).

---

## Dashboard

Pantalla principal.

Mostrará:

- Cartas disponibles.
- Acciones pendientes.
- Últimos eventos.
- Noticias de la liga.

---

## Mis Cartas

Será el módulo principal de la aplicación.

Permitirá:

- Ver cartas disponibles.
- Consultar información.
- Utilizar cartas.
- Ver restricciones.
- Consultar fecha de obtención.

Cada carta deberá disponer de una representación visual propia.

---

## Biblioteca

Contendrá todas las cartas existentes.

Cada ficha incluirá:

- Nombre.
- Rareza.
- Descripción.
- Reglas.
- Momento de utilización.
- Imagen.
- Copias existentes.

---

## Historial

Registro permanente de todas las acciones realizadas.

Cada entrada almacenará:

- Fecha.
- Usuario.
- Acción.
- Resultado.
- Estado.

El historial nunca será eliminado.

---

## Administración

Panel exclusivo para administradores.

Permitirá gestionar toda la competición.

---

# 4. Sistema de Cartas

El mazo será único para toda la competición.

Cada carta tendrá un número determinado de copias.

Las cartas serán repartidas automáticamente.

Cada manager podrá almacenar un máximo de tres cartas.

Cada lunes se repartirá automáticamente una nueva carta hasta alcanzar dicho límite.

Cuando una carta sea utilizada desaparecerá del inventario del usuario.

Volverá al mazo para poder aparecer nuevamente en futuras jornadas.

---

# 5. Flujo de utilización

El flujo habitual será:

Manager

↓

Accede a la aplicación

↓

Consulta sus cartas

↓

Selecciona una carta

↓

Elige objetivo (si procede)

↓

Confirma la acción

↓

La carta pasa a estado:

Pendiente

↓

El administrador recibe la acción

↓

Aplica el efecto en Biwenger

↓

Marca la acción como:

Aplicada

↓

El historial se actualiza

---

# 6. Estados de una carta

Las cartas podrán encontrarse en los siguientes estados:

Disponible

Carta almacenada por el manager.

---

Pendiente

Carta utilizada.

Esperando la aplicación por parte del administrador.

---

Aplicada

El efecto ha sido ejecutado.

---

Archivada

Carta utilizada e incorporada al historial.

---

# 7. Historial

Todas las acciones deberán quedar registradas.

Ejemplos:

- Obtención de carta.
- Uso de carta.
- Aplicación de carta.
- Cancelación.
- Reparto semanal.
- Acciones administrativas.

El historial deberá permitir filtros por:

- Usuario.
- Fecha.
- Carta.
- Tipo de acción.

---

# 8. Requisitos funcionales

RF-001

El usuario deberá poder iniciar sesión.

RF-002

El usuario deberá poder cerrar sesión.

RF-003

El usuario deberá consultar su inventario.

RF-004

El usuario deberá consultar la biblioteca.

RF-005

El usuario deberá utilizar una carta.

RF-006

El administrador deberá aplicar una carta.

RF-007

El administrador deberá repartir cartas.

RF-008

El sistema deberá mantener un historial permanente.

RF-009

El sistema deberá impedir almacenar más de tres cartas.

RF-010

Cada lunes se repartirá automáticamente una carta a todos los managers que tengan menos de tres.

---

# 9. Requisitos no funcionales

- Compatible con dispositivos móviles.
- Diseño responsive.
- Interfaz moderna.
- Tiempo de carga inferior a dos segundos.
- Preparado para animaciones.
- Preparado para futuras integraciones con Biwenger.

---

# 10. Objetivos de la versión 1.0

La primera versión incluirá:

✅ Login

✅ Dashboard

✅ Inventario de cartas

✅ Biblioteca

✅ Historial

✅ Administración

No incluirá:

❌ Integración automática con Biwenger.

❌ Animaciones.

❌ Notificaciones push.

❌ Tienda.

❌ Logros.

---

# 11. Visión futura

La arquitectura deberá permitir incorporar nuevos módulos sin modificar los existentes.

Algunas funcionalidades previstas son:

- Estadísticas históricas.
- Sistema de logros.
- Perfil de manager.
- Ranking histórico.
- Temporadas.
- Eventos especiales.
- Tienda.
- Integración parcial con Biwenger.
- Notificaciones.
- Aplicación móvil.