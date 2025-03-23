-------CREATE ROOMIE FROM AUTH_USER
CREATE OR REPLACE FUNCTION public.create_roomie_from_auth_user()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.roomies WHERE auth_uuid = NEW.id
  ) THEN
    INSERT INTO public.roomies (name, avatar, auth_uuid)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ SECURITY DEFINER
LANGUAGE plpgsql;

CREATE TRIGGER create_roomie_after_auth_user_insert
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_roomie_from_auth_user();