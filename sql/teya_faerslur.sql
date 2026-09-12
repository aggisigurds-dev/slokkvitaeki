-- =============================================================
-- teya_faerslur — kortagreiðslur (Teya) fluttar inn af n8n.
-- =============================================================
-- Run this ONCE in Supabase SQL editor:
--   https://supabase.com/dashboard/project/osfdzskyvisifcwyjkuk/sql/new
-- Paste the whole file and click Run. Idempotent — safe to re-run.
--
-- Why this exists: n8n les Teya-CSV (kortafærslur), staðlar dálkana og
-- skrifar hverja færslu hingað (service-role → fer framhjá RLS). Appið les
-- töfluna (anon) til að sýna færslur og pörun við ógreidda reikninga.
-- ÞETTA ER NÝ, EINANGRUÐ TAFLA — engin skrif í varðar leiðir (invoice OUT
-- 10/233/254, payday-push). Pörun er aðeins LESIN úr reikningagögnum og
-- flögguð hér; ekkert er rukkað eða breytt sjálfvirkt.
--
-- NB (2026-09-12): endanleg dálka-vörpun bíður sýnishorns af Teya-CSV.
-- `raw` geymir upprunalínuna óskerta svo ekkert tapist þótt vörpun breytist.
-- Notað af n8n-flæðinu „Teya kortagreiðslur" (docs/N8N.md).

CREATE TABLE IF NOT EXISTS teya_faerslur (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faerslunumer       TEXT UNIQUE,                 -- stöðugt auðkenni frá Teya (afeitrun við endur-innflutning)
  faersludagur       DATE,                        -- dagsetning færslu
  upphaed            NUMERIC(12,2),               -- fjárhæð í ISK
  kortategund        TEXT,                        -- t.d. VISA / MASTERCARD
  kort_last4         TEXT,                        -- 4 síðustu í kortanúmeri (ef gefið)
  heiti              TEXT,                        -- lýsing / posi / söluaðili (ef gefið)
  uppruni            TEXT NOT NULL DEFAULT 'teya',
  skra               TEXT,                        -- heiti CSV-skrárinnar sem færslan kom úr
  raw                JSONB,                       -- upprunalega línan óskert (öryggi/villuleit)
  matched_invoice_id TEXT,                        -- auðkenni pöraðs reiknings (texti — engin FK í varðar töflur)
  matched_ref        TEXT,                        -- hvað var parað (t.d. reikningsnr / kt)
  stada              TEXT NOT NULL DEFAULT 'nytt', -- nytt | porun | stadfest | hunsad
  nota               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS teya_faerslur_dagur_idx  ON teya_faerslur (faersludagur);
CREATE INDEX IF NOT EXISTS teya_faerslur_stada_idx  ON teya_faerslur (stada);
CREATE INDEX IF NOT EXISTS teya_faerslur_match_idx  ON teya_faerslur (matched_invoice_id);

-- Single-tenant app. Innflutningur er AÐEINS gerður af n8n með service-role
-- (fer framhjá RLS), svo anon fær ekki INSERT/DELETE á peningafærslur.
-- Appið má LESA allt og UPPFÆRA stöðu/nótu/pörun (staða verður að vistast á
-- þjóni skv. samstillingarreglunni).
ALTER TABLE teya_faerslur ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teya_faerslur_anon_read   ON teya_faerslur;
DROP POLICY IF EXISTS teya_faerslur_anon_update ON teya_faerslur;

CREATE POLICY teya_faerslur_anon_read   ON teya_faerslur FOR SELECT TO anon USING (true);
CREATE POLICY teya_faerslur_anon_update ON teya_faerslur FOR UPDATE TO anon USING (true) WITH CHECK (true);
