import { useState, useEffect } from 'react'
import styles from './storageStats.module.scss'

interface StorageStatsProps {
    diskUsed: number      // в GB
    diskTotal: number     // в GB
    filesByType: {
        documents: number
        images: number
        videos: number
        other: number
    }
}

export default function StorageStats({ diskUsed, diskTotal, filesByType }: StorageStatsProps) {
    const [animatedDiskPercentage, setAnimatedDiskPercentage] = useState(0);
    const [animatedFiles, setAnimatedFiles] = useState({
        documents: 0,
        images: 0,
        videos: 0,
        other: 0
    });

    const diskPercentage = ((diskUsed / diskTotal) * 100);
    const totalFiles = Object.values(filesByType).reduce((sum, count) => sum + count, 0);

    // Анимация при загрузке
    useEffect(() => {
        const duration = 1500; // 1.5 секунды
        const steps = 60; // 60 кадров
        const interval = duration / steps;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;

            // Easing функция для плавности (ease-out)
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            // Анимация диска
            setAnimatedDiskPercentage(diskPercentage * easeProgress);

            // Анимация файлов
            setAnimatedFiles({
                documents: Math.round(filesByType.documents * easeProgress),
                images: Math.round(filesByType.images * easeProgress),
                videos: Math.round(filesByType.videos * easeProgress),
                other: Math.round(filesByType.other * easeProgress)
            });

            if (currentStep >= steps) {
                clearInterval(timer);
                // Устанавливаем точные значения в конце
                setAnimatedDiskPercentage(diskPercentage);
                setAnimatedFiles(filesByType);
            }
        }, interval);

        return () => clearInterval(timer);
    }, [diskUsed, diskTotal, filesByType, diskPercentage]);

    const animatedTotalFiles = Object.values(animatedFiles).reduce((sum, count) => sum + count, 0);

    // Расчет процентов для каждого типа файлов
    const getFileTypePercentage = (count: number) => {
        if (totalFiles === 0) return 0;
        return (count / totalFiles) * 100;
    };

    const documentsPercentage = getFileTypePercentage(animatedFiles.documents);
    const imagesPercentage = getFileTypePercentage(animatedFiles.images);
    const videosPercentage = getFileTypePercentage(animatedFiles.videos);


    // Угол для SVG круга (270 градусов = 75% круга)
    const getStrokeDasharray = (percentage: number) => {
        const circumference = 2 * Math.PI * 45; // радиус 45
        const dashLength = (percentage / 100) * circumference * 0.75; // 75% круга
        return `${dashLength} ${circumference}`;
    };

    return (
        <div className={styles.storageStats}>
            {/* Диск */}
            <div className={styles.statCard}>
                <svg className={styles.circleChart} viewBox="0 0 100 100">
                    <circle
                        className={styles.circleBackground}
                        cx="50"
                        cy="50"
                        r="45"
                    />
                    <circle
                        className={`${styles.circleProgress} ${styles.animated}`}
                        cx="50"
                        cy="50"
                        r="45"
                        style={{
                            strokeDasharray: getStrokeDasharray(animatedDiskPercentage),
                            stroke: animatedDiskPercentage > 80 ? '#EF4444' : '#10B981'
                        }}
                    />
                </svg>
                <div className={styles.percentage}>{animatedDiskPercentage.toFixed(1)}%</div>
                <div className={styles.label}>
                    Disk: {diskUsed.toFixed(2)} GB / {diskTotal.toFixed(2)} GB
                </div>
            </div>

            {/* Файлы по типам */}
            <div className={styles.statCard}>
                <svg className={styles.circleChart} viewBox="0 0 100 100">
                    <circle
                        className={styles.circleBackground}
                        cx="50"
                        cy="50"
                        r="45"
                    />
                    {/* Документы */}
                    <circle
                        className={`${styles.circleProgress} ${styles.animated}`}
                        cx="50"
                        cy="50"
                        r="45"
                        style={{
                            strokeDasharray: getStrokeDasharray(documentsPercentage),
                            stroke: '#3B82F6',
                            transform: 'rotate(135deg)',
                            transformOrigin: '50% 50%'
                        }}
                    />
                    {/* Изображения */}
                    <circle
                        className={`${styles.circleProgress} ${styles.animated}`}
                        cx="50"
                        cy="50"
                        r="45"
                        style={{
                            strokeDasharray: getStrokeDasharray(imagesPercentage),
                            stroke: '#10B981',
                            transform: `rotate(${135 + (documentsPercentage * 2.7)}deg)`,
                            transformOrigin: '50% 50%',
                            transitionDelay: '0.2s'
                        }}
                    />
                    {/* Видео */}
                    <circle
                        className={`${styles.circleProgress} ${styles.animated}`}
                        cx="50"
                        cy="50"
                        r="45"
                        style={{
                            strokeDasharray: getStrokeDasharray(videosPercentage),
                            stroke: '#EF4444',
                            transform: `rotate(${135 + ((documentsPercentage + imagesPercentage) * 2.7)}deg)`,
                            transformOrigin: '50% 50%',
                            transitionDelay: '0.4s'
                        }}
                    />
                </svg>
                <div className={styles.percentage}>{animatedTotalFiles}</div>
                <div className={styles.label}>Total Files</div>

                {/* <div className={styles.legend}>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ backgroundColor: '#3B82F6' }}></span>
                        <span>Docs: {animatedFiles.documents}</span>
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ backgroundColor: '#10B981' }}></span>
                        <span>Images: {animatedFiles.images}</span>
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ backgroundColor: '#EF4444' }}></span>
                        <span>Videos: {animatedFiles.videos}</span>
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ backgroundColor: '#808080' }}></span>
                        <span>Other: {animatedFiles.other}</span>
                    </div>
                </div> */}
            </div>
        </div>
    );
}
