-- Enable realtime for prospects table
ALTER PUBLICATION supabase_realtime ADD TABLE public.prospects;

-- Ensure old values are included in UPDATE payloads
ALTER TABLE public.prospects REPLICA IDENTITY FULL;
