-- Print locations table
CREATE TABLE print_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('particulier', 'bedrijf')),
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Nederland',
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  website TEXT,
  price_per_hour DECIMAL(10, 2),
  price_per_gram DECIMAL(10, 2),
  available_materials TEXT[], -- Array of materials (PLA, ABS, PETG, etc.)
  max_print_size VARCHAR(100), -- e.g., "200x200x200mm"
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_verified BOOLEAN DEFAULT false,
  rating DECIMAL(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for location-based queries (using standard indexes)
CREATE INDEX idx_print_locations_lat_lng ON print_locations(latitude, longitude);

-- Index for city searches
CREATE INDEX idx_print_locations_city ON print_locations(city);

-- Index for type
CREATE INDEX idx_print_locations_type ON print_locations(type);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_print_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_print_locations_updated_at
  BEFORE UPDATE ON print_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_print_locations_updated_at();

-- RLS Policies
ALTER TABLE print_locations ENABLE ROW LEVEL SECURITY;

-- Everyone can read print locations
CREATE POLICY "Print locations are viewable by everyone" ON print_locations
  FOR SELECT USING (true);

-- Authenticated users can create their own print location
CREATE POLICY "Users can create print locations" ON print_locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own print locations
CREATE POLICY "Users can update own print locations" ON print_locations
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own print locations
CREATE POLICY "Users can delete own print locations" ON print_locations
  FOR DELETE USING (auth.uid() = user_id);

-- Note: For production, consider using PostGIS extension for better location queries
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Sample data (optional - for testing)
-- INSERT INTO print_locations (name, type, address, city, postal_code, latitude, longitude, email, available_materials, max_print_size, user_id) VALUES
--   ('3D Print Service Amsterdam', 'bedrijf', 'Kalverstraat 1', 'Amsterdam', '1012 NX', 52.3676, 4.9041, 'info@3dprintamsterdam.nl', ARRAY['PLA', 'ABS', 'PETG'], '300x300x300mm', (SELECT id FROM auth.users LIMIT 1)),
--   ('Jan\'s 3D Printing', 'particulier', 'Hoofdstraat 42', 'Utrecht', '3512 AA', 52.0907, 5.1214, 'jan@example.com', ARRAY['PLA', 'TPU'], '200x200x200mm', (SELECT id FROM auth.users LIMIT 1));

