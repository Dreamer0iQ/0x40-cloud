import styles from './searchbar.module.scss'
import { useState } from 'react'

export default function SearchBar(){
    const [isExpanded, setIsExpanded] = useState(false)

    return(
        <header className={styles.searchBar}>
            <div className={`${styles.searchContainer} ${isExpanded ? styles.expanded : ''}`}>
                <button 
                    className={styles.searchButton}
                    onClick={() => setIsExpanded(!isExpanded)}
                    aria-label="Search"
                >
                    <svg width="24" height="24" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M37.384 37.3645L52.5 52.5M42.5 25C42.5 34.665 34.665 42.5 25 42.5C15.335 42.5 7.5 34.665 7.5 25C7.5 15.335 15.335 7.5 25 7.5C34.665 7.5 42.5 15.335 42.5 25Z" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
                
                <input 
                    className={styles.searchInput}
                    type="text"
                    placeholder="Search..."
                    onFocus={() => setIsExpanded(true)}
                />
            </div>
            <div className={styles.logo}>
                <svg width="40" height="40" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M60 10L90 30L80 60L60 80L40 60L30 30L60 10Z" stroke="#3B82F6" strokeWidth="3" fill="none"/>
                    <path d="M60 40L75 50L70 65L60 75L50 65L45 50L60 40Z" stroke="#60A5FA" strokeWidth="2" fill="none"/>
                </svg>
            </div>
        </header>
    )
}