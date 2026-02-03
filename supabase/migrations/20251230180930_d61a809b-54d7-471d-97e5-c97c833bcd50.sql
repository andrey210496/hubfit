-- Add installment_fees column to store fees per installment (1-12)
ALTER TABLE public.payment_methods
ADD COLUMN installment_fees jsonb DEFAULT '[]'::jsonb;

-- Add credit_card_type to distinguish between machine and recurring
ALTER TABLE public.payment_methods
ADD COLUMN credit_card_type text DEFAULT NULL;

COMMENT ON COLUMN public.payment_methods.installment_fees IS 'Array of fee percentages for each installment (index 0 = 1x, index 11 = 12x)';
COMMENT ON COLUMN public.payment_methods.credit_card_type IS 'Type of credit card: machine (parcelado) or recurring (assinatura)';