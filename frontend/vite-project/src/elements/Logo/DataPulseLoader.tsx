import styles from './DataPulseLoader.module.scss'

interface DataPulseLoaderProps {
    width?: number
    height?: number
}

export default function DataPulseLoader({ width = 80, height = 80 }: DataPulseLoaderProps) {
    return (
        <svg width={width} height={height} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Splitting the logo into logical groups for sequencing */}
            <path className={styles.animPulse1} d="M25 25 L50 37.5 L50 62.5 L25 50 Z" fill="#3B82F6" />
            <path className={styles.animPulse2} d="M25 25 L50 12.5 L75 25 L50 37.5 Z" fill="#60A5FA" />
            <path className={styles.animPulse3} d="M75 25 L50 37.5 L50 62.5 L75 50 Z" fill="#2563EB" />
            <g className={styles.animPulse4}>
                <path d="M50 62.5 L25 50 L25 75 L50 87.5 Z" fill="#1D4ED8" />
                <path d="M50 62.5 L75 50 L75 75 L50 87.5 Z" fill="#1E40AF" />
            </g>
        </svg>
    )
}
