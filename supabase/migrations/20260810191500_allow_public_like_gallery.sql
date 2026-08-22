-- Migration: Add RPC function for updating gallery likes safely for all users
CREATE OR REPLACE FUNCTION public.toggle_gallery_like(p_item_id UUID, p_increment INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_likes INT;
BEGIN
  UPDATE public.gallery_items
  SET likes = GREATEST(0, COALESCE(likes, 0) + p_increment)
  WHERE id = p_item_id
  RETURNING likes INTO v_new_likes;
  
  RETURN COALESCE(v_new_likes, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_gallery_like(UUID, INT) TO anon, authenticated, service_role;
