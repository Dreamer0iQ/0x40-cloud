import { useState, useEffect, useRef } from 'react';
import styles from './folderNameModal.module.scss';

interface FolderNameModalProps {
    isOpen: boolean;
    defaultName: string;
    onConfirm: (folderName: string) => void;
    onCancel: () => void;
}

export default function FolderNameModal({ isOpen, defaultName, onConfirm, onCancel }: FolderNameModalProps) {
    const [folderName, setFolderName] = useState(defaultName);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setFolderName(defaultName);
            // Фокусируемся на input и выделяем текст
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 100);
        }
    }, [isOpen, defaultName]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (folderName.trim()) {
            onConfirm(folderName.trim());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel();
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h2 className={styles.title}>Name your folder</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        type="text"
                        className={styles.input}
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter folder name..."
                        maxLength={100}
                    />
                    <div className={styles.buttons}>
                        <button
                            type="button"
                            className={styles.cancelButton}
                            onClick={onCancel}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.confirmButton}
                            disabled={!folderName.trim()}
                        >
                            Upload
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
