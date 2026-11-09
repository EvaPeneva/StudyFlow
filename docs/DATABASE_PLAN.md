# DATABASE_PLAN — начален ER модел

**Етап 1: това е модел, а не вече създадена база.** Предложени са **5 свързани таблици** (изискването е минимум 3). Схемата е показана в `../design/ER_diagram.png` и в редактируем формат `../design/ER_diagram.mmd`. Предварителен SQL за бъдещ етап има в `../database/schema.sql`.

## Таблици

| Таблица | Полета (типове) | Първичен ключ | Външни ключове и връзки |
|---|---|---|---|
| `profiles` | `id UUID`, `display_name TEXT`, `created_at TIMESTAMPTZ` | `id` | `id → auth.users.id` (1:1 с акаунт от Supabase Auth) |
| `subjects` | `id UUID`, `user_id UUID`, `name TEXT`, `color TEXT` | `id` | `user_id → profiles.id` (1 потребител → много предмети) |
| `tasks` | `id UUID`, `user_id UUID`, `subject_id UUID`, `title TEXT`, `description TEXT`, `due_date DATE`, `priority SMALLINT`, `estimated_minutes INT`, `is_completed BOOLEAN` | `id` | `user_id → profiles.id`; `subject_id → subjects.id` (1 предмет → много задачи) |
| `reminders` | `id UUID`, `user_id UUID`, `task_id UUID`, `remind_at TIMESTAMPTZ`, `is_sent BOOLEAN` | `id` | `user_id → profiles.id`, `task_id → tasks.id` (1 задача → много напомняния) |
| `task_tags` | `id UUID`, `user_id UUID`, `task_id UUID`, `label TEXT` | `id` | `user_id → profiles.id`, `task_id → tasks.id` (1 задача → много етикети) |

## Ограничения

- Първичните ключове са `UUID`, за да се избегне повторение между различни устройства.
- Задача задължително има заглавие, предмет, срок и приоритет от 1 до 3.
- Продължителността се задава в минути (планирано ограничение 1–1440).
- `subjects` е уникално по `(user_id, name)`.
- В `tasks`, `reminders` и `task_tags` връзките ще проверяват и собственика на записа, за да не може задача на един потребител да сочи предмет на друг.
- В Supabase ще бъдат активирани **RLS** политики за четене/запис/редакция/изтриване само на собствените редове.
- Преди реално използване SQL скриптът ще се тества с поне два различни потребителски акаунта.

## Защо точно тези таблици?

`profiles` идентифицира ученика, `subjects` описва учебните предмети, `tasks` пази отделните домашни и срокове, `reminders` планира бъдещи известия, а `task_tags` позволява допълнителни етикети за подреждане. Това покрива нужните данни, без да се създава ненужна сложност в Етап 1.
