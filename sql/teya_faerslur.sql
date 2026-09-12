-- =============================================================
-- teya_faerslur — kortagreiðslur (Teya "Færsluskýrsla") fluttar inn af n8n.
-- =============================================================
-- Run this ONCE in Supabase SQL editor:
--   https://supabase.com/dashboard/project/osfdzskyvisifcwyjkuk/sql/new
-- Paste the whole file and click Run. Idempotent-ish (DROP + CREATE) — það er
-- ÓHÆTT á meðan taflan er tóm; EKKI keyra aftur eftir að gögn eru komin inn.
--
-- Why this exists: n8n les Teya-CSV, staðlar dálkana og skrifar hverja færslu
-- hingað (service-role → fer framhjá RLS). Appið les töfluna (anon).
-- ÞETTA ER NÝ, EINANGRUÐ TAFLA — engin skrif í varðar leiðir (invoice OUT
-- 10/233/254, payday-push). Ekkert rukkað eða breytt sjálfvirkt.
--
-- Raunverulegt CSV-snið (staðfest 2026-09-12 á 683 línum, kommu-skil, UTF-8):
--   Tegund greiðslu (PAYMENT/REFUND), Dagsetning, Tími, Heiti samnings,
--   Greiðslumáti (TERMINAL), Nafn posa, Auðkenni tækis, Staða
--   (SAMÞYKKT/HAFNAÐ/Í BIÐ), Upphæð (heiltala, engir aukastafir).
--   ⚠ EKKERT færslunúmer, EKKERT kortanúmer/tegund, ENGIN reikninga-/kt-vísun
--   → ekki hægt að para sjálfvirkt við reikning. Aðeins SAMÞYKKT = peningar.
--   Afeitrun (engin stöðug auðkenni) gerð með dedupe_key.
-- Notað af n8n-flæðinu „Teya kortagreiðslur" (docs/N8N.md).

DROP TABLE IF EXISTS teya_faerslur CASCADE;

CREATE TABLE teya_faerslur (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key       TEXT UNIQUE NOT NULL,         -- dags|tími|tæki|tegund|upphæð|staða (afeitrun)
  tegund           TEXT,                         -- PAYMENT | REFUND
  faersludagur     DATE,
  timi             TIME,
  heiti_samnings   TEXT,
  greidslumati     TEXT,                         -- TERMINAL
  nafn_posa        TEXT,
  audkenni_taekis  TEXT,
  teya_stada       TEXT,                         -- SAMÞYKKT | HAFNAÐ | Í BIÐ  (aðeins SAMÞYKKT = peningar)
  upphaed          NUMERIC(12,2),
  uppruni          TEXT NOT NULL DEFAULT 'teya',
  skra             TEXT,                         -- heiti CSV-skrárinnar
  raw              JSONB,                        -- upprunalega línan óskert
  matched_sala_id  TEXT,                         -- (áfangi 2) pörun við POS/sölu, ekki reikning
  matched_ref      TEXT,
  stada            TEXT NOT NULL DEFAULT 'nytt', -- vinnslustaða appsins: nytt | parad | stadfest | hunsad
  nota             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX teya_faerslur_dagur_idx      ON teya_faerslur (faersludagur);
CREATE INDEX teya_faerslur_teya_stada_idx ON teya_faerslur (teya_stada);
CREATE INDEX teya_faerslur_stada_idx      ON teya_faerslur (stada);
CREATE INDEX teya_faerslur_tegund_idx     ON teya_faerslur (tegund);

-- Single-tenant app. Innflutningur AÐEINS af n8n með service-role (framhjá RLS),
-- svo anon fær ekki INSERT/DELETE á peningafærslur. Appið les allt og uppfærir
-- stöðu/nótu/pörun (staða verður að vistast á þjóni skv. samstillingarreglunni).
ALTER TABLE teya_faerslur ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teya_faerslur_anon_read   ON teya_faerslur;
DROP POLICY IF EXISTS teya_faerslur_anon_update ON teya_faerslur;

CREATE POLICY teya_faerslur_anon_read   ON teya_faerslur FOR SELECT TO anon USING (true);
CREATE POLICY teya_faerslur_anon_update ON teya_faerslur FOR UPDATE TO anon USING (true) WITH CHECK (true);
