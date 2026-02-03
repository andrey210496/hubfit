-- Create table for trial class bookings (for leads who are not members yet)
CREATE TABLE public.trial_class_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  class_session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'attended', 'no_show')),
  booked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  attended_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trial_class_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view trial bookings from their company"
  ON public.trial_class_bookings FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create trial bookings in their company"
  ON public.trial_class_bookings FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update trial bookings in their company"
  ON public.trial_class_bookings FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete trial bookings in their company"
  ON public.trial_class_bookings FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

-- Service role policy for edge functions
CREATE POLICY "Service role can manage trial bookings"
  ON public.trial_class_bookings FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for performance
CREATE INDEX idx_trial_bookings_session ON public.trial_class_bookings(class_session_id);
CREATE INDEX idx_trial_bookings_contact ON public.trial_class_bookings(contact_id);
CREATE INDEX idx_trial_bookings_company ON public.trial_class_bookings(company_id);

-- Add trigger for updated_at
CREATE TRIGGER update_trial_bookings_updated_at
  BEFORE UPDATE ON public.trial_class_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.trial_class_bookings;