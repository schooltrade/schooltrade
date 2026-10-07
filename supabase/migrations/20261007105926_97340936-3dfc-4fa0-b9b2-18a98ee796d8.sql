ALTER TABLE public.skins ADD COLUMN category text NOT NULL DEFAULT 'standard';
ALTER TABLE public.skins ADD COLUMN available_until timestamptz;

CREATE OR REPLACE FUNCTION public.shop_server_now()
RETURNS timestamptz LANGUAGE sql STABLE SET search_path = public AS $$ SELECT now(); $$;
GRANT EXECUTE ON FUNCTION public.shop_server_now() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.shop_buy_catalog(_user_code text, _skin_id integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p numeric; until timestamptz;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE code = _user_code) THEN RAISE EXCEPTION 'משתמש לא נמצא'; END IF;
  SELECT price, available_until INTO p, until FROM skins WHERE id = _skin_id;
  IF p IS NULL THEN RAISE EXCEPTION 'סקין לא קיים'; END IF;
  IF until IS NOT NULL AND now() >= until THEN RAISE EXCEPTION 'הקולקציה הסתיימה ולא ניתן לרכוש סקין זה'; END IF;
  IF EXISTS (SELECT 1 FROM user_skins WHERE owner_code = _user_code AND skin_id = _skin_id) THEN RAISE EXCEPTION 'הסקין כבר בבעלותך'; END IF;
  PERFORM _shop_debit(_user_code, p);
  INSERT INTO user_skins(skin_id, owner_code) VALUES (_skin_id, _user_code);
  INSERT INTO skin_transactions(skin_id, buyer_code, price) VALUES (_skin_id, _user_code, p);
END $$;

DROP FUNCTION public.shop_balance(text);
CREATE FUNCTION public.shop_balance(_user_code text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT trunc(COALESCE((SELECT total_keif FROM keif_balances WHERE user_code = _user_code ORDER BY created_at LIMIT 1), 0))::text;
$$;
GRANT EXECUTE ON FUNCTION public.shop_balance(text) TO anon, authenticated;

DROP FUNCTION public.shop_offers(text);
CREATE FUNCTION public.shop_offers(_user_code text)
RETURNS TABLE(offer_id uuid, skin_id integer, seller_name text, price text, comment text, created_at timestamptz, is_mine boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, us.skin_id, COALESCE(u.name, 'משתמש'), trunc(o.price)::text, o.comment, o.created_at, o.seller_code = _user_code
  FROM skin_offers o JOIN user_skins us ON us.id = o.user_skin_id
  LEFT JOIN users u ON u.code = o.seller_code
  WHERE o.status = 'active' ORDER BY o.created_at DESC LIMIT 200;
$$;
GRANT EXECUTE ON FUNCTION public.shop_offers(text) TO anon, authenticated;

-- Exact, server-side Keif addition (no client-side floating point totals)
CREATE OR REPLACE FUNCTION public.keif_convert(_user_code text, _user_name text, _amount numeric, _converted jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rid uuid; total numeric;
BEGIN
  IF _amount IS NULL OR _amount < 0 OR _amount = 'NaN'::numeric THEN RAISE EXCEPTION 'סכום לא תקין'; END IF;
  _amount := trunc(_amount);
  SELECT id INTO rid FROM keif_balances WHERE user_code = _user_code ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF rid IS NULL THEN
    INSERT INTO keif_balances(user_code, user_name, total_keif) VALUES (_user_code, _user_name, 0) RETURNING id INTO rid;
  END IF;
  UPDATE keif_balances SET
    user_name = _user_name,
    total_keif = total_keif + _amount,
    converted_math = COALESCE((_converted->>'converted_math')::numeric, converted_math),
    converted_hebrew = COALESCE((_converted->>'converted_hebrew')::numeric, converted_hebrew),
    converted_english = COALESCE((_converted->>'converted_english')::numeric, converted_english),
    converted_crypto = COALESCE((_converted->>'converted_crypto')::numeric, converted_crypto),
    converted_arcade = COALESCE((_converted->>'converted_arcade')::numeric, converted_arcade),
    updated_at = now()
  WHERE id = rid RETURNING total_keif INTO total;
  RETURN trunc(total)::text;
END $$;
GRANT EXECUTE ON FUNCTION public.keif_convert(text, text, numeric, jsonb) TO anon, authenticated;