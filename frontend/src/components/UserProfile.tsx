import { useState, useRef, useEffect } from 'react';

interface UserProfileProps {
  user: {
    email: string;
    name?: string | null;
  } | null;
  size?: 'small' | 'medium' | 'large';
  onPricingClick?: () => void;
  onLogoutClick?: () => void;
  onHIPAAClick?: () => void;
  showMobileMenu?: boolean;
}

export default function UserProfile({ 
  user, 
  size = 'medium',
  onPricingClick,
  onLogoutClick,
  onHIPAAClick,
  showMobileMenu = false
}: UserProfileProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  if (!user) return null;

  const getInitials = (name: string | null | undefined, email: string): string => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    // Fallback to email initials
    const emailParts = email.split('@')[0];
    return emailParts.substring(0, 2).toUpperCase();
  };

  const getDisplayName = (): string => {
    if (user.name) {
      return user.name;
    }
    return user.email.split('@')[0];
  };

  const sizeClasses = {
    small: 'w-8 h-8 text-xs',
    medium: 'w-10 h-10 text-sm',
    large: 'w-12 h-12 text-base',
  };

  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  const initials = getInitials(user.name, user.email);
  const displayName = getDisplayName();

  const handleClick = () => {
    if (showMobileMenu) {
      setIsMenuOpen(!isMenuOpen);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <div 
        className="flex items-center gap-3 cursor-pointer md:cursor-default"
        onClick={handleClick}
      >
        <div
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold text-white`}
          style={{ backgroundColor: '#42D7D7' }}
          title={user.email}
        >
          {initials}
        </div>
        <span className={`${textSizeClasses[size]} font-medium hidden md:inline`} style={{ color: '#42D7D7' }}>
          {displayName}
        </span>
      </div>

      {/* Mobile Menu Dropdown */}
      {showMobileMenu && isMenuOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border-2 z-50" style={{ borderColor: '#42D7D7' }}>
          <div className="p-4 border-b border-gray-200">
            <div className="font-semibold text-gray-900">{displayName}</div>
            <div className="text-sm text-gray-600 mt-1">{user.email}</div>
          </div>
          
          {onHIPAAClick && (
            <div className="p-3 border-b border-gray-200">
              <button
                onClick={() => {
                  onHIPAAClick();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left text-sm text-gray-700 hover:bg-gray-50 p-2 rounded"
              >
                HIPAA Compliant
              </button>
            </div>
          )}
          
          {onPricingClick && (
            <div className="p-3 border-b border-gray-200">
              <button
                onClick={() => {
                  onPricingClick();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left text-sm text-gray-700 hover:bg-gray-50 p-2 rounded"
              >
                Pricing
              </button>
            </div>
          )}
          
          {onLogoutClick && (
            <div className="p-3">
              <button
                onClick={() => {
                  onLogoutClick();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left text-sm text-white p-2 rounded"
                style={{ backgroundColor: '#42D7D7' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3BC5C5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#42D7D7'}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


