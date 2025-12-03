interface HIPAAComplianceBadgeProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  className?: string;
}

export default function HIPAAComplianceBadge({ 
  size = 'medium', 
  showText = true,
  className = '' 
}: HIPAAComplianceBadgeProps) {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  const textSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  return (
    <div 
      className={`flex items-center gap-2 ${className}`}
      title="HIPAA Compliant - Protected Health Information is encrypted and secured"
    >
      {/* HIPAA Shield Icon */}
      <svg
        className={`${sizeClasses[size]} text-green-600`}
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shield shape */}
        <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3zm0 2.18l6 2.25v5.57c0 4.34-2.8 8.48-6 9.82-3.2-1.34-6-5.48-6-9.82V6.43l6-2.25z"/>
        {/* Checkmark */}
        <path 
          d="M10 14l-3-3 1.41-1.41L10 11.17l4.59-4.58L16 8l-6 6z"
          fill="white"
        />
      </svg>
      
      {showText && (
        <span className={`font-semibold text-green-700 ${textSizeClasses[size]}`}>
          HIPAA Compliant
        </span>
      )}
    </div>
  );
}




