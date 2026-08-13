-- 0024_rpc_vuelve_a_liga.sql
-- La RPC debe vivir en el esquema liga (es logica interna de la liga, no
-- publica). El cliente la invoca con supabase.schema("liga").rpc(...), que
-- envia la cabecera Content-Profile: liga y hace que PostgREST resuelva la
-- funcion en el esquema correcto. Se deshace el cambio de la migracion 0023.

-- =UP
DROP FUNCTION IF EXISTS public.registrar_operacion_mercado(bigint, timestamptz, bigint, bigint, integer, numeric, text, text);

CREATE OR REPLACE FUNCTION liga.registrar_operacion_mercado(
  p_liga_id bigint,
  p_fecha timestamptz,
  p_comprador bigint,
  p_vendedor bigint,
  p_jugador_id integer,
  p_precio numeric,
  p_nota_compra text,
  p_nota_venta text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = liga, public
AS $$
DECLARE
  v_comprador bigint := NULLIF(p_comprador, 0);
  v_vendedor bigint := NULLIF(p_vendedor, 0);
BEGIN
  IF NOT liga.accede_a_liga(p_liga_id) THEN
    RAISE EXCEPTION 'No tienes acceso a esta liga';
  END IF;

  IF v_comprador IS NOT NULL THEN
    INSERT INTO liga.movimientos (liga_id, fecha, miembro_id, tipo, jugador_id, importe, contraparte, nota)
    VALUES (p_liga_id, p_fecha, v_comprador, 'compra_mercado', p_jugador_id, -p_precio, v_vendedor, p_nota_compra);
  END IF;

  IF v_vendedor IS NOT NULL THEN
    INSERT INTO liga.movimientos (liga_id, fecha, miembro_id, tipo, jugador_id, importe, contraparte, nota)
    VALUES (p_liga_id, p_fecha, v_vendedor, 'venta_mercado', p_jugador_id, p_precio, v_comprador, p_nota_venta);
    DELETE FROM liga.plantillas p WHERE p.liga_id = p_liga_id AND p.jugador_id = p_jugador_id;
  END IF;

  IF v_comprador IS NOT NULL THEN
    INSERT INTO liga.plantillas (liga_id, miembro_id, jugador_id)
    VALUES (p_liga_id, v_comprador, p_jugador_id);
    INSERT INTO liga.clausulas_historial (liga_id, jugador_id, miembro_id, valor, motivo)
    VALUES (p_liga_id, p_jugador_id, v_comprador, p_precio, 'compra_mercado');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION liga.registrar_operacion_mercado(bigint, timestamptz, bigint, bigint, integer, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION liga.registrar_operacion_mercado(bigint, timestamptz, bigint, bigint, integer, numeric, text, text) TO authenticated;

-- =DOWN
DROP FUNCTION IF EXISTS liga.registrar_operacion_mercado(bigint, timestamptz, bigint, bigint, integer, numeric, text, text);
