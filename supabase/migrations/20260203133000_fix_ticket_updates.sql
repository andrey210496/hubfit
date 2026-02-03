-- Function to update ticket details when a new message is inserted
CREATE OR REPLACE FUNCTION public.update_ticket_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Update existing open/pending ticket
    -- We assume there is only one open/pending ticket per contact at a time
    UPDATE public.tickets
    SET
        last_message = NEW.body,
        updated_at = NOW(),
        -- Increment unread count if message is incoming (from_me = false)
        -- Reset to 0 if message is outgoing (from_me = true)
        unread_messages = CASE
            WHEN NEW.from_me = FALSE THEN unread_messages + 1
            ELSE 0
        END
    WHERE contact_id = NEW.contact_id
      AND status IN ('open', 'pending');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove existing trigger if it exists (to ensure clean slate or update)
DROP TRIGGER IF EXISTS update_ticket_on_message_trigger ON public.messages;

-- Create the trigger
CREATE TRIGGER update_ticket_on_message_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_ticket_on_new_message();
