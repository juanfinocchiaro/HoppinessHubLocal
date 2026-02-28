INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('clock-photos', 'clock-photos', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "clock_photos_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'clock-photos');

CREATE POLICY "clock_photos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'clock-photos');
