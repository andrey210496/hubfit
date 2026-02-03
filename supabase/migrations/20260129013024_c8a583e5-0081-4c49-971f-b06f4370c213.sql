-- Create rooms/spaces table for gyms to organize classes
CREATE TABLE public.class_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER,
  color TEXT DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add room_id to class_schedules (optional)
ALTER TABLE public.class_schedules 
ADD COLUMN room_id UUID REFERENCES public.class_rooms(id) ON DELETE SET NULL;

-- Add room_id to class_sessions (optional)
ALTER TABLE public.class_sessions
ADD COLUMN room_id UUID REFERENCES public.class_rooms(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.class_rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view rooms from their company" 
ON public.class_rooms 
FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage rooms from their company" 
ON public.class_rooms 
FOR ALL 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_class_rooms_updated_at
BEFORE UPDATE ON public.class_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();