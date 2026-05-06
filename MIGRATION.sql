-- ============================================================
-- SLÖKKVITÆKI EHF — Database Migration
-- Run this in the Supabase SQL editor (supabase.com → SQL Editor)
-- Each block is safe to run multiple times (IF NOT EXISTS / IF EXISTS).
-- ============================================================

-- ── Patch 20: Mark invoice paid ──────────────────────────────
-- Adds paid_at and paid_method to the solur (sales) table.
-- paid_at NULL = unpaid invoice (greitt_med = 'reikningur')
-- paid_at SET  = invoice confirmed as paid
ALTER TABLE solur ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE solur ADD COLUMN IF NOT EXISTS paid_method TEXT;

-- ── Patch 24: Customer contact log ───────────────────────────
-- Logs every call, email, visit and note per company.
CREATE TABLE IF NOT EXISTS contact_log (
  id           BIGSERIAL PRIMARY KEY,
  company_id   BIGINT REFERENCES fyrirtaeki(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL DEFAULT 'athugasemd',
    -- values: 'simi' | 'netfang' | 'heimsokn' | 'athugasemd'
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  created_by   TEXT
);
CREATE INDEX IF NOT EXISTS contact_log_company_idx ON contact_log(company_id);
-- RLS: allow all authenticated users to read/write
ALTER TABLE contact_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow all" ON contact_log FOR ALL USING (true) WITH CHECK (true);

-- ── Patch 26: Credit invoice ──────────────────────────────────
-- credit_of links a credit note back to the original sale.
ALTER TABLE solur ADD COLUMN IF NOT EXISTS credit_of BIGINT REFERENCES solur(id);
ALTER TABLE solur ADD COLUMN IF NOT EXISTS is_credit BOOLEAN DEFAULT FALSE;

-- ── Patch 27: Tilboð / Quotes ─────────────────────────────────
CREATE TABLE IF NOT EXISTS tilbod (
  id              BIGSERIAL PRIMARY KEY,
  num             TEXT,
  company_id      BIGINT,
  company_nafn    TEXT,
  linur           JSONB DEFAULT '[]'::jsonb,
  upphaed_an_vsk  NUMERIC DEFAULT 0,
  vsk_upphaed     NUMERIC DEFAULT 0,
  samtals         NUMERIC DEFAULT 0,
  valid_until     DATE,
  status          TEXT DEFAULT 'draft',
    -- values: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      TEXT
);
CREATE INDEX IF NOT EXISTS tilbod_company_idx ON tilbod(company_id);
CREATE INDEX IF NOT EXISTS tilbod_status_idx ON tilbod(status);
ALTER TABLE tilbod ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow all" ON tilbod FOR ALL USING (true) WITH CHECK (true);

-- ── Patch 28: Calendar / Dagbók ───────────────────────────────
CREATE TABLE IF NOT EXISTS dagbok (
  id               BIGSERIAL PRIMARY KEY,
  title            TEXT NOT NULL,
  company_id       BIGINT,
  company_nafn     TEXT,
  assigned_to      TEXT,
  scheduled_start  TIMESTAMPTZ NOT NULL,
  scheduled_end    TIMESTAMPTZ,
  notes            TEXT,
  status           TEXT DEFAULT 'scheduled',
    -- values: 'scheduled' | 'done' | 'cancelled'
  job_id           BIGINT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS dagbok_start_idx ON dagbok(scheduled_start);
CREATE INDEX IF NOT EXISTS dagbok_company_idx ON dagbok(company_id);
ALTER TABLE dagbok ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow all" ON dagbok FOR ALL USING (true) WITH CHECK (true);

-- ── Patch 30: Recurring service interval ─────────────────────
-- Stores the default inspection interval (months) per service unit.
ALTER TABLE þjonustutaeki ADD COLUMN IF NOT EXISTS service_interval_months INT DEFAULT 12;

-- ── Patch 32: User profiles / roles ──────────────────────────
-- Stores display name and role for each authenticated user.
-- Requires Supabase Auth to be enabled in your project.
CREATE TABLE IF NOT EXISTS user_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nafn       TEXT,
  role       TEXT DEFAULT 'tech',
    -- values: 'owner' | 'tech' | 'viewer'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can read all profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- patch 36: Parts / consumables inventory
-- ============================================================
CREATE TABLE IF NOT EXISTS birgdir (
  id          BIGSERIAL PRIMARY KEY,
  nafn        TEXT NOT NULL,
  flokkur     TEXT DEFAULT 'almennt',
  eining      TEXT DEFAULT 'stk',
  magn        NUMERIC DEFAULT 0,
  lagmark     NUMERIC DEFAULT 5,
  verd_an_vsk NUMERIC DEFAULT 0,
  birgi       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE birgdir ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow all birgdir" ON birgdir FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- patch 39: Purchase orders
-- ============================================================
CREATE TABLE IF NOT EXISTS innkaupapantanir (
  id          BIGSERIAL PRIMARY KEY,
  po_num      TEXT,
  birgi       TEXT,
  status      TEXT DEFAULT 'drög',
    -- values: 'drög' | 'sent' | 'móttekið'
  lines       JSONB DEFAULT '[]',
    -- [{ nafn, magn, eining, verd_an_vsk, birgdir_id? }, ...]
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  sent_at     TIMESTAMPTZ,
  received_at TIMESTAMPTZ
);
ALTER TABLE innkaupapantanir ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow all innkaupapantanir" ON innkaupapantanir FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- patch 40: Time tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS timabok (
  id          BIGSERIAL PRIMARY KEY,
  job_id      BIGINT,
  job_num     TEXT,
  tæknimaður  TEXT NOT NULL,
  mínútur     INTEGER NOT NULL,
  dagsetning  DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE timabok ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow all timabok" ON timabok FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- patch 41: Expense / cost tracking per job
-- ============================================================
CREATE TABLE IF NOT EXISTS utgjalda_log (
  id          BIGSERIAL PRIMARY KEY,
  job_id      BIGINT,
  job_num     TEXT,
  flokkur     TEXT DEFAULT 'efni',
    -- values: 'efni' | 'ferðakostnaður' | 'verkfæri' | 'undirverktaki' | 'annað'
  lýsing      TEXT NOT NULL,
  upphæð      NUMERIC NOT NULL DEFAULT 0,
  tæknimaður  TEXT,
  dagsetning  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE utgjalda_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow all utgjalda_log" ON utgjalda_log FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- patch 45: Verkdagbók attachments (Supabase Storage)
-- Photos & files for each Verkdagbók entry are stored in the
-- 'verkdagbok' bucket. Metadata lives in verkdagbok_attachments.
-- ============================================================

-- Metadata table
CREATE TABLE IF NOT EXISTS verkdagbok_attachments (
  id         BIGSERIAL PRIMARY KEY,
  entry_id   BIGINT NOT NULL,
  name       TEXT NOT NULL,
  path       TEXT,                -- storage path inside bucket
  url        TEXT,                -- public URL
  mime_type  TEXT,
  size       BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vda_entry ON verkdagbok_attachments(entry_id);
ALTER TABLE verkdagbok_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow all vda" ON verkdagbok_attachments FOR ALL USING (true) WITH CHECK (true);

-- Public storage bucket 'verkdagbok'
INSERT INTO storage.buckets (id, name, public)
VALUES ('verkdagbok', 'verkdagbok', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies: allow all read/write/delete on 'verkdagbok' bucket
DROP POLICY IF EXISTS "vd_read"   ON storage.objects;
DROP POLICY IF EXISTS "vd_insert" ON storage.objects;
DROP POLICY IF EXISTS "vd_update" ON storage.objects;
DROP POLICY IF EXISTS "vd_delete" ON storage.objects;

CREATE POLICY "vd_read"   ON storage.objects FOR SELECT USING  (bucket_id = 'verkdagbok');
CREATE POLICY "vd_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'verkdagbok');
CREATE POLICY "vd_update" ON storage.objects FOR UPDATE USING  (bucket_id = 'verkdagbok');
CREATE POLICY "vd_delete" ON storage.objects FOR DELETE USING  (bucket_id = 'verkdagbok');

-- ============================================================
-- patch 47: Akstursdagbók (mileage log) — RSK tax compliance
-- ============================================================
CREATE TABLE IF NOT EXISTS akstursdagbok (
  id          BIGSERIAL PRIMARY KEY,
  dagsetning  DATE NOT NULL DEFAULT CURRENT_DATE,
  fra         TEXT,
  til         TEXT,
  km          NUMERIC NOT NULL DEFAULT 0,
  erindi      TEXT,
  taeknimadur TEXT,
  job_id      BIGINT,
  job_num     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_akstur_date ON akstursdagbok(dagsetning);
ALTER TABLE akstursdagbok ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all akstursdagbok" ON akstursdagbok;
CREATE POLICY "Allow all akstursdagbok" ON akstursdagbok FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- patch 50: Þjónustusamningar / Service contracts
-- ============================================================
CREATE TABLE IF NOT EXISTS thjonustusamningar (
  id              BIGSERIAL PRIMARY KEY,
  company_id      BIGINT,
  company_nafn    TEXT,
  thjonusta       TEXT NOT NULL,
  upphaed_an_vsk  NUMERIC DEFAULT 0,
  tidni_man       INTEGER DEFAULT 12,
  next_due        DATE,
  last_billed     DATE,
  status          TEXT DEFAULT 'virkur',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_samningar_due ON thjonustusamningar(next_due);
ALTER TABLE thjonustusamningar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all samningar" ON thjonustusamningar;
CREATE POLICY "Allow all samningar" ON thjonustusamningar FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- patch 50b: Þjónustusamningar — viðbótarreitir til að passa við pappírssamning
-- ============================================================
ALTER TABLE thjonustusamningar ADD COLUMN IF NOT EXISTS kennitala TEXT;
ALTER TABLE thjonustusamningar ADD COLUMN IF NOT EXISTS heimilisfang TEXT;
ALTER TABLE thjonustusamningar ADD COLUMN IF NOT EXISTS umsjon_slokkvitaeki BOOLEAN DEFAULT FALSE;
ALTER TABLE thjonustusamningar ADD COLUMN IF NOT EXISTS umsjon_reykskynjarar BOOLEAN DEFAULT FALSE;
ALTER TABLE thjonustusamningar ADD COLUMN IF NOT EXISTS umsjon_annad TEXT;
ALTER TABLE thjonustusamningar ADD COLUMN IF NOT EXISTS signed_at DATE;
ALTER TABLE thjonustusamningar ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE thjonustusamningar ADD COLUMN IF NOT EXISTS photo_path TEXT;

-- Storage bucket for signed contract photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('samningar', 'samningar', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "samn_read"   ON storage.objects;
DROP POLICY IF EXISTS "samn_insert" ON storage.objects;
DROP POLICY IF EXISTS "samn_update" ON storage.objects;
DROP POLICY IF EXISTS "samn_delete" ON storage.objects;
CREATE POLICY "samn_read"   ON storage.objects FOR SELECT USING  (bucket_id = 'samningar');
CREATE POLICY "samn_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'samningar');
CREATE POLICY "samn_update" ON storage.objects FOR UPDATE USING  (bucket_id = 'samningar');
CREATE POLICY "samn_delete" ON storage.objects FOR DELETE USING  (bucket_id = 'samningar');

-- ============================================================
-- patch 55: Vörumyndir / Product images
-- ============================================================
ALTER TABLE vorur ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE vorur ADD COLUMN IF NOT EXISTS description TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('vorur', 'vorur', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "vorur_read"   ON storage.objects;
DROP POLICY IF EXISTS "vorur_insert" ON storage.objects;
DROP POLICY IF EXISTS "vorur_update" ON storage.objects;
DROP POLICY IF EXISTS "vorur_delete" ON storage.objects;
CREATE POLICY "vorur_read"   ON storage.objects FOR SELECT USING  (bucket_id = 'vorur');
CREATE POLICY "vorur_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vorur');
CREATE POLICY "vorur_update" ON storage.objects FOR UPDATE USING  (bucket_id = 'vorur');
CREATE POLICY "vorur_delete" ON storage.objects FOR DELETE USING  (bucket_id = 'vorur');

-- ============================================================
-- patches 59, 60, 64, 65: Technicians, signatures, audit, refills
-- ============================================================
ALTER TABLE taeknimenn ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE taeknimenn ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC;
ALTER TABLE taeknimenn ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE taeknimenn ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE taeknimenn ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS skirteini (
  id BIGSERIAL PRIMARY KEY,
  taeknimadur_id BIGINT,
  taeknimadur_nafn TEXT,
  skirteini_nafn TEXT NOT NULL,
  utgefandi TEXT,
  gefid_ut DATE,
  rennur_ut DATE,
  athugasemd TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_skirteini_renn ON skirteini(rennur_ut);
ALTER TABLE skirteini ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all skirteini" ON skirteini;
CREATE POLICY "Allow all skirteini" ON skirteini FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE verkbeidnir ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE verkbeidnir ADD COLUMN IF NOT EXISTS signed_by TEXT;
ALTER TABLE verkbeidnir ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ DEFAULT NOW(),
  user_email TEXT,
  action TEXT,
  table_name TEXT,
  row_id TEXT,
  details JSONB
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts DESC);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all audit" ON audit_log;
CREATE POLICY "Allow all audit" ON audit_log FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS afyllingar (
  id BIGSERIAL PRIMARY KEY,
  uttaeki_id BIGINT,
  uttaeki_nr TEXT,
  dagsetning DATE NOT NULL DEFAULT CURRENT_DATE,
  efni TEXT,
  magn_kg NUMERIC,
  kostnadur NUMERIC DEFAULT 0,
  taeknimadur TEXT,
  athugasemd TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_afyllingar_date ON afyllingar(dagsetning);
ALTER TABLE afyllingar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all afyllingar" ON afyllingar;
CREATE POLICY "Allow all afyllingar" ON afyllingar FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- patch 10b: Sequential receipt numbers (R-000001, R-000002, ...)
-- Required by Icelandic accounting law — invoice numbers must be in
-- continuous numerical order with no gaps. The trigger assigns the
-- next number to every new row in solur unless one is already set
-- in the new R-NNNNNN format.
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS reikningur_seq;

-- Initialize sequence so it continues after any existing R-NNNNNN numbers.
DO $$
DECLARE max_n BIGINT;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(num FROM 3)::BIGINT), 0) INTO max_n
  FROM solur WHERE num ~ '^R-[0-9]+$';
  PERFORM setval('reikningur_seq', GREATEST(max_n, 0), max_n > 0);
END $$;

CREATE OR REPLACE FUNCTION set_reikningur_num() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.num IS NULL OR NEW.num = '' OR NEW.num !~ '^R-[0-9]+$' THEN
    NEW.num := 'R-' || LPAD(nextval('reikningur_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS solur_set_num ON solur;
CREATE TRIGGER solur_set_num BEFORE INSERT ON solur
  FOR EACH ROW EXECUTE FUNCTION set_reikningur_num();

-- ============================================================
-- patch 08b: Sequential serial numbers for fire extinguishers (S0001, S0002, ...)
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS uttaeki_serial_seq;

-- Initialize from existing S-NNNN serials so we continue past them
DO $$
DECLARE max_n BIGINT;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(serial FROM 2)::BIGINT), 0) INTO max_n
  FROM uttaeki WHERE serial ~ '^S[0-9]+$';
  IF max_n > 0 THEN
    PERFORM setval('uttaeki_serial_seq', max_n, true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION next_uttaeki_serial() RETURNS TEXT
LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'S' || LPAD(nextval('uttaeki_serial_seq')::text, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION next_uttaeki_serial() TO anon, authenticated, public;

-- ============================================================
-- patch 67: Reset receipt + serial sequences (called from the
-- Settings → "Hreinsa prufu-gögn" admin tool). Returns the new
-- starting value (always 1, since the sequences are zeroed).
-- ============================================================
CREATE OR REPLACE FUNCTION reset_reikningur_seq() RETURNS BIGINT
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM setval('reikningur_seq', 0, false);
  RETURN 1;
END;
$$;
GRANT EXECUTE ON FUNCTION reset_reikningur_seq() TO authenticated;

CREATE OR REPLACE FUNCTION reset_uttaeki_serial_seq() RETURNS BIGINT
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM setval('uttaeki_serial_seq', 0, false);
  RETURN 1;
END;
$$;
GRANT EXECUTE ON FUNCTION reset_uttaeki_serial_seq() TO authenticated;

-- ============================================================
-- patch 69: Per-customer default discount (%)
-- Stored on both individual customers (vidskiptavinir) and
-- companies (fyrirtaeki). The Sala/POS UI applies this as the
-- default percentage discount when the customer is selected;
-- the staff member can still override it on a per-sale basis.
-- ============================================================
ALTER TABLE vidskiptavinir ADD COLUMN IF NOT EXISTS afslattur_pct NUMERIC DEFAULT 0;
ALTER TABLE fyrirtaeki     ADD COLUMN IF NOT EXISTS afslattur_pct NUMERIC DEFAULT 0;

-- ============================================================
-- Done! All tables and columns are now ready.
-- ============================================================
