'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface FavoriteButtonProps {
  modelId: string
  className?: string
  isExternal?: boolean
  externalUrl?: string
}

export default function FavoriteButton({ 
  modelId, 
  className = '',
  isExternal = false,
  externalUrl
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setChecking(false)
      if (user && !isExternal) {
        checkFavorite(user.id)
      }
    })
  }, [modelId, isExternal])

  const checkFavorite = async (userId: string) => {
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('model_id', modelId)
      .single()

    setIsFavorite(!!data)
  }

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      const shouldLogin = confirm(
        'Je moet ingelogd zijn om favorieten toe te voegen.\n\nWil je nu inloggen of een account aanmaken?'
      )
      if (shouldLogin) {
        router.push('/login')
      }
      return
    }

    // External models can't be saved in our database
    if (isExternal) {
      const message = externalUrl
        ? 'Externe modellen kunnen niet worden opgeslagen als favoriet in ons systeem. Wil je de Thingiverse pagina openen om het daar op te slaan?'
        : 'Externe modellen kunnen niet worden opgeslagen als favoriet.'
      
      if (externalUrl && confirm(message)) {
        window.open(externalUrl, '_blank')
      } else if (!externalUrl) {
        alert(message)
      }
      return
    }

    setLoading(true)

    if (isFavorite) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('model_id', modelId)

      if (!error) {
        setIsFavorite(false)
      }
    } else {
      const { error } = await supabase.from('favorites').insert({
        user_id: user.id,
        model_id: modelId,
      })

      if (!error) {
        setIsFavorite(true)
      }
    }

    setLoading(false)
  }

  if (checking) {
    return (
      <button
        className={`${className} text-gray-300 hover:text-gray-400`}
        disabled
      >
        🤍
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`${className} transition-all ${
        isFavorite
          ? 'text-red-500 hover:text-red-600'
          : 'text-gray-400 hover:text-red-500'
      } disabled:opacity-50`}
      title={isFavorite ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten'}
    >
      {isFavorite ? '❤️' : '🤍'}
    </button>
  )
}

