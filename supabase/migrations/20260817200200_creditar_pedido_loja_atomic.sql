-- Function atômica para creditar aulas de um pedido da loja em student_credits.
-- Substitui o padrão SELECT + soma em memória + UPDATE usado em src/lib/creditos.ts
-- (janela de corrida teórica se dois créditos concorrentes acontecessem para o
-- mesmo aluno). UPDATE ... SET col = col + qtd é atômico no Postgres.
CREATE OR REPLACE FUNCTION public.creditar_pedido_loja(
  p_student_id UUID,
  p_autoescola_id UUID,
  p_qtd_a INTEGER,
  p_qtd_b INTEGER,
  p_qtd_c INTEGER,
  p_qtd_d INTEGER,
  p_qtd_e INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.student_credits (
    student_id, autoescola_id, aulas_cat_a, aulas_cat_b, aulas_cat_c, aulas_cat_d, aulas_cat_e, aulas_disponiveis
  ) VALUES (
    p_student_id, p_autoescola_id, 0, 0, 0, 0, 0, 0
  )
  ON CONFLICT (student_id) DO NOTHING;

  UPDATE public.student_credits
  SET
    aulas_cat_a = aulas_cat_a + p_qtd_a,
    aulas_cat_b = aulas_cat_b + p_qtd_b,
    aulas_cat_c = aulas_cat_c + p_qtd_c,
    aulas_cat_d = aulas_cat_d + p_qtd_d,
    aulas_cat_e = aulas_cat_e + p_qtd_e,
    updated_at = NOW()
  WHERE student_id = p_student_id
    AND autoescola_id = p_autoescola_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.creditar_pedido_loja(UUID, UUID, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER) FROM anon, authenticated;
