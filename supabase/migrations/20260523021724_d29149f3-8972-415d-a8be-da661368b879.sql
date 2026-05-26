INSERT INTO public.products (
  slug, name, tier, description, active, visibility, sort_order,
  daily_message_limit, monthly_token_limit, max_conversations,
  memory_context_size, ai_priority, soft_limit_pct
)
SELECT 'free', 'Free', 'free',
       'Plano gratuito padrão. Aplicado automaticamente a usuários sem assinatura ativa.',
       true, 'internal', 0,
       15, 0, 1000, 0, 0, 80
WHERE NOT EXISTS (
  SELECT 1 FROM public.products WHERE tier = 'free' OR slug = 'free'
);