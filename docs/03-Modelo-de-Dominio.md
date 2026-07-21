# Modelo de Dominio

**Proyecto:** Munchinking League Companion

**Documento:** Modelo de Dominio

**Versión:** 1.0

---

# 1. Objetivo

Este documento define las entidades principales que forman parte del universo de la aplicación.

No representa la base de datos.

Representa el funcionamiento del juego.

---

# 2. Dominio

El dominio principal es la gestión de una competición de managers basada en Biwenger con reglas personalizadas.

La aplicación administra todas las mecánicas adicionales.

---

# 3. Entidades

Las siguientes entidades forman parte del dominio.

- Liga
- Temporada
- Manager
- Carta
- Inventario
- Mazo
- Acción
- Evento
- Historial
- Configuración

---

# 4. Liga

Representa una competición.

Actualmente existirá una única liga.

En el futuro podrán existir varias.

---

## Atributos

- Nombre
- Temporada activa
- Configuración
- Número de managers

---

# 5. Temporada

Representa una edición anual.

Ejemplo:

2025/26

2026/27

2027/28

---

Una temporada contiene:

- Managers
- Cartas
- Historial
- Estadísticas
- Eventos

---

# 6. Manager

Representa a un jugador de la liga.

Puede:

- Obtener cartas
- Utilizar cartas
- Recibir cartas
- Ser objetivo de cartas
- Consultar historial

---

# 7. Carta

La carta representa una regla especial.

Una carta nunca contiene lógica.

La lógica pertenece al sistema.

La carta únicamente describe:

- nombre
- descripción
- rareza
- efecto
- restricciones

---

Ejemplo.

Duplicar puntuación

↓

efecto

double_score

---

# 8. Inventario

Representa las cartas que posee un manager.

Cada carta del inventario posee un estado.

Disponible

Pendiente

Aplicada

Archivada

---

# 9. Mazo

Representa todas las cartas disponibles durante la temporada.

Cada carta puede existir varias veces.

Cuando una carta se reparte desaparece del mazo.

Cuando una carta termina su efecto vuelve al mazo.

---

# 10. Acción

Una acción representa una operación iniciada por un usuario.

Ejemplos.

- Jugar carta.
- Repartir cartas.
- Crear usuario.
- Aplicar efecto.

Una acción puede generar uno o varios eventos.

---

# 11. Evento

Un evento representa algo ocurrido dentro del juego.

Ejemplos.

Pedro roba una carta.

Juan utiliza una carta.

Laura recibe dos millones.

Administrador aplica una carta.

Todos ellos son eventos.

---

# 12. Historial

El historial almacena todos los eventos.

Nunca se elimina información.

Será la fuente oficial de auditoría.

---

# 13. Configuración

Representa todas las reglas de la competición.

Ejemplos.

Número máximo de cartas.

Hora del reparto.

Número de copias.

Temporada.

Modo mantenimiento.

---

# 14. Relaciones

Liga

↓

Temporadas

↓

Managers

↓

Inventario

↓

Cartas

---------------------

Temporada

↓

Eventos

↓

Historial

---------------------

Administrador

↓

Acciones

↓

Eventos

↓

Historial

---

# 15. Estados

Carta

Disponible

↓

Pendiente

↓

Aplicada

↓

Archivada

---

Acción

Creada

↓

Pendiente

↓

Aplicada

↓

Cancelada

---

Temporada

Preparación

↓

Activa

↓

Finalizada

↓

Archivada

---

# 16. Reglas

Toda modificación del sistema deberá generar un evento.

Todo evento deberá almacenarse en el historial.

Toda carta utilizada deberá generar una acción.

Toda acción deberá poder consultarse posteriormente.

---

# 17. Escalabilidad

Este modelo permite incorporar fácilmente.

- Logros
- Eventos especiales
- Misiones
- Recompensas
- Tienda
- Integración con Biwenger
- Estadísticas
- Ranking histórico

Sin modificar las entidades existentes.