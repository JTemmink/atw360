'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

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
  }

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            3D Models
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/search"
              className="text-gray-700 hover:text-blue-600 font-medium"
            >
              Zoeken
            </Link>
            {user ? (
              <>
                <Link
                  href="/models/upload"
                  className="text-gray-700 hover:text-blue-600 font-medium"
                >
                  Upload
                </Link>
                <Link
                  href="/favorites"
                  className="text-gray-700 hover:text-blue-600 font-medium"
                >
                  Favorieten
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-blue-600 font-medium"
                >
                  Uitloggen
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-blue-600 font-medium"
                >
                  Inloggen
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Registreer
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

