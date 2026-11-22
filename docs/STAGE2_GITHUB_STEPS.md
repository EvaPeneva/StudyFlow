# Готови стъпки за GitHub — Ева + Михаела · Етап 2

**Важно: НЕ създавайте нов repository.** Работите в https://github.com/EvaPeneva/StudyFlow.

## Първо

1. И двете изтеглете последния общ проект от GitHub: Code → Download ZIP (или с `git pull`).
2. Ева и Михаела преглеждат отделно своите подготвени файлове, стартират ги локално и записват какво реално са проверили/редактирали.
3. Не качвайте пълния ZIP на проекта като един файл; качвайте **съдържанието на папките**.
4. Ако използвате VS Code с Git, се уверете, че имате последния `main` и не презаписвайте чуждите промени.

## Качване 1 — Ева (нейният профил)

Архив: `EVA_Etap2_Files.zip`. Вътре има **само нейния комплект файлове**:

- `index.html`, `style.css`, `README.md`;
- `src/locales/bg.js` и `src/locales/en.js`.

Влез в StudyFlow → **Add file → Upload files** → качи съдържанието от разархивирания ZIP **в корена** на хранилището. Провери пътищата (например `src/locales/bg.js`) → **Commit changes**.

**Предложено commit съобщение:** `Stage 2 - update responsive UI and BG EN`.

> Ако GitHub ви даде предупреждение за съществуващи файлове, използвайте VS Code + Git или редактирайте конкретния файл с моливчето; **не изтривайте папките**.

## Качване 2 — Михаела (нейният профил)

**След като Ева приключи**: Михаела обновява проекта от GitHub и качва/редактира:

- `script.js`, `src/supabase-config.js`, `database/schema.sql`;
- `design/ER_diagram.png`, `design/ER_diagram.svg`, `design/ER_diagram.mmd`;
- `docs/PROJECT_PLAN.md`, `docs/SUPABASE_SETUP.md`, `docs/TEACHER_TEST.md`, `docs/TEST_STAGE2.md`, `docs/WEEK_2_REPORT.md`;
- `docs/STAGE2_GITHUB_STEPS.md`.

**Предложено commit съобщение:** `Stage 2 - add Supabase schema RLS and data integration`.

**ОТДЕЛНА ДЕЙНОСТ, НЕ СТАВА С КАЧВАНЕ НА ZIP:** Михаела и Ева настройват истинската база в https://supabase.com/dashboard, пускат `schema.sql`, настройват **само публичните** URL/key, влизат с тестов акаунт и проверяват реално четене/запис. Едва след тези тестове отчетът може да твърди, че Supabase работи.

## GitHub Issues / Project

Проверете старите 12 Issues и маркирайте статуса според действителното състояние:

- #1 и #2 (начални екрани), #3 (BG/EN), #4 (адаптивност) — **Done** само след проверка.
- #7 (структура на DB) — **Done** след реално създаване на таблиците в Supabase.
- #9 (Auth), #10 (CRUD) — **In Progress** докато интеграцията е проверена; #8 (алгоритъм), #11 (графики), #12 (напомняния) могат да останат **Todo**.

## GitHub Pages (по желание)

Repository → **Settings → Pages → Build and deployment → Deploy from a branch → main → /(root) → Save**. Посочете получения адрес като демо **само след като го отворите и тествате**.

## Google Classroom

След окончателните проверки: GitHub + Issues линкове, демо или 3–5 истински снимки, ER, реални Supabase снимки, попълнен WEEK_2_REPORT, инструкции от TEACHER_TEST. Не публикувайте секрети или имейли на други ученици.
