-- Add policy for public read of active announcements (for login page display)
CREATE POLICY "Public can view active announcements" 
ON public.announcements 
FOR SELECT 
TO anon, authenticated
USING (status = true);

-- Add index for better performance on active announcements
CREATE INDEX IF NOT EXISTS idx_announcements_status_priority 
ON public.announcements(status, priority)
WHERE status = true;