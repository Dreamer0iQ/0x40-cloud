interface LogoMonochromeProps {
    width?: number
    height?: number
    color?: string
}

export default function LogoMonochrome({ width = 64, height = 64, color = '#0F172A' }: LogoMonochromeProps) {
    return (
        <svg width={width} height={height} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M25 25 L50 12.5 L75 25 L50 37.5 Z" stroke={color} strokeWidth="4" strokeLinejoin="round" />
            <path d="M25 25 L50 37.5 L50 62.5 L25 50 Z" stroke={color} strokeWidth="4" strokeLinejoin="round" />
            <path d="M75 25 L50 37.5 L50 62.5 L75 50 Z" stroke={color} strokeWidth="4" strokeLinejoin="round" />
            <path d="M50 62.5 L25 50 L25 75 L50 87.5 Z" stroke={color} strokeWidth="4" strokeLinejoin="round" />
            <path d="M50 62.5 L75 50 L75 75 L50 87.5 Z" stroke={color} strokeWidth="4" strokeLinejoin="round" />
        </svg>
    )
}
