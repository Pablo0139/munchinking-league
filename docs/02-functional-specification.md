# Especificación Funcional

| Campo | Valor |
|--------|-------|
| Proyecto | Munchinking League |
| Documento | Especificación Funcional |
| Archivo | `02-functional-specification.md` |
| Versión | 1.0 |
| Estado | DRAFT |
| Última actualización | 23/07/2026 |

---

# 1. Introducción

## 1.1 Objetivo

Munchinking League es una aplicación web diseñada para complementar la experiencia de juego de una liga de Biwenger mediante un sistema de cartas personalizadas.

La aplicación permite a los managers gestionar sus cartas, consultar el historial de juego, conocer el catálogo completo de cartas y facilitar la interacción entre los participantes de la liga.

En esta primera versión, la aplicación no modifica automáticamente la información de Biwenger. La aplicación práctica de los efectos de las cartas será realizada manualmente por el administrador de la liga.

---

## 1.2 Alcance

La aplicación permitirá:

- Autenticación de usuarios.
- Gestión de managers.
- Reparto automático de cartas.
- Consulta de la mano de cartas.
- Juego de cartas.
- Descarte de cartas.
- Consulta del historial.
- Consulta del catálogo de cartas.
- Gestión de notificaciones.
- Funciones de administración.

No forma parte del alcance de esta versión:

- Integración automática con Biwenger.
- Aplicación automática de efectos.
- Notificaciones push.
- Aplicación móvil nativa.

---

## 1.3 Público objetivo

La aplicación está dirigida a los participantes de una liga privada de Munchinking League.

El número previsto de usuarios simultáneos es reducido, entre 8 y 10 managers.

---

# 2. Objetivos funcionales

La aplicación deberá permitir que cualquier manager pueda:

- Consultar las cartas que posee.
- Jugar una carta.
- Descartar una carta.
- Consultar las últimas cartas jugadas.
- Consultar el catálogo completo de cartas.
- Recibir notificaciones.
- Copiar el mensaje de WhatsApp generado al jugar una carta.

El administrador, además, podrá:

- Consultar el historial completo.
- Devolver cartas jugadas a la mano de un manager.
- Gestionar las incidencias derivadas del uso de cartas.

---

# 3. Conceptos del juego

## 3.1 Carta

Una carta representa una acción especial que un manager puede utilizar durante la temporada.

Cada carta posee:

- Nombre.
- Apodo.
- Descripción.
- Rareza.
- Imagen.
- Reglas de uso.

---

## 3.2 Mazo

El mazo es el conjunto de todas las cartas disponibles durante una temporada.

Cada carta puede existir en una o varias copias.

Las copias se reparten aleatoriamente entre los managers.

Las cartas jugadas y descartadas regresan inmediatamente al mazo para poder volver a ser repartidas en el futuro.

---

## 3.3 Mano

La mano representa el conjunto de cartas disponibles para un manager.

Reglas:

- Máximo tres cartas.
- Nunca podrá superarse este límite.
- Las cartas pertenecientes a la mano únicamente pueden ser utilizadas por su propietario.

---

## 3.4 Catálogo

El catálogo muestra todas las cartas existentes en la aplicación.

Su finalidad es exclusivamente informativa.

Desde el catálogo no es posible jugar cartas.

---

## 3.5 Historial

El historial muestra las cartas jugadas durante la temporada.

El historial público únicamente mostrará cartas jugadas.

Las cartas descartadas no aparecerán en el historial público.

---

# 4. Roles

La aplicación define dos roles.

## 4.1 Manager

Es el usuario habitual de la aplicación.

Puede:

- Consultar su mano.
- Jugar cartas.
- Descartar cartas.
- Consultar el historial.
- Consultar el catálogo.
- Consultar sus notificaciones.

---

## 4.2 Administrador

Es un manager con permisos adicionales.

Además de las funciones anteriores puede:

- Consultar el historial completo.
- Consultar cartas descartadas.
- Consultar cartas devueltas.
- Devolver una carta jugada a la mano de un manager.

---

# 5. Flujo general

El funcionamiento habitual de la aplicación será el siguiente.

## 5.1 Inicio de sesión

El usuario accede a la aplicación mediante la pantalla de autenticación.

Una vez autenticado accederá directamente a la pantalla principal.

---

## 5.2 Consulta de la mano

La pantalla principal mostrará las cartas disponibles del manager.

Las cartas aparecerán inicialmente boca abajo.

El usuario podrá mostrarlas u ocultarlas mediante el botón correspondiente.

---

## 5.3 Juego de una carta

El manager selecciona una carta.

La carta pasa al foco de la pantalla mostrando las acciones disponibles.

El usuario pulsa **Jugar**.

La aplicación:

- Registra el movimiento.
- Genera el mensaje para WhatsApp.
- Devuelve inmediatamente la carta al mazo.
- Actualiza el historial público.

La aplicación no enviará automáticamente el mensaje de WhatsApp.

Será el usuario quien lo copie y lo publique en el grupo de la liga.

---

## 5.4 Descarte de una carta

El manager selecciona una carta.

Pulsa **Descartar**.

La aplicación:

- Registra el movimiento.
- Devuelve inmediatamente la carta al mazo.

Las cartas descartadas no aparecerán en el historial público.

---

## 5.5 Devolución de una carta

El administrador podrá devolver una carta previamente jugada.

Al devolver una carta:

- La carta volverá a la mano del manager.
- Se registrará el movimiento correspondiente.
- El historial público no será modificado.
- El historial administrativo conservará el registro de la devolución.

---

## 5.6 Reparto semanal

Cada lunes la aplicación repartirá automáticamente una nueva carta a aquellos managers que tengan menos de tres cartas en la mano.

El reparto será aleatorio.

Cuando un manager reciba una carta:

- Se registrará el movimiento correspondiente.
- Se generará una notificación.
- La aplicación podrá mostrar una animación de apertura de sobre o reparto de carta.

La recepción de cartas no aparecerá en el historial público.
# 6. Pantallas

La aplicación estará compuesta por seis pantallas principales.

Todas compartirán:

- Barra inferior de navegación.
- Diseño Mobile First.
- Identidad visual común.
- Transiciones suaves entre pantallas.

---

## 6.1 Login

Es la pantalla de acceso a la aplicación.

### Objetivos

- Autenticar al usuario.
- Mantener la sesión iniciada.
- Redirigir automáticamente a la pantalla principal.

### Elementos

- Logotipo de Munchinking League.
- Campo Usuario.
- Campo Contraseña.
- Botón "Iniciar sesión".

Si la sesión sigue siendo válida, esta pantalla no se mostrará.

---

## 6.2 Pantalla Principal

Es la pantalla más importante de toda la aplicación.

Su objetivo es permitir al manager consultar y jugar sus cartas.

### Distribución

De arriba hacia abajo.

#### Barra superior

Contendrá:

- Logo de la liga.
- Icono de notificaciones.
- Contador de notificaciones pendientes.

Cuando existan más de nueve notificaciones pendientes se mostrará:

```text
9+
```

Al pulsar el icono se accederá a la pantalla de Notificaciones.

---

#### Mano de cartas

Es el elemento protagonista de la aplicación.

Las cartas ocuparán la mayor parte de la pantalla.

Características:

- Disposición en abanico.
- Adaptación automática al número de cartas.
- Tamaño grande.
- Animación de apertura.

Inicialmente todas aparecerán boca abajo.

En la esquina superior derecha aparecerá un botón con forma de ojo.

Este botón permitirá:

- Mostrar todas las cartas.
- Ocultar todas las cartas.

El estado permanecerá mientras el usuario permanezca en la pantalla.

---

#### Selección de carta

Al pulsar una carta:

- Pasará al primer plano.
- Se ampliará mediante una animación.
- El resto de cartas quedarán ligeramente atenuadas.

La carta mostrará dos acciones.

- Jugar.
- Descartar.

No existirán más acciones disponibles.

---

#### Historial público

Debajo de la mano aparecerá un carrusel horizontal.

Mostrará únicamente las últimas cartas jugadas.

Nunca aparecerán:

- Cartas repartidas.
- Cartas descartadas.
- Cartas devueltas.

Cada elemento mostrará:

- Carta.
- Manager.
- Fecha.

Al pulsar un elemento podrá visualizarse su detalle.

---

#### Navegación inferior

Siempre permanecerá visible.

Será común a toda la aplicación.

Dispondrá de cinco accesos.

- Inicio.
- Historial.
- Biblioteca.
- Perfil.
- Administración (solo administradores).

---

## 6.3 Historial

Permite consultar las cartas jugadas durante la temporada.

### Vista de Manager

Mostrará:

- Cartas jugadas.
- Orden cronológico inverso.

No mostrará:

- Cartas descartadas.
- Cartas repartidas.

---

### Vista de Administrador

Además del historial público podrá consultar:

- Cartas descartadas.
- Cartas devueltas.

Dispondrá de filtros para facilitar la búsqueda.

---

## 6.4 Biblioteca

La Biblioteca muestra todas las cartas existentes.

Su objetivo es que cualquier manager pueda conocer el funcionamiento de todas las cartas.

Cada carta mostrará:

- Imagen.
- Nombre.
- Apodo.
- Rareza.
- Descripción.
- Número de copias existentes.

No será posible jugar cartas desde esta pantalla.

---

## 6.5 Notificaciones

Muestra todas las notificaciones personales del manager.

Las notificaciones aparecerán ordenadas por fecha.

Cada una podrá encontrarse en dos estados.

- Leída.
- No leída.

Al abrir una notificación pasará automáticamente a estado leída.

---

## 6.6 Perfil

Permite consultar la información personal del manager.

Mostrará:

- Nombre.
- Avatar.
- Rol.
- Número de cartas jugadas.
- Número de cartas descartadas.

También permitirá cerrar la sesión.

---

## 6.7 Administración

Pantalla únicamente disponible para administradores.

Permitirá:

- Consultar historial completo.
- Consultar cartas descartadas.
- Consultar cartas devueltas.
- Devolver cartas a la mano de un manager.

La devolución de una carta generará automáticamente un nuevo movimiento.

No eliminará los movimientos anteriores.

---

# 7. Casos de uso

## CU-01 Iniciar sesión

Actor:

- Manager.

Resultado esperado:

El usuario accede a la aplicación.

---

## CU-02 Consultar mano

Actor:

- Manager.

Resultado esperado:

Visualiza las cartas disponibles para jugar.

---

## CU-03 Mostrar cartas

Actor:

- Manager.

Resultado esperado:

Las cartas pasan de ocultas a visibles.

---

## CU-04 Ocultar cartas

Actor:

- Manager.

Resultado esperado:

Las cartas vuelven a mostrarse boca abajo.

---

## CU-05 Seleccionar carta

Actor:

- Manager.

Resultado esperado:

La carta se amplía y muestra las acciones disponibles.

---

## CU-06 Jugar carta

Actor:

- Manager.

Resultado esperado:

La carta:

- Se registra como jugada.
- Genera el mensaje para WhatsApp.
- Regresa al mazo.
- Aparece en el historial público.

---

## CU-07 Descartar carta

Actor:

- Manager.

Resultado esperado:

La carta:

- Se registra como descartada.
- Regresa al mazo.
- No aparece en el historial público.

---

## CU-08 Consultar Biblioteca

Actor:

- Manager.

Resultado esperado:

Consulta toda la colección de cartas disponibles.

---

## CU-09 Consultar Notificaciones

Actor:

- Manager.

Resultado esperado:

Consulta sus notificaciones personales.

---

## CU-10 Devolver carta

Actor:

- Administrador.

Resultado esperado:

La carta vuelve a la mano del manager.

El sistema registra el movimiento correspondiente.
# 8. Reglas funcionales

Las siguientes reglas definen el funcionamiento del juego durante una temporada.

---

## 8.1 Temporada activa

Solo podrá existir una temporada activa por liga.

Todas las operaciones realizadas por los managers pertenecerán siempre a la temporada activa.

Las temporadas finalizadas permanecerán disponibles únicamente para consulta.

---

## 8.2 Mano de cartas

Cada manager podrá tener un máximo de tres cartas en su mano.

El sistema nunca repartirá una carta que haga superar este límite.

No existe un número mínimo de cartas.

---

## 8.3 Reparto semanal

Cada lunes se realizará automáticamente un reparto de cartas.

Cada manager recibirá una única carta siempre que tenga menos de tres cartas en su mano.

Las cartas se repartirán aleatoriamente desde el mazo.

La recepción de cartas generará una notificación personal.

---

## 8.4 Juego de cartas

Un manager únicamente podrá jugar cartas que se encuentren en su mano.

Al jugar una carta:

- Se registrará el movimiento correspondiente.
- Se generará el mensaje para WhatsApp.
- La carta abandonará la mano del manager.
- La carta volverá inmediatamente al mazo.
- El historial público se actualizará automáticamente.

No existirá ningún estado intermedio de validación.

---

## 8.5 Descarte de cartas

Un manager podrá descartar cualquier carta de su mano.

Al descartar una carta:

- Se registrará el movimiento correspondiente.
- La carta volverá inmediatamente al mazo.

Las cartas descartadas no aparecerán en el historial público.

---

## 8.6 Devolución de cartas

Un administrador podrá devolver una carta previamente jugada.

Al devolver una carta:

- La carta volverá a la mano del manager.
- Se registrará el movimiento correspondiente.
- El historial conservará todos los movimientos anteriores.

La devolución nunca eliminará información histórica.

---

## 8.7 Cartas repetidas

Un manager podrá poseer varias copias de una misma carta.

Cada copia será independiente del resto.

---

## 8.8 Propiedad de las cartas

Cada carta pertenece únicamente a un manager mientras permanezca en su mano.

Una vez jugada o descartada dejará de pertenecer al manager y volverá al mazo.

---

# 9. Reglas de administración

La administración permite corregir incidencias ocurridas durante la temporada.

Todas las operaciones administrativas quedarán registradas.

---

## 9.1 Permisos

Solo los administradores podrán acceder al panel de administración.

---

## 9.2 Devolver carta

El administrador podrá devolver una carta jugada a la mano del manager.

Esta operación no eliminará ningún movimiento previo.

---

## 9.3 Consulta del historial

El administrador podrá consultar:

- Cartas jugadas.
- Cartas descartadas.
- Cartas devueltas.

---

## 9.4 Auditoría

Todas las operaciones realizadas por un administrador quedarán registradas en el historial administrativo.

---

# 10. Reglas de notificaciones

Las notificaciones informan al manager de los eventos ocurridos durante la temporada.

Las notificaciones son siempre personales.

---

## 10.1 Eventos que generan notificaciones

Generarán una notificación:

- Recepción de una nueva carta.
- Devolución de una carta.
- Mensaje enviado por el administrador.

---

## 10.2 Lectura

Una notificación pasará automáticamente a estado leída cuando el manager la abra.

---

## 10.3 Contador

El icono de notificaciones mostrará el número de notificaciones no leídas.

Cuando el número supere nueve se mostrará:

```text
9+
```

---

# 11. Reglas del mazo

El mazo contiene todas las copias de cartas disponibles durante una temporada.

Las cartas nunca desaparecen del sistema.

---

## 11.1 Inicio de temporada

Al comenzar una temporada todas las cartas estarán disponibles en el mazo.

---

## 11.2 Reparto

Cuando una carta sea repartida:

- Saldrá temporalmente del mazo.
- Pasará a la mano del manager.

---

## 11.3 Carta jugada

Cuando una carta sea jugada:

- Saldrá de la mano.
- Volverá inmediatamente al mazo.

---

## 11.4 Carta descartada

Cuando una carta sea descartada:

- Saldrá de la mano.
- Volverá inmediatamente al mazo.

---

## 11.5 Carta devuelta

Cuando un administrador devuelva una carta:

- Saldrá del mazo.
- Volverá directamente a la mano del manager.

---

# 12. Reglas de movimientos

Toda modificación realizada sobre una carta generará un movimiento.

Los movimientos forman el registro histórico del sistema.

---

## 12.1 Tipos de movimiento

Los movimientos permitidos son:

- Reparto.
- Juego.
- Descarte.
- Devolución.

---

## 12.2 Inmutabilidad

Los movimientos nunca podrán modificarse.

Tampoco podrán eliminarse.

---

## 12.3 Orden cronológico

Todos los movimientos quedarán registrados según su fecha y hora.

---

## 12.4 Historial

El historial de la aplicación se construirá a partir de los movimientos registrados.

No existirá un historial independiente.
# 13. Mensajes de WhatsApp

Cuando un manager juegue una carta, la aplicación generará automáticamente un mensaje con el formato adecuado para ser compartido en el grupo de WhatsApp de la liga.

La aplicación no enviará mensajes automáticamente.

El manager deberá copiar el mensaje y publicarlo manualmente.

---

## 13.1 Objetivo

El mensaje tiene como finalidad informar al resto de managers de que una carta ha sido jugada y facilitar la aplicación manual de su efecto.

---

## 13.2 Generación

Cada tipo de carta dispondrá de una plantilla de mensaje.

La aplicación sustituirá automáticamente las variables necesarias, como:

- Manager que juega la carta.
- Nombre de la carta.
- Apodo de la carta.
- Manager objetivo, cuando exista.
- Texto descriptivo del efecto.

---

## 13.3 Copiado

Tras jugar una carta se mostrará un botón:

**Copiar mensaje**

Al pulsarlo, el texto se copiará al portapapeles del dispositivo.

---

## 13.4 Edición

Los mensajes generados no podrán modificarse desde la aplicación.

El manager podrá editarlos manualmente antes de enviarlos mediante WhatsApp.

---

# 14. Casos excepcionales

La aplicación deberá gestionar correctamente las siguientes situaciones.

---

## 14.1 Mano completa

Si un manager ya dispone de tres cartas en su mano, no recibirá nuevas cartas durante el reparto semanal.

---

## 14.2 Carta inexistente

No será posible jugar ni descartar una carta que no pertenezca a la mano del manager.

La aplicación mostrará un mensaje de error.

---

## 14.3 Carta ya utilizada

Una carta no podrá jugarse dos veces sin haber sido repartida nuevamente.

---

## 14.4 Acceso sin permisos

Un manager no podrá acceder a las funciones de administración.

La aplicación redirigirá automáticamente a la pantalla principal.

---

## 14.5 Sesión expirada

Si la sesión deja de ser válida:

- Se solicitará nuevamente el inicio de sesión.
- No se perderá información registrada previamente.

---

# 15. Restricciones

La primera versión de Munchinking League tendrá las siguientes restricciones.

- Solo existirá una liga.
- Solo existirá una temporada activa.
- La aplicación de los efectos será manual.
- La comunicación con los managers se realizará mediante WhatsApp.
- No existirá integración automática con Biwenger.
- No existirán notificaciones push.
- No existirá modo sin conexión.

Estas restricciones podrán eliminarse en futuras versiones.

---

# 16. Requisitos no funcionales

La aplicación deberá cumplir los siguientes requisitos de calidad.

---

## 16.1 Rendimiento

La navegación deberá ser fluida incluso en dispositivos móviles de gama media.

---

## 16.2 Disponibilidad

La aplicación estará disponible mediante navegador web sin necesidad de instalación.

---

## 16.3 Responsive

Toda la interfaz estará diseñada siguiendo un enfoque **Mobile First**.

También será completamente funcional en escritorio.

---

## 16.4 Usabilidad

Las acciones más frecuentes deberán poder realizarse con el menor número posible de pulsaciones.

Las animaciones nunca deberán dificultar la interacción del usuario.

---

## 16.5 Accesibilidad

La interfaz deberá mantener un contraste adecuado y un tamaño de texto legible.

Los elementos interactivos deberán disponer de áreas táctiles suficientes para facilitar su uso en dispositivos móviles.

---

# 17. Roadmap funcional

La evolución funcional prevista para la aplicación será la siguiente.

## MVP

- Autenticación.
- Gestión de cartas.
- Reparto semanal.
- Historial.
- Biblioteca.
- Administración.
- Notificaciones.
- Generación de mensajes para WhatsApp.

---

## Versión 2

- Integración con Biwenger.
- Aplicación automática de efectos.
- Sincronización de managers.
- Sincronización de jornadas.

---

## Versiones futuras

- Múltiples ligas.
- Múltiples temporadas históricas.
- Logros.
- Estadísticas avanzadas.
- Aplicación móvil.
- Notificaciones push.

---

# 18. Historial de cambios

| Versión | Descripción |
|----------|-------------|
| 1.0 | Primera versión de la especificación funcional del MVP de Munchinking League. |