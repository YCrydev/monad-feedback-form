import {  useLogout, useLogin } from "@privy-io/react-auth";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

interface NavbarProps {
  variant?: 'main' | 'admin';
  title?: string;
  showAdminLink?: boolean;
  showBackLink?: boolean;
  backLink?: string;
  walletAddress?: string;
  balance?: string;
  isBalanceLoading?: boolean;
  onRefreshBalance?: () => void;
  showDropdown?: boolean;
  onToggleDropdown?: () => void;
}

export default function Navbar({
  variant = 'main',
  title,
  showAdminLink = true,
  showBackLink = false,
  backLink,
  walletAddress = "",
  balance = "0",
  isBalanceLoading = false,
  onRefreshBalance,
  showDropdown,
  onToggleDropdown
}: NavbarProps) {
  const { logout } = useLogout();
  const { login } = useLogin();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [internalShowDropdown, setInternalShowDropdown] = useState(false);
  
  // Use internal state if external state not provided
  const isDropdownOpen = showDropdown !== undefined ? showDropdown : internalShowDropdown;
  const setDropdownOpen = onToggleDropdown !== undefined ? 
    onToggleDropdown : 
    () => setInternalShowDropdown(!internalShowDropdown);

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (onToggleDropdown) {
          // Parent manages state, only toggle if dropdown is open
          if (showDropdown) {
            onToggleDropdown();
          }
        } else {
          setInternalShowDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, onToggleDropdown]);

  const handleConnectWallet = () => {
    login();
  };

  const handleDisconnect = () => {
    logout();
    if (onToggleDropdown && showDropdown) {
      onToggleDropdown();
    } else {
      setInternalShowDropdown(false);
    }
  };

  const toggleDropdown = () => {
    setDropdownOpen();
  };

  const formatWalletAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleRefreshBalance = () => {
    if (onRefreshBalance) {
      onRefreshBalance();
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex justify-between items-center mb-12">
      <div className="flex items-center">
        {variant === 'admin' ? (
          <Link href="/" className="flex items-center text-monad-off-white hover:text-gray-300 transition-colors">
            <div className="w-8 h-8 bg-monad-off-white rounded-full flex items-center justify-center mr-4">
              <img src="/favicons/favicon.ico" alt="Monad Logo" className="w-6 h-6" />
            </div>
            <span className="text-xl font-semibold">{title || "Admin Dashboard"}</span>
          </Link>
        ) : (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-monad-off-white rounded-full flex items-center justify-center mr-4">
              <img src="/favicons/favicon.ico" alt="Monad Logo" className="w-6 h-6" />
            </div>
            {title && <span className="text-xl font-semibold text-monad-off-white">{title}</span>}
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        {showBackLink && (
          <Link href={backLink || (variant === 'admin' ? '/admin' : '/')} className="text-monad-off-white text-sm hover:text-gray-300 transition-colors">
            ← Back to {variant === 'admin' ? 'Admin Dashboard' : 'Feedback'}
          </Link>
        )}
        
        {showAdminLink && variant === 'main' && (
            <></>
        //   <button
        //     onClick={() => window.location.href = '/admin'}
        //     className="bg-monad-purple text-monad-off-white text-sm px-4 py-2 rounded-lg hover:bg-opacity-80 transition-colors"
        //   >
        //     Create Form
        //   </button>
        )}
        
        {walletAddress ? (
          <div className="flex items-center space-x-3">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={toggleDropdown}
                className="bg-monad-purple bg-opacity-20 border border-monad-purple text-monad-off-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-opacity-30 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <span>{formatWalletAddress(walletAddress)}</span>
                  <span className="text-xs text-gray-300">•</span>
                  <span className="text-xs">
                    {isBalanceLoading ? "Loading..." : `${balance} MON`}
                  </span>
                  {variant === 'main' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRefreshBalance();
                      }}
                      disabled={isBalanceLoading}
                      className="ml-1 text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Refresh balance"
                    >
                      <svg 
                        className={`w-3 h-3 ${isBalanceLoading ? 'animate-spin' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                        />
                      </svg>
                    </button>
                  )}
                  <svg 
                    className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              
              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50">
                  <div className="py-1">
                    <button
                      onClick={handleDisconnect}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Disconnect</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <button 
            onClick={handleConnectWallet}
            className="bg-monad-purple hover:bg-opacity-90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );
} 