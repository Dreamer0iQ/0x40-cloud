import styles from './searchbar.module.scss'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fileService } from '../../services/fileService'
import type { FileMetadata } from '../../types/file'

export default function SearchBar() {
    const [isExpanded, setIsExpanded] = useState(false)
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<FileMetadata[]>([])
    const [loading, setLoading] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const navigate = useNavigate()

    // Debounced search
    useEffect(() => {
        if (!query.trim()) {
            setResults([])
            setShowResults(false)
            return
        }

        const timeoutId = setTimeout(async () => {
            setLoading(true)
            try {
                const files = await fileService.searchFiles(query, 10)
                setResults(files)
                setShowResults(true)
            } catch (error) {
                console.error('Search failed:', error)
                setResults([])
            } finally {
                setLoading(false)
            }
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [query])

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowResults(false)
                if (!query) {
                    setIsExpanded(false)
                }
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [query])

    const handleResultClick = useCallback((file: FileMetadata) => {
        // Navigate to the file's folder with the file ID as a query param for preview
        const folderPath = file.virtual_path || '/'
        navigate(`/storage?path=${encodeURIComponent(folderPath)}&preview=${file.id}`)
        setShowResults(false)
        setQuery('')
        setIsExpanded(false)
    }, [navigate])

    const handleSearchClick = () => {
        setIsExpanded(!isExpanded)
        if (!isExpanded) {
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return '🖼️'
        if (mimeType.startsWith('video/')) return '🎬'
        if (mimeType.includes('pdf')) return '📄'
        if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊'
        if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦'
        if (mimeType.startsWith('text/')) return '📃'
        return '📁'
    }

    const formatPath = (path: string) => {
        if (!path || path === '/') return 'Root'
        return path.replace(/^\//, '').replace(/\/$/, '').split('/').pop() || 'Root'
    }

    return (
        <header className={styles.searchBar}>
            <div
                ref={containerRef}
                className={`${styles.searchContainer} ${isExpanded ? styles.expanded : ''}`}
            >
                <button
                    className={styles.searchButton}
                    onClick={handleSearchClick}
                    aria-label="Search"
                >
                    <svg width="24" height="24" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M37.384 37.3645L52.5 52.5M42.5 25C42.5 34.665 34.665 42.5 25 42.5C15.335 42.5 7.5 34.665 7.5 25C7.5 15.335 15.335 7.5 25 7.5C34.665 7.5 42.5 15.335 42.5 25Z" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                <input
                    ref={inputRef}
                    className={styles.searchInput}
                    type="text"
                    placeholder="Search files..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                        setIsExpanded(true)
                        if (query && results.length > 0) {
                            setShowResults(true)
                        }
                    }}
                />

                {/* Results dropdown */}
                {showResults && isExpanded && (
                    <div className={styles.resultsDropdown}>
                        {loading ? (
                            <div className={styles.loadingState}>
                                <div className={styles.spinner}></div>
                                <span>Searching...</span>
                            </div>
                        ) : results.length > 0 ? (
                            <>
                                <div className={styles.resultsHeader}>
                                    Found {results.length} file{results.length > 1 ? 's' : ''}
                                </div>
                                {results.map((file) => (
                                    <div
                                        key={file.id}
                                        className={styles.resultItem}
                                        onClick={() => handleResultClick(file)}
                                    >
                                        <span className={styles.fileIcon}>
                                            {getFileIcon(file.mime_type)}
                                        </span>
                                        <div className={styles.fileInfo}>
                                            <span className={styles.fileName}>{file.original_name}</span>
                                            <span className={styles.filePath}>
                                                in {formatPath(file.virtual_path)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : query ? (
                            <div className={styles.emptyState}>
                                No files found for "{query}"
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
            <div className={styles.logo}>
                <svg width="40" height="40" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M60 10L90 30L80 60L60 80L40 60L30 30L60 10Z" stroke="#3B82F6" strokeWidth="3" fill="none" />
                    <path d="M60 40L75 50L70 65L60 75L50 65L45 50L60 40Z" stroke="#60A5FA" strokeWidth="2" fill="none" />
                </svg>
            </div>
        </header>
    )
}