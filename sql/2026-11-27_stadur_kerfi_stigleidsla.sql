-- 27.11.2026 — „Stigleiðsla" sem kerfi í stadur_kerfi (Kerfi og þjónusta á prófílnum + gáttin).
-- Tilefni: Center Hótel óskaði 27.11.2026 eftir samningi um árlega yfirferð stigleiðslu á átta hótelum; kerfið var ekki til
-- í listanum. Viðmót: KERFI í js/patches/449a-flokkun-gogn.js, KERFI_ROD/KERFI_HEITI í gatt/portal.js, KERFI_LEYFD í gatt.cjs.
-- flokkar_krofur fær enga röð (v_stadur_kerfi notar LEFT JOIN): krafan ræðst af hæð húss (HMS-leiðb. 9.8.5), ekki tegund.
-- Þegar keyrt á grunninn 27.11.2026.
alter table stadur_kerfi drop constraint if exists stadur_kerfi_kerfi_check;
alter table stadur_kerfi add constraint stadur_kerfi_kerfi_check check (kerfi = any (array[
  'slokkvitaeki','slongukefli','reykskynjarar','brunavidvorunarkerfi','vatnsudakerfi','neydarlysing','utljos','reyklosun',
  'eldvarnarteppi','brunathettingar','eldvarnaeftirlit','slokkvikerfi_eldhus','rymingaruppdrattur','fjoldaskilti','stigleidsla']));
