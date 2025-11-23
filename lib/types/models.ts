export interface Model {
  id: string
  name: string
  description: string | null
  category_id: string | null
  user_id: string
  thumbnail_url: string | null
  created_at: string
  updated_at: string
  download_count: number
  license_type: string | null
  is_free: boolean
  tags?: Tag[]
  category?: Category
  user?: User
  average_quality?: number
  average_printability?: number
  average_design?: number
}

export interface Category {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface Tag {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface ModelTag {
  model_id: string
  tag_id: string
}

export interface ModelFile {
  id: string
  model_id: string
  file_url: string
  file_type: string
  file_size: number
  created_at: string
}

export interface Favorite {
  id: string
  user_id: string
  model_id: string
  created_at: string
}

export interface Review {
  id: string
  user_id: string
  model_id: string
  quality_score: number
  printability_score: number
  design_score: number
  comment: string | null
  created_at: string
  updated_at: string
  user?: User
}

export interface Comment {
  id: string
  user_id: string
  model_id: string
  parent_id: string | null
  content: string
  created_at: string
  updated_at: string
  user?: User
  replies?: Comment[]
}

export interface User {
  id: string
  email: string
  username: string | null
  avatar_url: string | null
  created_at: string
}

export interface SearchFilters {
  query?: string
  category_id?: string
  tag_ids?: string[]
  min_quality?: number
  min_printability?: number
  min_design?: number
  is_free?: boolean
  license_type?: string
  file_type?: string
  sort_by?: 'relevance' | 'popularity' | 'newest' | 'oldest'
  page?: number
  limit?: number
  pla_compatible?: boolean // Filter for PLA/Bambu P1S/P2S compatible models
}

