# Mus: contrato para integrar la jugada y el descarte

Aplicar la migración `0003_mus_obligation.sql` antes de servir `manager.getHand` o conectar las mutaciones. No se reconstruyen obligaciones históricas: el historial de jugadas no basta para reconstruir las manos que había entonces.

Importar de `../services/mus` desde el router. Para `cards.play` usar `action = 'PLAYED'`; para `cards.discard`, `'DISCARDED'`. Usar el mismo protocolo para todas las cartas, no solo para el slug `mus`.

1. `musActionPredicate(action: 'PLAYED' | 'DISCARDED'): string`. Añadir `AND ${musActionPredicate(action)}` al `WHERE` del `UPDATE card_copy` **sin alias**. Mantener los filtros de copia, temporada, mano y propietario. No añade binds. El descarte compara la rareza con la mano actual dentro de ese mismo `UPDATE`: el empate es válido.
2. Inmediatamente después del `UPDATE`, mantener el `INSERT INTO card_movement … SELECT … WHERE changes() = 1`, con un ID de movimiento nuevo por intento. No intercalar sentencias.
3. `musAfterMovement(db: D1Database, action: 'PLAYED' | 'DISCARDED', movementId: string): D1PreparedStatement`. Añadir **una** sentencia (`musAfterMovement(ctx.env.DB, action, result.movement.id)`, sin spread ni `.bind`) inmediatamente después del `INSERT` en el **mismo** `db.batch`. Su único bind, ya aplicado, es el ID del movimiento. No ejecutarla aparte. Otras escrituras posteriores no deben usar `changes()` para identificar el movimiento: comprobar su ID.
4. Verificar los resultados 0 y 1 como hasta ahora. El resultado 2 **puede afectar cero filas en una operación válida**. Un fallo SQL revierte el lote. Un `UPDATE` de cero filas no genera movimiento ni efectos. Para los mensajes, no atribuir cualquier conflicto a Mus: también puede haber cambiado la titularidad. Refrescar la mano tras éxito o conflicto; no mostrar datos de terceros. La comprobación de interfaz nunca reemplaza al predicado.

`musStatusStatement(db: D1Database, managerId: string, seasonId: string): D1PreparedStatement` devuelve una fila `{ required: 0 | 1 }`. `manager.getHand` ya lo consulta para la cuenta autenticada y expone `musDiscardRequired: boolean`. El aviso de mano ya existe; la hoja de carta puede consumir ese indicador para desactivar jugar y permitir descartar solo el rango máximo. Los helpers no cambian el payload: en jugadas nuevas enviar `choices: {}, rulesConfirmed: true` además de la copia y elecciones aplicables; mantener el formato anterior en jugadas legacy.

## Decisiones de regla

- Página física 21 del PDF (folio impreso 20): el actor queda exento; el destinatario con mano vacía al jugar Mus no adquiere un bloqueo al recibir cartas después. Solo se registran destinatarios de la liga de la temporada y con alguna copia en esa temporada. No se mueve ninguna carta ajena.
- La rareza se evalúa al descartar: épica > rara > común. En datos legacy que conserven `LEGENDARY` se respeta su posición por encima de épica, sin introducir ese rango en el catálogo oficial.
- La regla exige al menos un descarte antes de volver a jugar, no un contador de deuda. Se conserva el origen de cada Mus, pero **un único descarte válido satisface todos los orígenes anteriores** del mánager en la temporada. Un Mus posterior crea una obligación nueva.
- La devolución administrativa `RETURNED` ligada al `PLAYED` desactiva inmediatamente ese origen tanto en la guarda como en la mano. No anula otros Mus ni deshace descartes ya efectuados. No requiere modificar el router administrativo.