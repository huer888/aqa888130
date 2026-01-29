import { useState } from 'react'
import { TEAM_LOGOS } from '../utils/teamLogosData'

interface Props {
    name: string
    size?: number
    className?: string
}

export default function TeamLogo({ name, size = 24, className = '' }: Props) {
    const [error, setError] = useState(false)

    // Simple direct lookup
    const logoUrl = TEAM_LOGOS[name]

    // Simple shield fallback
    const shieldColor = '#' + Math.floor(name.split('').reduce((a,b)=>a+b.charCodeAt(0),0) * 16777215).toString(16).slice(0,6)
    const initials = name.slice(0, 2).toUpperCase()

    if (!error && logoUrl) {
        return (
            <img 
                src={logoUrl} 
                alt={name} 
                className={`object-contain ${className}`}
                style={{ width: size, height: size }}
                onError={() => setError(true)}
                loading="lazy"
            />
        )
    }

    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={`drop-shadow-sm ${className}`}
        >
            <path 
                d="M12 2L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 2Z" 
                fill={shieldColor} 
                fillOpacity="0.8"
                stroke="white"
                strokeWidth="1.5"
            />
            <text 
                x="12" 
                y="14" 
                textAnchor="middle" 
                fill="white" 
                fontSize="10" 
                fontWeight="900" 
                fontFamily="sans-serif"
            >
                {initials}
            </text>
        </svg>
    )
}
