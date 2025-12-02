/**
 * Утилиты для безопасной работы с виртуальными путями
 */

/**
 * Очищает путь от опасных символов и последовательностей
 */
export const sanitizePath = (path: string): string => {
    if (!path) return '/';
    
    return path
        .replace(/\.\./g, '')  // Убираем ../
        .replace(/\\/g, '/')   // Заменяем \ на /
        .replace(/\/+/g, '/')  // Убираем множественные /
        .replace(/^\/+/, '/')  // Оставляем только один / в начале
        .replace(/\/+$/, '')   // Убираем / в конце
        .trim();
};

/**
 * Проверяет, является ли путь валидным
 */
export const isValidPath = (path: string): boolean => {
    if (!path) return true;
    
    const validPattern = /^[a-zA-Z0-9а-яА-ЯёЁ\s\-_\/\.\(\),&'\+\[\]!@#№%]+$/;
    
    const hasPathTraversal = /\.\./.test(path);
    const hasNullByte = /\0/.test(path);
    
    return validPattern.test(path) && !hasPathTraversal && !hasNullByte;
};

export const normalizePath = (path: string): string => {
    if (!path || path === '/') return '/';
    
    const sanitized = sanitizePath(path);
    
    if (!isValidPath(sanitized)) {
        console.warn('Invalid path detected, returning root:', path);
        return '/';
    }
    
    // Убираем пустые части
    const parts = sanitized.split('/').filter(Boolean);
    
    // Ограничиваем глубину (максимум 10 уровней)
    const maxDepth = 10;
    if (parts.length > maxDepth) {
        console.warn('Path too deep, truncating:', path);
        return '/' + parts.slice(0, maxDepth).join('/') + '/';
    }
    
    // Backend expects paths to end with / (except root which is already /)
    return parts.length > 0 ? '/' + parts.join('/') + '/' : '/';
};

export const getPathParts = (path: string): Array<{ name: string; path: string }> => {
    const normalizedPath = normalizePath(path);
    
    if (normalizedPath === '/') {
        return [{ name: 'Home', path: '/' }];
    }
    
    const parts = normalizedPath.split('/').filter(Boolean);
    const result = [{ name: 'Home', path: '/' }];
    
    let currentPath = '';
    for (const part of parts) {
        currentPath += '/' + part;
        result.push({
            name: part,
            path: currentPath + '/' // Ensure trailing slash for consistency
        });
    }
    
    return result;
};

/**
 * Объединяет части пути
 */
export const joinPath = (...parts: string[]): string => {
    const joined = parts.join('/');
    return normalizePath(joined);
};

/**
 * Получает родительский путь
 */
export const getParentPath = (path: string): string => {
    const normalized = normalizePath(path);
    
    if (normalized === '/') return '/';
    
    const parts = normalized.split('/').filter(Boolean);
    parts.pop();
    
    return parts.length > 0 ? '/' + parts.join('/') + '/' : '/';
};
