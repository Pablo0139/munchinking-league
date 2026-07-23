# Documento Funcional

| Campo | Valor |
|--------|-------|
| Proyecto | Munchinking League |
| Documento | Documento Funcional |
| Versión | 1.1 |
| Estado | Aprobado |
| Última actualización | 23/07/2026 |

---

# 1. Objetivo

Munchinking League es una aplicación web diseñada para complementar la experiencia de una liga privada de Biwenger mediante un sistema de Cartas Personalizadas.

La aplicación actúa como el registro oficial de las cartas de la liga, permitiendo a los managers consultar su mano, jugar cartas, generar automáticamente los mensajes para comunicar las acciones por WhatsApp y mantener un historial completo de toda la temporada.

La aplicación **no sustituye Biwenger**, sino que centraliza toda la gestión relacionada con las cartas y sirve como herramienta de apoyo para el administrador de la liga.

---

# 2. Objetivos funcionales

La aplicación permitirá:

- Gestionar el reparto semanal de cartas.
- Consultar la mano de cartas de cada manager.
- Jugar cartas.
- Descartar cartas.
- Consultar el catálogo completo de cartas.
- Registrar todas las acciones realizadas.
- Generar automáticamente mensajes para WhatsApp.
- Facilitar la gestión administrativa de la liga.
- Conservar el histórico de temporadas anteriores.

---

# 3. Reglas de negocio

## Liga

La aplicación está preparada para soportar múltiples ligas.

En la versión 1.0 únicamente existirá una liga.

Toda la información pertenecerá siempre a una única liga.

---

## Temporadas

La aplicación permitirá almacenar múltiples temporadas.

Sin embargo:

**Solo podrá existir una temporada activa.**

Todas las operaciones realizadas por los managers se ejecutarán siempre sobre la temporada activa.

Las temporadas finalizadas permanecerán en modo consulta.

---

# 4. Roles

## Manager

Puede:

- Iniciar sesión.
- Consultar sus cartas.
- Mostrar u ocultar sus cartas.
- Jugar cartas.
- Descartar cartas.
- Consultar la biblioteca.
- Consultar el historial público.
- Consultar su historial personal.
- Recibir notificaciones.

---

## Administrador

Además de todas las funciones del Manager:

- Consultar todas las acciones.
- Validar cartas jugadas.
- Devolver cartas mal jugadas.
- Consultar el historial administrativo.
- Gestionar el reparto semanal.
- Enviar notificaciones.

---

# 5. Pantallas principales

## Login

Permite acceder a la aplicación.

---

## Inicio

Pantalla principal.

Contiene:

- Notificaciones.
- Avatar.
- Mano de cartas.
- Historial público.
- Menú inferior.

---

## Biblioteca

Catálogo completo de cartas.

---

## Historial

Dependiendo del usuario mostrará:

- Público.
- Personal.
- Administrativo.

---

## Perfil

Información del manager.

---

## Administración

Funciones exclusivas para administradores.

---

# 6. Pantalla principal

La Home gira completamente alrededor de las cartas.

## Distribución

### Cabecera

- Botón de notificaciones.
- Avatar.

### Zona principal

- Mano de cartas en abanico.

### Zona inferior

Historial público en scroll horizontal.

### Pie

Menú inferior fijo.

Este menú estará presente en todas las pantallas.

---

# 7. Mano de cartas

La mano constituye el elemento principal de la aplicación.

## Características

- Cartas en abanico.
- Apertura automática según el número de cartas.
- Máximo de tres cartas.
- Cartas inicialmente boca abajo.
- Botón con icono de ojo para mostrar u ocultar.
- El estado de visibilidad se mantiene durante la sesión.

---

## Selección

Al pulsar una carta:

- Se sitúa en primer plano.
- Aumenta de tamaño.
- Se muestran sus datos.
- Aparecen las acciones disponibles.

Acciones:

- Jugar.
- Descartar.
- Cerrar.

---

# 8. Jugar una carta

Flujo:

1. Seleccionar carta.
2. Pulsar "Jugar".
3. Elegir objetivo (si procede).
4. Confirmar.

La aplicación:

- Registra la acción.
- Cambia el estado de la carta a **Jugada**.
- Genera automáticamente un mensaje para WhatsApp.
- Permite copiar dicho mensaje al portapapeles.

El usuario será responsable de enviarlo al grupo oficial de WhatsApp.

---

## Objetivos

Dependiendo de la carta podrán seleccionarse:

- Ningún objetivo.
- Un manager.
- Un jugador.

---

# 9. Descartar una carta

Flujo:

1. Seleccionar carta.
2. Pulsar "Descartar".
3. Confirmar.

La carta:

- Desaparece de la mano.
- Cambia al estado **Descartada**.

No aparecerá en el historial público.

---

# 10. Mensajes para WhatsApp

Cada carta dispondrá de una plantilla de mensaje.

La aplicación sustituirá automáticamente las variables correspondientes.

Ejemplo:

- Manager.
- Carta.
- Objetivo.
- Acción.

El mensaje podrá copiarse directamente.

La aplicación nunca enviará mensajes automáticamente.

---

# 11. Historial

## Historial público

Visible para todos los managers.

Mostrará únicamente cartas jugadas.

No mostrará:

- Cartas recibidas.
- Cartas descartadas.
- Cartas devueltas.
- Acciones administrativas.

La visualización será mediante desplazamiento horizontal.

---

## Historial personal

Visible únicamente para cada manager.

Mostrará:

- Cartas recibidas.
- Cartas jugadas.
- Cartas descartadas.
- Cartas devueltas.
- Estado de cada carta.

Será un registro completo de todas las acciones del usuario.
## Historial administrativo

Visible únicamente para los administradores.

Mostrará:

- Todas las cartas jugadas.
- Todas las cartas descartadas.
- Todas las cartas devueltas.
- Todas las cartas validadas.

Permitirá localizar rápidamente cualquier acción realizada durante la temporada.

---

# 12. Biblioteca

La biblioteca contendrá el catálogo completo de cartas disponibles en la liga.

Cada carta mostrará:

- Imagen.
- Nombre.
- Apodo.
- Rareza.
- Descripción.
- Reglas de uso.
- Número de copias existentes en el mazo.

## Funciones

La biblioteca permitirá:

- Buscar cartas.
- Filtrar por rareza.
- Consultar la descripción.
- Consultar las reglas de uso.

No será posible jugar cartas desde esta pantalla.

---

# 13. Notificaciones

La aplicación dispondrá de un centro de notificaciones accesible desde cualquier pantalla mediante un icono situado en la esquina superior izquierda.

El icono mostrará un contador con el número de notificaciones pendientes, hasta un máximo visual de **9+**.

## Tipos de notificaciones

- Nueva carta recibida.
- Carta validada.
- Carta devuelta.
- Aviso del administrador.

---

## Reparto semanal

Cada lunes, todos los managers que tengan menos de tres cartas en mano recibirán automáticamente una nueva carta.

El reparto generará una notificación.

Al abrir dicha notificación se reproducirá una animación donde el usuario descubrirá visualmente la nueva carta.

Una vez finalizada la animación, la carta pasará automáticamente a la mano del manager.

El reparto semanal no aparecerá en el historial público.

---

# 14. Administración

Los administradores dispondrán de un panel específico para gestionar la temporada.

## Funciones

- Consultar acciones jugadas.
- Consultar acciones descartadas.
- Consultar acciones validadas.
- Consultar acciones devueltas.
- Validar cartas.
- Devolver cartas mal jugadas.
- Consultar el historial completo de la temporada.

Cuando una carta sea devuelta:

- Desaparecerá del historial de cartas jugadas.
- Volverá automáticamente a la mano del manager.
- El manager recibirá una notificación.

La aplicación del efecto correspondiente sobre Biwenger continuará realizándose manualmente.

---

# 15. Estados de una carta

Cada copia física de una carta podrá encontrarse en uno de los siguientes estados:

- En el mazo.
- En mano.
- Jugada.
- Validada.
- Devuelta.
- Descartada.

Todos los cambios de estado quedarán registrados permanentemente en el historial de la temporada.

---

# 16. Reparto de cartas

Las cartas pertenecen siempre al mazo de la temporada activa.

Cada copia física es única.

Cuando un manager recibe una carta:

1. Se extrae una copia física del mazo.
2. Se asigna al manager.
3. Se registra la acción.
4. Se genera una notificación.

Cuando una carta deja de estar disponible (por jugarse o descartarse), volverá al mazo siguiendo las reglas definidas para la temporada.

---

# 17. Validación de cartas

La aplicación no comprobará automáticamente si una carta ha sido jugada en el momento correcto respecto a la jornada de Biwenger.

La validez de una jugada será responsabilidad del administrador de la liga.

En caso de detectar una jugada incorrecta, el administrador podrá devolver la carta al manager correspondiente.

---

# 18. Integración con Biwenger

La versión 1.0 de Munchinking League no realizará modificaciones automáticas sobre Biwenger.

La aplicación actuará como:

- Registro oficial de cartas.
- Generador de mensajes para WhatsApp.
- Historial oficial de la temporada.

La arquitectura quedará preparada para una futura integración con la API oficial de Biwenger en caso de que sea posible.

---

# 19. Requisitos no funcionales

La aplicación deberá cumplir los siguientes requisitos:

## Experiencia de usuario

- Optimizada para dispositivos móviles.
- Responsive.
- Navegación intuitiva.
- Interfaz clara y visual.
- Preparada para futuras animaciones.

## Rendimiento

- Tiempo de carga reducido.
- Respuesta inmediata en las acciones habituales.
- Consumo mínimo de recursos.

## Seguridad

- Acceso autenticado.
- Gestión de permisos según el rol.
- Protección frente a acciones no autorizadas.

## Escalabilidad

La arquitectura deberá permitir:

- Añadir nuevas cartas.
- Añadir nuevas temporadas.
- Gestionar múltiples ligas en el futuro.
- Integrarse con servicios externos sin modificar el modelo principal.

---

# 20. Alcance del MVP

La versión 1.0 incluirá:

- Inicio de sesión.
- Gestión de managers.
- Mano de cartas.
- Biblioteca.
- Historial público.
- Historial personal.
- Notificaciones.
- Reparto semanal.
- Administración.
- Generación de mensajes para WhatsApp.

Quedan fuera del MVP:

- Integración automática con Biwenger.
- Validación automática según jornadas.
- Aplicación automática de efectos.
- Sonidos.
- Logros.
- Estadísticas avanzadas.
- Eventos especiales.
- Chat entre managers.

---

# 21. Historial de cambios

| Versión | Descripción |
|----------|-------------|
| 1.0 | Documento funcional inicial. |
| 1.1 | Actualización completa del MVP, incorporación del sistema de temporadas, mano de cartas en abanico, historial personal, flujo de WhatsApp, reparto semanal, administración y preparación para múltiples ligas. |