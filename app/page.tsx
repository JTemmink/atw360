'use client'

import Link from 'next/link'
import SearchBar from '@/components/search/SearchBar'
import { motion } from 'framer-motion'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-background to-background overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute top-[10%] -right-[10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[100px] animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] bg-indigo-900/20 rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto px-4 py-24 md:py-32 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-5xl mx-auto"
        >
          <h1 className="text-5xl md:text-8xl font-black text-white mb-8 leading-tight tracking-tight drop-shadow-2xl">
            Ontdek <br />
            <span className="bg-gradient-to-r from-primary via-cyan-400 to-secondary bg-clip-text text-transparent animate-text-shimmer bg-[length:200%_auto]">
              De Toekomst
            </span>{' '}
            van 3D
          </h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-xl md:text-2xl text-gray-300 mb-12 font-light max-w-3xl mx-auto leading-relaxed"
          >
            Duik in 's werelds meest geavanceerde collectie van 3D-printbare modellen. 
            Gedreven door AI, gevalideerd door experts.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="max-w-3xl mx-auto mb-16 relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <SearchBar />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap justify-center gap-8 md:gap-16 text-sm md:text-base text-gray-400 font-medium"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="tracking-wider uppercase">2.5M+ Modellen</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              <span className="tracking-wider uppercase">Premium Kwaliteit</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
              </span>
              <span className="tracking-wider uppercase">Gratis Downloads</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32">
          {[
            {
              title: "AI-Powered Search",
              desc: "Vind exact wat je zoekt met onze neurale zoektechnologie.",
              icon: (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ),
              gradient: "from-cyan-500 to-blue-500"
            },
            {
              title: "Verified Prints",
              desc: "Elk model is getest op printbaarheid en structurele integriteit.",
              icon: (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              gradient: "from-purple-500 to-pink-500"
            },
            {
              title: "Global Makers",
              desc: "Verbind met makers wereldwijd in onze futuristische community.",
              icon: (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              ),
              gradient: "from-amber-500 to-orange-600"
            }
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="group relative"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-500 blur-xl`} />
              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:border-white/20 transition-all duration-300 hover:-translate-y-2">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg shadow-${feature.gradient.split('-')[1]}-500/20 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-24"
        >
          <Link
            href="/search"
            className="relative inline-flex group"
          >
            <div className="absolute transition-all duration-1000 opacity-70 -inset-px bg-gradient-to-r from-[#44BCFF] via-[#FF44EC] to-[#FF675E] rounded-xl blur-lg group-hover:opacity-100 group-hover:-inset-1 group-hover:duration-200 animate-tilt"></div>
            <button className="relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-gray-900 font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900">
              Start Je Reis
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
