-- 23.10.2026: tækjafjöldi alls eins og hann stendur í skýrslunni (Þjónustugáttin: Skýrslur → „Tæki“ og eignasíðan).
-- Agnar: „sýna upplýsingar, heimilisfang, einingar, heildarfjölda tækja, mánuð skoðunar".
-- Aðeins gatt.cjs les dálkinn. Keyrt með apply_migration 23.10.2026.
alter table customer_documents add column if not exists skyrsla_taeki_alls integer;
comment on column customer_documents.skyrsla_taeki_alls is 'Tækjafjöldi alls í skýrslunni (lesið úr PDF). Les: gatt.cjs (Skýrslur, Magn).';

-- Fyllt sama dag fyrir aðganga gáttarinnar (portal_users):
--   * 22 úttektarskýrslur án mánaðar: skodun_ar_man + skyrsla_taeki_alls úr tools/lesa-skyrslur-drive.cjs
--     (PDF-textinn „Tæki voru yfirfarin af Slökkvitæki ehf í <mánuður> <ár>"), aðeins þar sem árið stemmdi við skjalið.
--   * 3 skýrslur (1783, 1795, 1891) báru skodun_ar_man 2026-08 þótt textinn segði „ágúst 2025" → 2025-08.
--     Sama villa stendur í arsskodun_report_facts.report_year fyrir þessar raðir (2026) — ekki lagað hér.
--   * 16 skýrslur fengu skyrsla_taeki_alls úr arsskodun_report_facts.total_devices (source_doc_id).
-- Afrit af fyrri gildum: scratchpad skodun-man/afrit-skodun_ar_man-20261023.json (öll null nema 1783/1795/1891 = 2026-08).
