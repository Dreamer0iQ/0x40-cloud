import DataPulseLoader from '../Logo/DataPulseLoader'
import styles from './FullPageLoader.module.scss'

export default function FullPageLoader() {
    return (
        <div className={styles.fullPageLoader}>
            <DataPulseLoader width={80} height={80} />
        </div>
    )
}
