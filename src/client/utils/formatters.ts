
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Brazilian Currency Formatter
export const formatBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value);
}

// Clean League Names for Brazilian Audience
export const cleanLeagueName = (name: string, country?: string) => {
    let clean = name.replace('Brazil - ', '').replace('Spain - ', '').replace('England - ', '');
    
    // Custom mappings
    if (name.includes('Serie A') && country?.includes('Brazil')) return 'Brasileirão Série A';
    if (name.includes('Serie B') && country?.includes('Brazil')) return 'Brasileirão Série B';
    if (name.includes('Primera Liga') && country?.includes('Spain')) return 'La Liga';
    if (name.includes('Bundesliga')) return 'Bundesliga';
    if (name.includes('Premier League')) return 'Premier League';
    if (name.includes('Champions League')) return 'Champions League';
    if (name.includes('Libertadores')) return 'Libertadores';
    
    return clean;
}
