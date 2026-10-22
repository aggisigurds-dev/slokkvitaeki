-- 22.10.2026: skoðunarmánuður eins og hann stendur í skýrslunni sjálfri (Þjónustugáttin: Skoðanasaga).
-- Fyllt fyrir Heimaleigu (16 skýrslur) úr textanum „Tæki voru yfirfarin af Slökkvitæki ehf í <mánuður> <ár>“.
alter table customer_documents add column if not exists skodun_ar_man text;
