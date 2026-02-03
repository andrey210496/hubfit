-- Make the files bucket public so PAR-Q photos can be accessed
UPDATE storage.buckets SET public = true WHERE id = 'files';