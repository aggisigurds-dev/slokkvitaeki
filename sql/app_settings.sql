-- =============================================================
-- app_settings — single-row table holding all app-wide config.
-- =============================================================
-- Run this ONCE in Supabase SQL editor:
--   https://supabase.com/dashboard/project/osfdzskyvisifcwyjkuk/sql/new
-- Paste the whole file and click Run.
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS app_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Allow anon read+write (single-tenant app, no auth boundary needed yet).
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_anon_read   ON app_settings;
DROP POLICY IF EXISTS app_settings_anon_write  ON app_settings;
DROP POLICY IF EXISTS app_settings_anon_update ON app_settings;

CREATE POLICY app_settings_anon_read   ON app_settings FOR SELECT TO anon USING (true);
CREATE POLICY app_settings_anon_write  ON app_settings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY app_settings_anon_update ON app_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Seed the single row with sensible defaults if missing.
INSERT INTO app_settings (id, settings) VALUES (1, jsonb_build_object(
  'branding', jsonb_build_object(
    'company_name',    'Slökkvitæki ehf',
    'tagline',         'Brunahólf',
    'kennitala',       '600508-0400',
    'vsk_nr',          '98107',
    'address1',        'Helluhrauni 10',
    'address2',        '220 Hafnarfirði',
    'phone',           '565-4080',
    'email',           'eldklar@eldklar.is',
    'logo_url',        '/img/logo.png',
    'primary_color',   '#C93C1D',
    'banner_text',     'Slökkvitæki ehf',
    'banner_subtitle', 'Slökkvitækjaþjónusta'
  ),
  'sala', jsonb_build_object(
    'sort_order',          'alphabetical',
    'pinned_product_ids',  '[]'::jsonb,
    'hidden_product_ids',  '[]'::jsonb,
    'show_aux_categories', true
  ),
  'shortcuts', jsonb_build_array(
    jsonb_build_object('label','ABC duft hleðsla 6kg','price',5200,'icon','🔥'),
    jsonb_build_object('label','Yfirferð','price',4200,'icon','✓'),
    jsonb_build_object('label','CO2 hleðsla 5kg','price',5300,'icon','💨'),
    jsonb_build_object('label','Akstur','price',3500,'icon','🚚')
  ),
  'prentun', jsonb_build_object(
    'default_print_kvittun',     true,
    'default_print_strikamerki', true,
    'default_print_qr_label',    false,
    'label_size',                '54x17',
    'dpi_compensation',          2
  ),
  'almennt', jsonb_build_object(
    'default_vsk_pct',            24,
    'default_due_days',           10,
    'default_pickup_offset_days', 7
  )
))
ON CONFLICT (id) DO NOTHING;
