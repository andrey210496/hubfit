-- Fix existing contacts: mark as group if number ends with @g.us
UPDATE public.contacts
SET is_group = true, updated_at = now()
WHERE number LIKE '%@g.us' AND (is_group = false OR is_group IS NULL);

-- Fix existing contacts: ensure individual chats are marked correctly
UPDATE public.contacts
SET is_group = false, updated_at = now()
WHERE number NOT LIKE '%@g.us' AND is_group IS NULL;

-- Fix existing tickets: sync is_group from their associated contact
UPDATE public.tickets t
SET is_group = c.is_group, updated_at = now()
FROM public.contacts c
WHERE t.contact_id = c.id AND t.is_group IS DISTINCT FROM c.is_group;