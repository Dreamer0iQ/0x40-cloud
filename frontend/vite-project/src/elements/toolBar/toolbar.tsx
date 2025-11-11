import styles from './toolbar.module.scss'
import type { ReactNode } from 'react'

interface ToolBarProps {
    children?: ReactNode
}

export default function ToolBar({ children }: ToolBarProps){
    return (
        <>
            <div className={styles.toolbar}>
                <div className={styles.logo}>
                    <svg width="50" height="50" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M60 10L90 30L80 60L60 80L40 60L30 30L60 10Z" stroke="#3B82F6" strokeWidth="3" fill="none"/>
                        <path d="M60 40L75 50L70 65L60 75L50 65L45 50L60 40Z" stroke="#60A5FA" strokeWidth="2" fill="none"/>
                    </svg>
                </div>

                <button className={`${styles.iconButton} ${styles.active}`}>
                    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.5 42.4998H37.5M7.5 36.4998V30.3253C7.5 27.4535 7.5 26.0175 7.87013 24.6952C8.198 23.5238 8.73682 22.4222 9.46012 21.4442C10.2767 20.3402 11.4101 19.4587 13.6769 17.6956L20.1769 12.64C23.6902 9.90746 25.4468 8.54121 27.3865 8.01601C29.098 7.55261 30.902 7.55261 32.6135 8.01601C34.5532 8.54121 36.3098 9.90748 39.823 12.64L46.323 17.6956C48.59 19.4587 49.7233 20.3402 50.5398 21.4442C51.2633 22.4222 51.802 23.5238 52.1298 24.6952C52.5 26.0175 52.5 27.4535 52.5 30.3253V36.4998C52.5 42.1003 52.5 44.9008 51.41 47.0398C50.4512 48.9213 48.9215 50.4513 47.04 51.41C44.9007 52.4998 42.1005 52.4998 36.5 52.4998H23.5C17.8995 52.4998 15.0992 52.4998 12.9601 51.41C11.0785 50.4513 9.54868 48.9213 8.58993 47.0398C7.5 44.9008 7.5 42.1003 7.5 36.4998Z" stroke="black" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                
                <button className={styles.iconButton}>
                    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M47.5 22.5V44.5C47.5 47.3002 47.5 48.7005 46.955 49.77C46.4757 50.7108 45.7108 51.4757 44.77 51.955C43.7005 52.5 42.3003 52.5 39.5 52.5H20.5C17.6997 52.5 16.2996 52.5 15.2301 51.955C14.2892 51.4757 13.5243 50.7108 13.045 49.77C12.5 48.7005 12.5 47.3002 12.5 44.5V15.5C12.5 12.6997 12.5 11.2996 13.045 10.2301C13.5243 9.28923 14.2892 8.52432 15.2301 8.04497C16.2996 7.5 17.6997 7.5 20.5 7.5H32.5M47.5 22.5L32.5 7.5M47.5 22.5H35C33.6193 22.5 32.5 21.3807 32.5 20V7.5" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>

                <button className={styles.iconButton}>
                    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M30 17.5V30H37.5M52.5 30C52.5 42.4265 42.4265 52.5 30 52.5C17.5736 52.5 7.5 42.4265 7.5 30C7.5 17.5736 17.5736 7.5 30 7.5C42.4265 7.5 52.5 17.5736 52.5 30Z" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
                
                <button className={styles.iconButton}>
                    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M30 7.5L35.0892 20.4038C35.559 21.595 35.7938 22.1905 36.1535 22.6927C36.4723 23.1379 36.862 23.5277 37.3073 23.8465C37.8095 24.2061 38.405 24.441 39.5963 24.9108L52.5 30L39.5963 35.0892C38.405 35.559 37.8095 35.7938 37.3073 36.1535C36.862 36.4723 36.4723 36.862 36.1535 37.3073C35.7938 37.8095 35.559 38.405 35.0892 39.5963L30 52.5L24.9108 39.5963C24.441 38.405 24.2061 37.8095 23.8465 37.3073C23.5277 36.862 23.1379 36.4723 22.6927 36.1535C22.1905 35.7938 21.595 35.559 20.4038 35.0892L7.5 30L20.4038 24.9108C21.595 24.441 22.1905 24.2061 22.6927 23.8465C23.1379 23.5277 23.5277 23.1379 23.8465 22.6927C24.2061 22.1905 24.441 21.595 24.9108 20.4038L30 7.5Z" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>

                <button className={styles.iconButton}>
                    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M34.1178 40.9375L30.2395 37.4058C28.3378 35.6735 27.3867 34.8075 26.309 34.4795C25.3597 34.1905 24.3461 34.1905 23.3969 34.4795C22.3192 34.8075 21.3682 35.6735 19.4663 37.4058L12.301 43.8938M34.1178 40.9375L34.9075 40.2182C36.8095 38.486 37.7605 37.62 38.838 37.292C39.7873 37.003 40.801 37.003 41.75 37.292C42.8278 37.62 43.7788 38.486 45.6808 40.2182L48.5593 42.724M34.1178 40.9375L42.6172 48.632M42.5 22.5C42.5 25.2615 40.2615 27.5 37.5 27.5C34.7385 27.5 32.5 25.2615 32.5 22.5C32.5 19.7386 34.7385 17.5 37.5 17.5C40.2615 17.5 42.5 19.7386 42.5 22.5ZM52.5 30C52.5 42.4265 42.4265 52.5 30 52.5C17.5736 52.5 7.5 42.4265 7.5 30C7.5 17.5736 17.5736 7.5 30 7.5C42.4265 7.5 52.5 17.5736 52.5 30Z" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>

                <button className={styles.iconButton}>
                    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.5 30C22.5 33.4517 19.7018 36.25 16.25 36.25C12.7982 36.25 10 33.4517 10 30C10 26.5483 12.7982 23.75 16.25 23.75C19.7018 23.75 22.5 26.5483 22.5 30Z" stroke="currentColor" strokeWidth="3.75"/>
                        <path d="M35 16.25L22.5 25" stroke="currentColor" strokeWidth="3.75" strokeLinecap="round"/>
                        <path d="M35 43.75L22.5 35" stroke="currentColor" strokeWidth="3.75" strokeLinecap="round"/>
                        <path d="M47.5 46.25C47.5 49.7017 44.7017 52.5 41.25 52.5C37.7983 52.5 35 49.7017 35 46.25C35 42.7983 37.7983 40 41.25 40C44.7017 40 47.5 42.7983 47.5 46.25Z" stroke="currentColor" strokeWidth="3.75"/>
                        <path d="M47.5 13.75C47.5 17.2018 44.7017 20 41.25 20C37.7983 20 35 17.2018 35 13.75C35 10.2982 37.7983 7.5 41.25 7.5C44.7017 7.5 47.5 10.2982 47.5 13.75Z" stroke="currentColor" strokeWidth="3.75"/>
                    </svg>
                </button>

                    <button className={styles.iconButton}>
                        <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 15H50M40 15L39.3235 12.9702C38.6677 11.0031 38.3398 10.0196 37.7318 9.29245C37.1948 8.65032 36.5052 8.1533 35.7262 7.84695C34.844 7.5 33.8075 7.5 31.734 7.5H28.266C26.1925 7.5 25.156 7.5 24.2738 7.84695C23.4948 8.1533 22.8052 8.65032 22.2682 9.29245C21.6601 10.0196 21.3323 11.0031 20.6766 12.9702L20 15M45 15V40.5C45 44.7005 45 46.8005 44.1825 48.405C43.4635 49.8162 42.3162 50.9635 40.905 51.6825C39.3005 52.5 37.2005 52.5 33 52.5H27C22.7996 52.5 20.6994 52.5 19.0951 51.6825C17.6839 50.9635 16.5365 49.8162 15.8175 48.405C15 46.8005 15 44.7005 15 40.5V15M35 25V42.5M25 25V42.5" stroke="black" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>

                <div className={styles.bottomSection}>
                    <button className={styles.themeToggle}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="#FFFFFF" strokeWidth="2" fill="none"/>
                        </svg>
                    </button>
                </div>
            </div>
            {children && <div className={styles.childrenContainer}>{children}</div>}
            
        </>

    )
}