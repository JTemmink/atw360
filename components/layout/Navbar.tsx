'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
    setMobileMenuOpen(false)
  }

  const navLinks = [
    { href: '/search', label: 'Zoeken' },
    ...(user ? [
      { href: '/models/upload', label: 'Upload' },
      { href: '/favorites', label: 'Favorieten' }
    ] : [])
  ]

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-gray-900/95 backdrop-blur-xl border-b border-white/5 shadow-lg' : 'bg-gray-900/80 backdrop-blur-xl'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link href="/" className="flex items-center gap-2 md:gap-3 group" onClick={() => setMobileMenuOpen(false)}>
            <div className="relative w-8 h-8 md:w-10 md:h-10">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl blur opacity-50 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
              <div className="relative w-8 h-8 md:w-10 md:h-10 bg-gray-900 rounded-xl flex items-center justify-center border border-white/10 group-hover:border-cyan-500/50 transition-colors">
                <svg className="w-4 h-4 md:w-6 md:h-6 text-cyan-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <span className="text-lg md:text-2xl font-bold text-white tracking-tight">
              OTTE<span className="text-cyan-400">3D</span> <span className="hidden sm:inline">Wereld</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors relative group py-2 ${
                  pathname === link.href ? 'text-cyan-400' : 'text-gray-300 hover:text-white'
                }`}
              >
                {link.label}
                <span className={`absolute bottom-0 left-0 h-0.5 bg-cyan-400 transition-all duration-300 ${
                  pathname === link.href ? 'w-full' : 'w-0 group-hover:w-full'
                }`}></span>
              </Link>
            ))}

            {user ? (
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Uitloggen
              </button>
            ) : (
              <div className="flex items-center gap-3 lg:gap-4">
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Inloggen
                </Link>
                <Link
                  href="/register"
                  className="relative group px-4 lg:px-6 py-2 lg:py-2.5 overflow-hidden rounded-lg bg-cyan-600 text-white font-semibold text-xs lg:text-sm shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 hover:shadow-cyan-500/40"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                  <span className="relative">Registreer</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-white/5 bg-gray-900/95 backdrop-blur-xl"
          >
            <div className="container mx-auto px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2 text-base font-medium transition-colors ${
                    pathname === link.href ? 'text-cyan-400' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              
              <div className="pt-3 border-t border-white/5 space-y-3">
                {user ? (
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left py-2 text-base font-medium text-gray-300 hover:text-white transition-colors"
                  >
                    Uitloggen
                  </button>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2 text-base font-medium text-gray-300 hover:text-white transition-colors"
                    >
                      Inloggen
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full py-2.5 px-4 rounded-lg bg-cyan-600 text-white font-semibold text-center shadow-lg shadow-cyan-500/20"
                    >
                      Registreer
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
