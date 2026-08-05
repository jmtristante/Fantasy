-- 0007_plantilla_cerrada.sql
-- Indica si la plantilla inicial de la liga ya está cerrada. Mientras esté
-- abierta, el admin puede asignar/quitar jugadores a mano (draft). Al cerrarla,
-- solo se podrán hacer cambios mediante movimientos (compras/ventas).

-- =UP
ALTER TABLE liga.ligas
    ADD COLUMN IF NOT EXISTS plantilla_cerrada BOOLEAN NOT NULL DEFAULT false;

-- =DOWN
ALTER TABLE liga.ligas
    DROP COLUMN IF EXISTS plantilla_cerrada;