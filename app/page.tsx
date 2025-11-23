import Link from 'next/link'
import SearchBar from '@/components/search/SearchBar'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            3D Model Zoekplatform
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Vind, beoordeel en deel 3D-printbare modellen
          </p>
          <div className="max-w-2xl mx-auto">
            <SearchBar />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-3">🔍 Slim Zoeken</h2>
            <p className="text-gray-600">
              Gebruik AI om natuurlijke taal queries te stellen en vind precies wat je zoekt
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-3">⭐ Beoordelen</h2>
            <p className="text-gray-600">
              Beoordeel modellen op kwaliteit, printbaarheid en design
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-3">💬 Community</h2>
            <p className="text-gray-600">
              Deel je ervaringen en help anderen met comments en reviews
            </p>
          </div>
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/search"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Verken Modellen
          </Link>
        </div>
      </div>
    </div>
  )
}
