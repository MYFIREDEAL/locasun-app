-- Migration: Convertir access_rights.users (PK) → users.user_id (auth UUID)

UPDATE public.users AS u
SET access_rights = jsonb_set(
    u.access_rights,
    '{users}',
    (
        SELECT jsonb_agg(mapped.user_id)
        FROM (
            SELECT 
                (SELECT user_id 
                 FROM public.users 
                 WHERE id::text = old_id::text
                 LIMIT 1) AS user_id
            FROM jsonb_array_elements_text(u.access_rights -> 'users') AS old_id
        ) AS mapped
        WHERE mapped.user_id IS NOT NULL
    )
)
WHERE jsonb_typeof(u.access_rights -> 'users') = 'array';
