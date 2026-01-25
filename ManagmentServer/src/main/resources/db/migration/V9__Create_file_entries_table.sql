-- ============================================================================
-- V9: Создание таблицы file_entries для хранения зашифрованных файлов
-- ============================================================================

CREATE TABLE file_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Зашифрованные метаданные файла
    encrypted_name TEXT NOT NULL,
    encrypted_mime_type TEXT NOT NULL,
    
    -- Зашифрованные данные файла
    encrypted_data BYTEA NOT NULL,
    
    -- Размеры
    original_size BIGINT NOT NULL,
    encrypted_size BIGINT NOT NULL,
    
    -- SHA-256 хеш для проверки целостности и дедупликации
    checksum VARCHAR(64) NOT NULL,
    
    -- Поля для сканирования на вирусы (VirusTotal)
    scan_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    scan_result TEXT,
    virus_total_analysis_id VARCHAR(255),
    threats_found INTEGER DEFAULT 0,
    scanned_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX idx_file_entries_user_id ON file_entries(user_id);
CREATE INDEX idx_file_entries_checksum ON file_entries(checksum);
CREATE INDEX idx_file_entries_scan_status ON file_entries(scan_status);
CREATE INDEX idx_file_entries_created_at ON file_entries(created_at DESC);

-- Комментарии
COMMENT ON TABLE file_entries IS 'Зашифрованные файлы пользователей с проверкой на вирусы';
COMMENT ON COLUMN file_entries.encrypted_name IS 'Зашифрованное имя файла (JSON: {data, iv, algorithm})';
COMMENT ON COLUMN file_entries.encrypted_data IS 'Зашифрованные данные файла (ГОСТ 34.12-2018)';
COMMENT ON COLUMN file_entries.checksum IS 'SHA-256 хеш оригинального файла';
COMMENT ON COLUMN file_entries.scan_status IS 'Статус проверки: NOT_SCANNED, PENDING, CLEAN, INFECTED, ERROR';
COMMENT ON COLUMN file_entries.virus_total_analysis_id IS 'ID анализа в VirusTotal API для polling';

