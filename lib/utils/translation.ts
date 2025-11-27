// Translation utility for Dutch <-> English
// Simple dictionary-based translation with fallback to API

const nlToEnDict: Record<string, string> = {
  // Animals
  'hond': 'dog',
  'kat': 'cat',
  'vogel': 'bird',
  'vis': 'fish',
  'paard': 'horse',
  'kip': 'chicken',
  'konijn': 'rabbit',
  'muis': 'mouse',
  'rat': 'rat',
  'hamster': 'hamster',
  'cavia': 'guinea pig',
  'varken': 'pig',
  'koe': 'cow',
  'schaap': 'sheep',
  'geit': 'goat',
  
  // Common objects
  'auto': 'car',
  'fiets': 'bicycle',
  'boot': 'boat',
  'vliegtuig': 'airplane',
  'trein': 'train',
  'huis': 'house',
  'stoel': 'chair',
  'tafel': 'table',
  'bed': 'bed',
  'lamp': 'lamp',
  'telefoon': 'phone',
  'computer': 'computer',
  'boek': 'book',
  'pen': 'pen',
  'potlood': 'pencil',
  
  // Body parts
  'hoofd': 'head',
  'hand': 'hand',
  'voet': 'foot',
  'oog': 'eye',
  'oor': 'ear',
  'neus': 'nose',
  'mond': 'mouth',
  
  // Nature
  'boom': 'tree',
  'bloem': 'flower',
  'gras': 'grass',
  'zon': 'sun',
  'maan': 'moon',
  'ster': 'star',
  'water': 'water',
  'vuur': 'fire',
  'aarde': 'earth',
  
  // Colors
  'rood': 'red',
  'blauw': 'blue',
  'geel': 'yellow',
  'groen': 'green',
  'zwart': 'black',
  'wit': 'white',
  'grijs': 'gray',
  'oranje': 'orange',
  'paars': 'purple',
  'roze': 'pink',
  'bruin': 'brown',
  
  // Common verbs/adjectives
  'groot': 'large big',
  'klein': 'small little',
  'lang': 'long',
  'kort': 'short',
  'hoog': 'high tall',
  'laag': 'low',
  'nieuw': 'new',
  'oud': 'old',
  'mooi': 'beautiful nice',
  'lelijk': 'ugly',
  'goed': 'good',
  'slecht': 'bad',
  
  // 3D printing specific
  'print': 'print',
  'model': 'model',
  'figuur': 'figure',
  'standbeeld': 'statue',
  'decoratie': 'decoration',
  'speelgoed': 'toy',
  'gereedschap': 'tool',
  'kunst': 'art',
  'functioneel': 'functional',
  'miniatuur': 'miniature',
  'organizer': 'organizer',
  'sieraad': 'jewelry',
}

const enToNlDict: Record<string, string> = Object.fromEntries(
  Object.entries(nlToEnDict).map(([nl, en]) => {
    // Reverse mapping - handle multiple English words
    const enWords = en.split(' ')
    return enWords.map(word => [word.toLowerCase(), nl])
  }).flat()
)

// Translate Dutch to English for search queries
export function translateNlToEn(text: string): string {
  if (!text) return text
  
  const words = text.toLowerCase().split(/\s+/)
  const translated = words.map(word => {
    // Check exact match first
    if (nlToEnDict[word]) {
      return nlToEnDict[word].split(' ')[0] // Use first translation if multiple
    }
    
    // Check if word contains a dictionary entry
    for (const [nl, en] of Object.entries(nlToEnDict)) {
      if (word.includes(nl)) {
        return word.replace(nl, en.split(' ')[0])
      }
    }
    
    return word // Keep original if no translation found
  })
  
  return translated.join(' ')
}

// Translate English to Dutch for results
export function translateEnToNl(text: string): Promise<string> {
  return new Promise((resolve) => {
    if (!text) {
      resolve(text)
      return
    }
    
    // Check dictionary first
    const words = text.toLowerCase().split(/\s+/)
    const translated = words.map(word => {
      // Remove punctuation for lookup
      const cleanWord = word.replace(/[.,!?;:()\[\]{}'"]/g, '')
      
      if (enToNlDict[cleanWord]) {
        // Preserve original capitalization if it was capitalized
        if (word[0] === word[0].toUpperCase()) {
          return enToNlDict[cleanWord].charAt(0).toUpperCase() + enToNlDict[cleanWord].slice(1)
        }
        return enToNlDict[cleanWord]
      }
      
      return word // Keep original if no translation found
    })
    
    const result = translated.join(' ')
    
    // If translation is incomplete (many words unchanged), try API
    const unchangedCount = translated.filter((w, i) => w === words[i]).length
    if (unchangedCount > words.length * 0.5 && text.length > 10) {
      // More than 50% unchanged and text is long enough - try API
      translateWithAPI(text, 'en', 'nl')
        .then(apiResult => resolve(apiResult || result))
        .catch(() => resolve(result))
    } else {
      resolve(result)
    }
  })
}

// Fallback to translation API (using free service)
async function translateWithAPI(text: string, from: string, to: string): Promise<string | null> {
  try {
    // Using LibreTranslate or similar free API
    // For now, return null to use dictionary fallback
    // Can be extended with actual API call if needed
    return null
  } catch (error) {
    console.error('Translation API error:', error)
    return null
  }
}

