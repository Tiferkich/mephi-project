-- Обновление структуры таблицы password_entries
-- Добавляем отдельные поля для сайта, логина, пароля и типа
-- Удаляем старое поле encrypted_data

-- Добавляем новые поля
ALTER TABLE password_entries 
ADD COLUMN encrypted_site TEXT NOT NULL DEFAULT '',
ADD COLUMN encrypted_login TEXT NOT NULL DEFAULT '',
ADD COLUMN encrypted_password TEXT NOT NULL DEFAULT '',
ADD COLUMN encrypted_type TEXT NOT NULL DEFAULT '';

-- Удаляем старое поле encrypted_data (если оно существует)
ALTER TABLE password_entries 
DROP COLUMN IF EXISTS encrypted_data; 