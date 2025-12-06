import { useEffect, useState, useRef } from 'react';
import type { FileMetadata } from '../../types/file';
import { fileService } from '../../services/fileService';
import styles from './filePreview.module.scss';
import { renderAsync } from 'docx-preview';
import { read, utils } from 'xlsx';

interface FilePreviewProps {
    file: FileMetadata;
    onClose: () => void;
}

export default function FilePreview({ file, onClose }: FilePreviewProps) {
    const [contentUrl, setContentUrl] = useState<string | null>(null);
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [blobContent, setBlobContent] = useState<Blob | null>(null);
    const [previewType, setPreviewType] = useState<'image' | 'text' | 'docx' | 'excel' | 'none'>('none');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const docxContainerRef = useRef<HTMLDivElement>(null);

    const isImage = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'heic'].includes(ext || '');
    };

    const isTextOrCode = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const textExtensions = [
            'txt', 'md', 'json', 'xml', 'yaml', 'yml', 'csv', 'log',
            'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'less',
            'py', 'go', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'rs', 'rb', 'php',
            'sh', 'bash', 'zsh', 'sql', 'ini', 'conf', 'env', 'gitignore', 'dockerfile'
        ];
        return textExtensions.includes(ext);
    };

    const isDocx = (filename: string) => {
        return filename.toLowerCase().endsWith('.docx');
    };

    const isExcel = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        return ['xlsx', 'xls', 'csv'].includes(ext || '');
    };

    useEffect(() => {
        const loadContent = async () => {
            setLoading(true);
            setError(null);
            setPreviewType('none');

            try {
                if (isImage(file.original_name)) {
                    const blob = await fileService.previewFile(file.id);
                    const url = URL.createObjectURL(blob);
                    setContentUrl(url);
                    setPreviewType('image');
                } else if (isDocx(file.original_name)) {
                    const blob = await fileService.previewFile(file.id);
                    setBlobContent(blob);
                    setPreviewType('docx');
                } else if (isExcel(file.original_name)) {
                    const blob = await fileService.previewFile(file.id);
                    const arrayBuffer = await blob.arrayBuffer();
                    const wb = read(arrayBuffer);
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const html = utils.sheet_to_html(ws);
                    setHtmlContent(html);
                    setPreviewType('excel');
                } else if (isTextOrCode(file.original_name)) {
                    const blob = await fileService.previewFile(file.id);
                    const text = await blob.text();
                    setContentUrl(text);
                    setPreviewType('text');
                } else {
                    setPreviewType('none');
                }
            } catch (err) {
                console.error('Failed to load preview:', err);
                setError('Failed to load preview');
            } finally {
                setLoading(false);
            }
        };

        loadContent();

        return () => {
            if (contentUrl && isImage(file.original_name)) {
                URL.revokeObjectURL(contentUrl);
            }
        };
    }, [file.id]);

    useEffect(() => {
        if (previewType === 'docx' && blobContent && docxContainerRef.current) {
            renderAsync(blobContent, docxContainerRef.current, docxContainerRef.current, {
                className: styles.docxWrapper,
                inWrapper: false
            }).catch(err => {
                console.error('Failed to render DOCX:', err);
                setError('Failed to render document');
            });
        }
    }, [previewType, blobContent]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' || e.key === ' ') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        // Focus the modal to ensure key events are captured if needed, 
        // though window listener handles it globally.
        modalRef.current?.focus();

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const getFileExtension = (filename: string) => {
        return filename.split('.').pop()?.toUpperCase() || 'FILE';
    };

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal} tabIndex={-1} ref={modalRef}>
                <div className={styles.header}>
                    <div className={styles.title}>{file.original_name}</div>
                    <div className={styles.actions}>
                        <button onClick={() => fileService.downloadFile(file.id, file.original_name)} title="Download">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M7 10L12 15M12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <button onClick={onClose} title="Close">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className={styles.content}>
                    {loading ? (
                        <div className={styles.genericPreview}>
                            <div className={styles.loading}>Loading preview...</div>
                        </div>
                    ) : error ? (
                        <div className={styles.genericPreview}>
                            <p>{error}</p>
                        </div>
                    ) : previewType === 'image' && contentUrl ? (
                        <img src={contentUrl} alt={file.original_name} className={styles.imagePreview} />
                    ) : previewType === 'text' && contentUrl ? (
                        <div className={styles.textPreview}>
                            {contentUrl}
                        </div>
                    ) : previewType === 'docx' ? (
                        <div ref={docxContainerRef} className={styles.documentPreview} />
                    ) : previewType === 'excel' && htmlContent ? (
                        <div
                            className={styles.documentPreview}
                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />
                    ) : (
                        <div className={styles.genericPreview}>
                            <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M47.5 22.5V44.5C47.5 47.3002 47.5 48.7005 46.955 49.77C46.4757 50.7108 45.7108 51.4757 44.77 51.955C43.7005 52.5 42.3003 52.5 39.5 52.5H20.5C17.6997 52.5 16.2996 52.5 15.2301 51.955C14.2892 51.4757 13.5243 50.7108 13.045 49.77C12.5 48.7005 12.5 47.3002 12.5 44.5V15.5C12.5 12.6997 12.5 11.2996 13.045 10.2301C13.5243 9.28923 14.2892 8.52432 15.2301 8.04497C16.2996 7.5 17.6997 7.5 20.5 7.5H32.5M47.5 22.5L32.5 7.5M47.5 22.5H35C33.6193 22.5 32.5 21.3807 32.5 20V7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className={styles.fileType}>{getFileExtension(file.original_name)}</span>
                            <p>Preview not available</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
