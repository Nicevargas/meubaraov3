ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.user_daily_usage REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_daily_usage;