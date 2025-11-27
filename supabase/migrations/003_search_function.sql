-- Function to search models including tags
CREATE OR REPLACE FUNCTION search_models_with_tags(
  search_text TEXT,
  category_filter UUID DEFAULT NULL,
  tag_filter UUID[] DEFAULT NULL,
  is_free_filter BOOLEAN DEFAULT NULL,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  description TEXT,
  category_id UUID,
  user_id UUID,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  download_count INTEGER,
  license_type VARCHAR,
  is_free BOOLEAN,
  category JSONB,
  tags JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.name,
    m.description,
    m.category_id,
    m.user_id,
    m.thumbnail_url,
    m.created_at,
    m.updated_at,
    m.download_count,
    m.license_type,
    m.is_free,
    jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug) as category,
    COALESCE(
      jsonb_agg(
        DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug)
      ) FILTER (WHERE t.id IS NOT NULL),
      '[]'::jsonb
    ) as tags
  FROM models m
  LEFT JOIN categories c ON m.category_id = c.id
  LEFT JOIN model_tags mt ON m.id = mt.model_id
  LEFT JOIN tags t ON mt.tag_id = t.id
  WHERE 
    (
      -- Search in name and description
      (search_text IS NULL OR search_text = '' OR
       m.name ILIKE '%' || search_text || '%' OR
       m.description ILIKE '%' || search_text || '%' OR
       -- Search in tags
       t.name ILIKE '%' || search_text || '%'
      )
    )
    AND (category_filter IS NULL OR m.category_id = category_filter)
    AND (is_free_filter IS NULL OR m.is_free = is_free_filter)
    AND (
      tag_filter IS NULL OR 
      EXISTS (
        SELECT 1 FROM model_tags mt2 
        WHERE mt2.model_id = m.id 
        AND mt2.tag_id = ANY(tag_filter)
      )
    )
  GROUP BY m.id, c.id, c.name, c.slug
  ORDER BY 
    -- Prioritize exact matches in name
    CASE WHEN m.name ILIKE '%' || search_text || '%' THEN 1 ELSE 2 END,
    -- Then by download count
    m.download_count DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

