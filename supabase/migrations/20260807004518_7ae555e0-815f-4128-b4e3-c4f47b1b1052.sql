DROP POLICY IF EXISTS "shop-assets read public folders" ON storage.objects;

CREATE POLICY "shop-assets read public folders"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'shop-assets'
  AND (storage.foldername(name))[1] = ANY (ARRAY['products','categories','payments','socials','store','activation','misc'])
);