import { useNavigate } from 'react-router-dom';
import { getPathParts } from '../../utils/pathUtils';
import styles from './breadcrumbs.module.scss';

interface BreadcrumbsProps {
    currentPath: string;
    basePath?: string; // базовый путь (по умолчанию /dashboard)
}

export default function Breadcrumbs({ currentPath, basePath = '/dashboard' }: BreadcrumbsProps) {
    const navigate = useNavigate();
    const pathParts = getPathParts(currentPath);

    const handleNavigate = (path: string) => {
        if (path === '/') {
            navigate(basePath);
        } else {
            navigate(`${basePath}?path=${encodeURIComponent(path)}`);
        }
    };

    return (
        <div className={styles.breadcrumbs}>
            {pathParts.map((part, index) => (
                <div key={part.path} className={styles.breadcrumbItem}>
                    <button
                        className={`${styles.breadcrumbLink} ${
                            index === pathParts.length - 1 ? styles.active : ''
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
