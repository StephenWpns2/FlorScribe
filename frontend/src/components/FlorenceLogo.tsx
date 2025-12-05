interface FlorenceLogoProps {
  showSlogan?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function FlorenceLogo({ showSlogan = true, size = 'medium' }: FlorenceLogoProps) {
  const sizeClasses = {
    small: 'text-lg',
    medium: 'text-2xl',
    large: 'text-3xl',
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {/* Logo Icon - Simple medical/healthcare icon */}
        <div
          className="rounded-lg flex items-center justify-center font-bold text-white"
          style={{
            backgroundColor: '#42D7D7',
            width: size === 'small' ? '32px' : size === 'medium' ? '40px' : '48px',
            height: size === 'small' ? '32px' : size === 'medium' ? '40px' : '48px',
          }}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h1 className={`${sizeClasses[size]} font-bold`} style={{ color: '#42D7D7' }}>
          Flor Scribe
        </h1>
      </div>
      {showSlogan && (
        <span className="text-sm text-gray-600 hidden md:inline">
          Intelligent Clinical Documentation
        </span>
      )}
    </div>
  );
}


