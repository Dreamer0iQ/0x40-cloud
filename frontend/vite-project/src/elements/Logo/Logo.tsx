interface LogoProps {
    width?: number
    height?: number
}

export default function Logo({ width = 64, height = 64 }: LogoProps) {
    return (
        <svg width={width} height={height} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Left Blue Block */}
            <path d="M25 25 L50 37.5 L50 62.5 L25 50 Z" fill="#3B82F6" />
            <path d="M25 25 L50 12.5 L75 25 L50 37.5 Z" fill="#60A5FA" />

            {/* Right Darker Block */}
            <path d="M75 25 L50 37.5 L50 62.5 L75 50 Z" fill="#2563EB" />

            {/* Bottom Center Block (The "Base") */}
            <path d="M50 62.5 L25 50 L25 75 L50 87.5 Z" fill="#1D4ED8" />
            <path d="M50 62.5 L75 50 L75 75 L50 87.5 Z" fill="#1E40AF" />

            {/* Floating "Data" bit (Top) */}
            <rect x="42" y="5" width="16" height="16" transform="rotate(45 50 13)" fill="#93C5FD" className="opacity-80" />
        </svg>
    )
}
