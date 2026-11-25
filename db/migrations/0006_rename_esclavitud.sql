-- Corrige la grafía de la carta T26/27 «Esclavitud» conservando copias, manos e historial.
-- Los identificadores del catálogo se derivan del slug (db/seed/catalog.sql.ts): se reasignan
-- a los del nuevo slug para que el SQL de catálogo siga siendo idempotente.
PRAGMA defer_foreign_keys = ON;

UPDATE card_definition
SET id = '350e6275-95a8-44c4-81fe-c5caf0373fc2', slug = 'esclavitud', name = 'Esclavitud',
    whatsapp_template = replace(whatsapp_template, 'Exclavitud', 'Esclavitud')
WHERE id = '575fa6fb-79b9-45fb-8588-761290adacdd' AND slug = 'exclavitud';

UPDATE card_copy SET card_definition_id = '350e6275-95a8-44c4-81fe-c5caf0373fc2'
WHERE card_definition_id = '575fa6fb-79b9-45fb-8588-761290adacdd';

UPDATE card_movement SET card_copy_id = 'aceee8b0-1528-46e3-8862-51eb766e7fe0' WHERE card_copy_id = '70088af1-678e-454f-8a51-91b86addfe5f';
UPDATE card_copy SET id = 'aceee8b0-1528-46e3-8862-51eb766e7fe0' WHERE id = '70088af1-678e-454f-8a51-91b86addfe5f';
UPDATE card_movement SET card_copy_id = 'a6684348-0222-4b0c-8a29-7e3561baa6df' WHERE card_copy_id = 'c76381d3-3c0f-415a-87d5-73a4d6028aff';
UPDATE card_copy SET id = 'a6684348-0222-4b0c-8a29-7e3561baa6df' WHERE id = 'c76381d3-3c0f-415a-87d5-73a4d6028aff';

UPDATE card_play_effect SET effective_slug = 'esclavitud' WHERE effective_slug = 'exclavitud';
UPDATE card_movement SET whatsapp_message = replace(whatsapp_message, 'Exclavitud', 'Esclavitud') WHERE instr(whatsapp_message, 'Exclavitud') > 0;
UPDATE card_movement SET notes = replace(notes, 'Exclavitud', 'Esclavitud') WHERE instr(notes, 'Exclavitud') > 0;
UPDATE notification SET title = replace(title, 'Exclavitud', 'Esclavitud') WHERE instr(title, 'Exclavitud') > 0;
UPDATE notification SET message = replace(message, 'Exclavitud', 'Esclavitud') WHERE instr(message, 'Exclavitud') > 0;
