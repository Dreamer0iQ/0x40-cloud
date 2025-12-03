-- Migration: Add starred_files table
-- Created: 2025-12-03

CREATE TABLE IF NOT EXISTS starred_files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    file_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    starred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_starred_files_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_starred_files_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_file UNIQUE (user_id, file_id)
);

CREATE INDEX idx_starred_files_user_id ON starred_files(user_id);
CREATE INDEX idx_starred_files_file_id ON starred_files(file_id);
CREATE INDEX idx_starred_files_starred_at ON starred_files(starred_at DESC);

COMMENT ON TABLE starred_files IS 'Stores user favorite/starred files';
COMMENT ON COLUMN starred_files.user_id IS 'ID of the user who starred the file';
COMMENT ON COLUMN starred_files.file_id IS 'ID of the starred file';
COMMENT ON COLUMN starred_files.starred_at IS 'When the file was added to favorites';
