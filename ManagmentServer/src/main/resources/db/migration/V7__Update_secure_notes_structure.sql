-- Обновление структуры таблицы secure_notes
-- Добавляем поле для типа заметки

-- Добавляем новое поле encrypted_type
ALTER TABLE secure_notes 
ADD COLUMN encrypted_type TEXT NOT NULL DEFAULT ''; 