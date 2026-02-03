-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for files bucket
CREATE POLICY "Users can upload files to their company folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'files' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view files"
ON storage.objects FOR SELECT
USING (bucket_id = 'files');

CREATE POLICY "Users can delete their files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'files' AND
  auth.uid() IS NOT NULL
);