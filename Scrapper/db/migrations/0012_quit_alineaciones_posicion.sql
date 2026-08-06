-- 0012_quitaries.alineaciones_posicion.sql
-- liga_alineaciones.posicion ya no se usa: siempre se guarda 'titular' y no
-- existen suplentes. Se elimina la columna (y el CHECK asociado).

-- =UP
ALTER TABLE liga.liga_alineaciones DROP COLUMN posicion;

-- =DOWN
ALTER TABLE liga.liga_alineaciones
    ADD COLUMN posicion VARCHAR(10) NOT NULL DEFAULT 'titular'
    CHECK (posicion IN ('titular', 'suplente'));