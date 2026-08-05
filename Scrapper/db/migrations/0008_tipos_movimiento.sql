-- 0008_tipos_movimiento.sql
-- Amplia los tipos de movimiento permitidos para dar cabida al pago por jornada
-- (se automatizará al final). Los tipos existentes ya cubren:
--   compra_mercado / venta_mercado -> "Operación de mercado"
--   subida_clausula                -> "Blindaje" (subir la cláusula invirtiendo)
--   entrada / salida               -> ajustes y pagos manuales

-- =UP
ALTER TABLE liga.movimientos
    DROP CONSTRAINT IF EXISTS movimientos_tipo_check;

ALTER TABLE liga.movimientos
    ADD CONSTRAINT movimientos_tipo_check
    CHECK (tipo IN
      ('compra_mercado', 'venta_mercado', 'clausula',
       'subida_clausula', 'ajuste', 'entrada', 'salida', 'pago_jornada'));

-- =DOWN
ALTER TABLE liga.movimientos
    DROP CONSTRAINT IF EXISTS movimientos_tipo_check;

ALTER TABLE liga.movimientos
    ADD CONSTRAINT movimientos_tipo_check
    CHECK (tipo IN
      ('compra_mercado', 'venta_mercado', 'clausula',
       'subida_clausula', 'ajuste', 'entrada', 'salida'));