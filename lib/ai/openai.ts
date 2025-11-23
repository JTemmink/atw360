import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function enhanceSearchQuery(userQuery: string): Promise<{
  keywords: string[]
  suggestedFilters: {
    categories?: string[]
    tags?: string[]
  }
}> {
  const prompt = `Je bent een assistent die helpt bij het zoeken naar 3D-printbare modellen. 
Analyseer de volgende zoekopdracht en geef relevante zoektermen en suggesties voor filters.

Zoekopdracht: "${userQuery}"

Geef een JSON response met:
1. keywords: array van relevante zoektermen (max 5)
2. suggestedFilters: object met mogelijke categorieën en tags

Voorbeeld response:
{
  "keywords": ["vase", "decoratief", "keramiek"],
  "suggestedFilters": {
    "categories": ["decoratie"],
    "tags": ["vase", "home"]
  }
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Je bent een assistent die helpt bij het zoeken naar 3D-printbare modellen. Geef altijd geldige JSON terug.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 500,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (content) {
      try {
        return JSON.parse(content)
      } catch (parseError) {
        // Try to extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0])
        }
      }
    }

    // Fallback
    return {
      keywords: userQuery.split(' ').filter(Boolean),
      suggestedFilters: {},
    }
  } catch (error) {
    console.error('AI search error:', error)
    return {
      keywords: userQuery.split(' ').filter(Boolean),
      suggestedFilters: {},
    }
  }
}

