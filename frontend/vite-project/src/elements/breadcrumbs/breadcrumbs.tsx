import { useNavigate } from 'react-router-dom';
import { getPathParts } from '../../utils/pathUtils';
import styles from './breadcrumbs.module.scss';
import { fileService } from '../../services/fileService';
import type { FileMetadata } from '../../types/file';
import { useToast } from '../../contexts/toastContext';

interface BreadcrumbsProps {
    currentPath: string;
    basePath?: string; // базовый путь (по умолчанию /dashboard)
    onFileMove?: () => void;
}

export default function Breadcrumbs({ currentPath, basePath = '/dashboard', onFileMove }: BreadcrumbsProps) {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const pathParts = getPathParts(currentPath);

    const handleNavigate = (path: string) => {
        if (path === '/') {
            navigate(basePath);
        } else {
            navigate(`${basePath}?path=${encodeURIComponent(path)}`);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetPath: string, targetName: string) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('application/json');
        if (!data) return;

        try {
            const draggedFile: FileMetadata = JSON.parse(data);
            if (draggedFile.mime_type === 'inode/directory') return; // Restriction for now

            // Normalize target path to end with slash if not root, actually normalized path from utils should handle it?
            // getPathParts returns path like "/" or "/Folder".
            // MoveFile expects "/Folder/" or "/"
            let destination = targetPath;
            if (destination !== '/' && !destination.endsWith('/')) {
                destination += '/';
            }

            // Check if we are dropping on the same folder file is currently in
            // This is hard to check without knowing file's current path, but file meta has virtual_path?
            // Actually file metadata usually has virtual_path.
            // If dragging from FileList, file.virtual_path is the directory it is in.
            // If destination === file.virtual_path, no op.

            if (destination === draggedFile.virtual_path) return;

            await fileService.moveFile(draggedFile.id, destination);
            addToast(`Moved ${draggedFile.original_name} to ${targetName}`, 'success');
            onFileMove?.();
        } catch (err) {
            console.error('Failed to move file to breadcrumb:', err);
            addToast('Failed to move file', 'error');
        }
    };

    return (
        <div className={styles.breadcrumbs}>
            {pathParts.map((part, index) => (
                <div
                    key={part.path}
                    className={styles.breadcrumbItem}
                    onDragOver={handleDragOver} // Add drag over listener
                    onDrop={(e) => handleDrop(e, part.path, part.name)} // Add drop listener
                >
                    <button
                        className={`${styles.breadcrumbLink} ${index === pathParts.length - 1 ? styles.active : ''
                            }`}
                        onClick={() => handleNavigate(part.path)}
                        disabled={index === pathParts.length - 1}
                    >
                        {part.name}
                    </button>
                    {index < pathParts.length - 1 && (
                        <span className={styles.separator}>/</span>
                    )}
                </div>
            ))}
        </div>
    );
}
