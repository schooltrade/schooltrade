CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.school_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text NOT NULL,
  code_salt text NOT NULL,
  code_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.school_codes TO service_role;
ALTER TABLE public.school_codes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.verify_school_code(_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT _code ~ '^\d{9}$' AND EXISTS (
    SELECT 1 FROM public.school_codes s
    WHERE s.code_hash = encode(extensions.digest(s.code_salt || _code, 'sha256'), 'hex'));
$$;
GRANT EXECUTE ON FUNCTION public.verify_school_code(text) TO anon, authenticated;

CREATE TABLE public.skins (
  id integer PRIMARY KEY,
  name text NOT NULL,
  tier integer NOT NULL CHECK (tier BETWEEN 1 AND 10),
  price numeric NOT NULL CHECK (price > 0)
);
GRANT SELECT ON public.skins TO anon, authenticated;
GRANT ALL ON public.skins TO service_role;
ALTER TABLE public.skins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Skins catalog is public" ON public.skins FOR SELECT USING (true);

CREATE TABLE public.user_skins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skin_id integer NOT NULL REFERENCES public.skins(id),
  owner_code text NOT NULL REFERENCES public.users(code) ON DELETE CASCADE,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_code, skin_id)
);
GRANT ALL ON public.user_skins TO service_role;
ALTER TABLE public.user_skins ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.equipped_skins (
  user_code text PRIMARY KEY REFERENCES public.users(code) ON DELETE CASCADE,
  user_skin_id uuid NOT NULL REFERENCES public.user_skins(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.equipped_skins TO service_role;
ALTER TABLE public.equipped_skins ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.skin_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_skin_id uuid NOT NULL REFERENCES public.user_skins(id) ON DELETE CASCADE,
  seller_code text NOT NULL,
  price numeric NOT NULL CHECK (price > 0 AND price <= 1e30),
  comment text NOT NULL DEFAULT '' CHECK (length(comment) <= 300),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX skin_offers_one_active ON public.skin_offers(user_skin_id) WHERE status = 'active';
GRANT ALL ON public.skin_offers TO service_role;
ALTER TABLE public.skin_offers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.skin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skin_id integer NOT NULL,
  buyer_code text NOT NULL,
  seller_code text,
  price numeric NOT NULL,
  offer_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.skin_transactions TO service_role;
ALTER TABLE public.skin_transactions ENABLE ROW LEVEL SECURITY;

-- helper: lock & debit balance
CREATE OR REPLACE FUNCTION public._shop_debit(_code text, _amount numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bal numeric;
BEGIN
  SELECT total_keif INTO bal FROM keif_balances WHERE user_code = _code ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF bal IS NULL OR bal < _amount THEN RAISE EXCEPTION 'אין מספיק קיפים'; END IF;
  UPDATE keif_balances SET total_keif = total_keif - _amount, updated_at = now()
   WHERE id = (SELECT id FROM keif_balances WHERE user_code = _code ORDER BY created_at LIMIT 1);
END $$;
REVOKE ALL ON FUNCTION public._shop_debit(text, numeric) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.shop_my_skins(_user_code text)
RETURNS TABLE(user_skin_id uuid, skin_id integer, equipped boolean, on_sale boolean, balance numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT us.id, us.skin_id,
    EXISTS (SELECT 1 FROM equipped_skins e WHERE e.user_code = _user_code AND e.user_skin_id = us.id),
    EXISTS (SELECT 1 FROM skin_offers o WHERE o.user_skin_id = us.id AND o.status = 'active'),
    COALESCE((SELECT total_keif FROM keif_balances WHERE user_code = _user_code ORDER BY created_at LIMIT 1), 0)
  FROM user_skins us WHERE us.owner_code = _user_code;
$$;

CREATE OR REPLACE FUNCTION public.shop_balance(_user_code text)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT total_keif FROM keif_balances WHERE user_code = _user_code ORDER BY created_at LIMIT 1), 0);
$$;

CREATE OR REPLACE FUNCTION public.shop_equipped_skin(_user_code text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT us.skin_id FROM equipped_skins e JOIN user_skins us ON us.id = e.user_skin_id
  WHERE e.user_code = _user_code AND us.owner_code = _user_code;
$$;

CREATE OR REPLACE FUNCTION public.shop_users()
RETURNS TABLE(user_id uuid, user_name text, skin_count bigint, equipped_skin_id integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.name,
    (SELECT count(*) FROM user_skins us WHERE us.owner_code = u.code),
    (SELECT us.skin_id FROM equipped_skins e JOIN user_skins us ON us.id = e.user_skin_id AND us.owner_code = u.code WHERE e.user_code = u.code)
  FROM users u ORDER BY 3 DESC, u.name LIMIT 500;
$$;

CREATE OR REPLACE FUNCTION public.shop_user_skins(_user_id uuid)
RETURNS TABLE(skin_id integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT us.skin_id FROM user_skins us JOIN users u ON u.code = us.owner_code
  WHERE u.id = _user_id ORDER BY us.skin_id DESC;
$$;

CREATE OR REPLACE FUNCTION public.shop_offers(_user_code text)
RETURNS TABLE(offer_id uuid, skin_id integer, seller_name text, price numeric, comment text, created_at timestamptz, is_mine boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, us.skin_id, COALESCE(u.name, 'משתמש'), o.price, o.comment, o.created_at, o.seller_code = _user_code
  FROM skin_offers o JOIN user_skins us ON us.id = o.user_skin_id
  LEFT JOIN users u ON u.code = o.seller_code
  WHERE o.status = 'active' ORDER BY o.created_at DESC LIMIT 200;
$$;

CREATE OR REPLACE FUNCTION public.shop_buy_catalog(_user_code text, _skin_id integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p numeric;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE code = _user_code) THEN RAISE EXCEPTION 'משתמש לא נמצא'; END IF;
  SELECT price INTO p FROM skins WHERE id = _skin_id;
  IF p IS NULL THEN RAISE EXCEPTION 'סקין לא קיים'; END IF;
  IF EXISTS (SELECT 1 FROM user_skins WHERE owner_code = _user_code AND skin_id = _skin_id) THEN RAISE EXCEPTION 'הסקין כבר בבעלותך'; END IF;
  PERFORM _shop_debit(_user_code, p);
  INSERT INTO user_skins(skin_id, owner_code) VALUES (_skin_id, _user_code);
  INSERT INTO skin_transactions(skin_id, buyer_code, price) VALUES (_skin_id, _user_code, p);
END $$;

CREATE OR REPLACE FUNCTION public.shop_equip(_user_code text, _user_skin_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_skin_id IS NULL THEN DELETE FROM equipped_skins WHERE user_code = _user_code; RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM user_skins WHERE id = _user_skin_id AND owner_code = _user_code) THEN RAISE EXCEPTION 'הסקין אינו בבעלותך'; END IF;
  INSERT INTO equipped_skins(user_code, user_skin_id) VALUES (_user_code, _user_skin_id)
  ON CONFLICT (user_code) DO UPDATE SET user_skin_id = EXCLUDED.user_skin_id, updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.shop_create_offer(_user_code text, _user_skin_id uuid, _price numeric, _comment text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _price IS NULL OR _price <= 0 OR _price > 1e30 THEN RAISE EXCEPTION 'מחיר לא תקין'; END IF;
  PERFORM 1 FROM user_skins WHERE id = _user_skin_id AND owner_code = _user_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'הסקין אינו בבעלותך'; END IF;
  IF EXISTS (SELECT 1 FROM skin_offers WHERE user_skin_id = _user_skin_id AND status = 'active') THEN RAISE EXCEPTION 'הסקין כבר מוצע למכירה'; END IF;
  INSERT INTO skin_offers(user_skin_id, seller_code, price, comment)
  VALUES (_user_skin_id, _user_code, round(_price), left(btrim(COALESCE(_comment, '')), 300));
END $$;

CREATE OR REPLACE FUNCTION public.shop_cancel_offer(_user_code text, _offer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE skin_offers SET status = 'cancelled', updated_at = now()
  WHERE id = _offer_id AND seller_code = _user_code AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'ההצעה לא נמצאה'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.shop_buy_offer(_user_code text, _offer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record; sk integer;
BEGIN
  SELECT * INTO o FROM skin_offers WHERE id = _offer_id FOR UPDATE;
  IF o IS NULL OR o.status <> 'active' THEN RAISE EXCEPTION 'ההצעה כבר אינה זמינה'; END IF;
  IF o.seller_code = _user_code THEN RAISE EXCEPTION 'לא ניתן לקנות הצעה שלך'; END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE code = _user_code) THEN RAISE EXCEPTION 'משתמש לא נמצא'; END IF;
  SELECT skin_id INTO sk FROM user_skins WHERE id = o.user_skin_id AND owner_code = o.seller_code FOR UPDATE;
  IF sk IS NULL THEN RAISE EXCEPTION 'המוכר כבר אינו מחזיק בסקין'; END IF;
  IF EXISTS (SELECT 1 FROM user_skins WHERE owner_code = _user_code AND skin_id = sk) THEN RAISE EXCEPTION 'הסקין כבר בבעלותך'; END IF;
  PERFORM _shop_debit(_user_code, o.price);
  IF EXISTS (SELECT 1 FROM keif_balances WHERE user_code = o.seller_code) THEN
    UPDATE keif_balances SET total_keif = total_keif + o.price, updated_at = now()
     WHERE id = (SELECT id FROM keif_balances WHERE user_code = o.seller_code ORDER BY created_at LIMIT 1);
  ELSE
    INSERT INTO keif_balances(user_code, user_name, total_keif)
    VALUES (o.seller_code, COALESCE((SELECT name FROM users WHERE code = o.seller_code), 'משתמש'), o.price);
  END IF;
  DELETE FROM equipped_skins WHERE user_skin_id = o.user_skin_id;
  UPDATE user_skins SET owner_code = _user_code, acquired_at = now() WHERE id = o.user_skin_id;
  UPDATE skin_offers SET status = 'sold', updated_at = now() WHERE id = o.id;
  UPDATE skin_offers SET status = 'cancelled', updated_at = now() WHERE user_skin_id = o.user_skin_id AND status = 'active';
  INSERT INTO skin_transactions(skin_id, buyer_code, seller_code, price, offer_id) VALUES (sk, _user_code, o.seller_code, o.price, o.id);
END $$;

GRANT EXECUTE ON FUNCTION public.shop_my_skins(text), public.shop_balance(text), public.shop_equipped_skin(text), public.shop_users(),
  public.shop_user_skins(uuid), public.shop_offers(text), public.shop_buy_catalog(text, integer), public.shop_equip(text, uuid),
  public.shop_create_offer(text, uuid, numeric, text), public.shop_cancel_offer(text, uuid), public.shop_buy_offer(text, uuid)
  TO anon, authenticated;