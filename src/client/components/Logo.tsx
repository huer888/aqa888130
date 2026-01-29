export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-10 h-10 text-base',
    lg: 'w-16 h-16 text-2xl',
    xl: 'w-24 h-24 text-4xl'
  }

  return (
    <div className={`relative flex items-center justify-center font-black italic tracking-tighter ${sizeClasses[size]}`}>
      {/* Outer Hexagon Shape */}
      <div className="absolute inset-0 bg-primary rounded-lg transform rotate-3 shadow-lg shadow-primary/20"></div>
      <div className="absolute inset-0.5 bg-background rounded-lg transform rotate-3 flex items-center justify-center border border-primary/30">
         <span className="text-white transform -rotate-3">S</span>
      </div>
    </div>
  )
}
