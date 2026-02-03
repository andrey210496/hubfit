-- Add quality rating column to whatsapps table
ALTER TABLE public.whatsapps 
ADD COLUMN IF NOT EXISTS quality_rating TEXT,
ADD COLUMN IF NOT EXISTS quality_rating_updated_at TIMESTAMP WITH TIME ZONE;

-- Add engagement/scoring columns to contacts table
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS messages_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS messages_received INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS messages_read INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS messages_replied INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS link_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS first_interaction_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS engagement_level TEXT DEFAULT 'new';

-- Create index for engagement queries
CREATE INDEX IF NOT EXISTS idx_contacts_engagement_score ON public.contacts(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_engagement_level ON public.contacts(engagement_level);
CREATE INDEX IF NOT EXISTS idx_contacts_last_interaction ON public.contacts(last_interaction_at DESC);

-- Create function to calculate engagement score
CREATE OR REPLACE FUNCTION public.calculate_contact_engagement_score(
  p_messages_sent INTEGER,
  p_messages_received INTEGER,
  p_messages_read INTEGER,
  p_messages_replied INTEGER,
  p_link_clicks INTEGER,
  p_last_interaction_at TIMESTAMP WITH TIME ZONE
) RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_recency_bonus INTEGER := 0;
  v_days_since_interaction INTEGER;
BEGIN
  -- Base score from interactions
  v_score := v_score + (p_messages_received * 5); -- Received messages
  v_score := v_score + (p_messages_read * 10); -- Read messages (higher weight)
  v_score := v_score + (p_messages_replied * 20); -- Replies (highest weight)
  v_score := v_score + (p_link_clicks * 15); -- Link clicks (high engagement)
  
  -- Recency bonus
  IF p_last_interaction_at IS NOT NULL THEN
    v_days_since_interaction := EXTRACT(DAY FROM (now() - p_last_interaction_at));
    
    IF v_days_since_interaction <= 7 THEN
      v_recency_bonus := 50; -- Very recent
    ELSIF v_days_since_interaction <= 14 THEN
      v_recency_bonus := 30; -- Recent
    ELSIF v_days_since_interaction <= 30 THEN
      v_recency_bonus := 15; -- Moderately recent
    ELSIF v_days_since_interaction <= 60 THEN
      v_recency_bonus := 5; -- Somewhat recent
    ELSE
      v_recency_bonus := 0; -- Not recent
    END IF;
    
    v_score := v_score + v_recency_bonus;
  END IF;
  
  -- Cap at 100
  IF v_score > 100 THEN
    v_score := 100;
  END IF;
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Create function to determine engagement level
CREATE OR REPLACE FUNCTION public.get_engagement_level(p_score INTEGER) 
RETURNS TEXT AS $$
BEGIN
  IF p_score >= 80 THEN
    RETURN 'hot';
  ELSIF p_score >= 50 THEN
    RETURN 'warm';
  ELSIF p_score >= 20 THEN
    RETURN 'lukewarm';
  ELSIF p_score > 0 THEN
    RETURN 'cold';
  ELSE
    RETURN 'new';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Create trigger to auto-update engagement score
CREATE OR REPLACE FUNCTION public.update_contact_engagement() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.engagement_score := calculate_contact_engagement_score(
    NEW.messages_sent,
    NEW.messages_received,
    NEW.messages_read,
    NEW.messages_replied,
    NEW.link_clicks,
    NEW.last_interaction_at
  );
  NEW.engagement_level := get_engagement_level(NEW.engagement_score);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_contact_engagement ON public.contacts;
CREATE TRIGGER trigger_update_contact_engagement
  BEFORE UPDATE OF messages_sent, messages_received, messages_read, messages_replied, link_clicks, last_interaction_at
  ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contact_engagement();