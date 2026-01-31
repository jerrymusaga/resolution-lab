'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Target,
  BarChart3,
  CheckCircle2,
  FlaskConical,
  Brain,
  Menu,
  X,
  LogOut,
  User,
  Mail,
  ChevronDown
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';

// Navigation items - only shown when authenticated
const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Target },
  { href: '/goals', label: 'Goals', icon: CheckCircle2 },
  { href: '/insights', label: 'Insights', icon: BarChart3 },
  { href: '/agent', label: 'AI Coach', icon: Brain },
  { href: '/experiment', label: 'Experiment', icon: FlaskConical },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-surface-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 rounded-xl flex items-center justify-center shadow-soft-sm group-hover:shadow-glow-brand transition-shadow duration-300">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-surface-900">
              Resolution<span className="text-brand-600">Lab</span>
            </span>
          </Link>

          {/* Desktop Navigation - Only show when authenticated */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-brand-50 text-brand-700 shadow-soft-xs'
                        : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
                    )}
                  >
                    <Icon className={cn(
                      'w-4 h-4',
                      isActive && 'text-brand-600'
                    )} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Auth section */}
          <div className="hidden md:flex items-center space-x-3">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-surface-200 animate-pulse" />
            ) : user ? (
              <div className="relative" ref={userMenuRef}>
                {/* User button */}
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-surface-100 transition-colors duration-200"
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name || user.email}
                      className="w-8 h-8 rounded-full border-2 border-surface-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-brand-600" />
                    </div>
                  )}
                  <ChevronDown className={cn(
                    "w-4 h-4 text-surface-500 transition-transform duration-200",
                    userMenuOpen && "rotate-180"
                  )} />
                </button>

                {/* User dropdown menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-soft-xl border border-surface-200 py-2 z-50 animate-fade-in">
                    {/* User info section */}
                    <div className="px-4 py-3 border-b border-surface-100">
                      <div className="flex items-center space-x-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.full_name || user.email}
                            className="w-12 h-12 rounded-full border-2 border-surface-200"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
                            <User className="w-6 h-6 text-brand-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-surface-900 truncate">
                            {user.full_name || 'User'}
                          </p>
                          <div className="flex items-center space-x-1 text-sm text-surface-500">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{user.email}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sign out button */}
                    <div className="px-2 pt-2">
                      <button
                        onClick={() => {
                          signOut();
                          setUserMenuOpen(false);
                        }}
                        className="flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl text-danger-600 hover:bg-danger-50 transition-colors duration-200"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="font-medium">Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button
                onClick={signInWithGoogle}
                className="bg-brand-600 hover:bg-brand-700 text-white shadow-soft-sm hover:shadow-soft-md transition-all duration-200"
              >
                Sign In with Google
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-xl text-surface-600 hover:bg-surface-100 transition-colors duration-200"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-surface-200 bg-white/95 backdrop-blur-md animate-fade-in-down">
          <nav className="px-4 py-3 space-y-1">
            {/* Only show nav items if authenticated */}
            {user && navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
                  )}
                >
                  <Icon className={cn(
                    'w-5 h-5',
                    isActive && 'text-brand-600'
                  )} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Mobile Auth */}
            <div className={cn(
              "pt-3 mt-3",
              user && "border-t border-surface-200"
            )}>
              {user ? (
                <div className="px-4 py-2">
                  <div className="flex items-center space-x-3 mb-4">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name || user.email}
                        className="w-12 h-12 rounded-full border-2 border-surface-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
                        <User className="w-6 h-6 text-brand-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-surface-900">{user.full_name || 'User'}</p>
                      <p className="text-sm text-surface-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-danger-600 hover:bg-danger-50 transition-colors duration-200"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="px-4 py-2">
                  <button
                    onClick={() => {
                      signInWithGoogle();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center justify-center space-x-2 w-full px-4 py-3 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors duration-200 shadow-soft-sm"
                  >
                    <span>Sign In with Google</span>
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
