-- LifeLink PostgreSQL Schema (transactional / medical records)
-- Run automatically in Docker; for local dev run migrations via app

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Roles enum
CREATE TYPE user_role AS ENUM ('admin', 'donor', 'receiver', 'hospital');

-- Users (all authenticated entities)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- Donors (extends users; verified donors only)
CREATE TABLE donors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  blood_group VARCHAR(5) NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20),
  address_line VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  last_donation_at TIMESTAMPTZ,
  is_available BOOLEAN DEFAULT TRUE,
  verification_status VARCHAR(30) DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_donors_user ON donors(user_id);
CREATE INDEX idx_donors_blood_group ON donors(blood_group);
CREATE INDEX idx_donors_available ON donors(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_donors_location ON donors(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX idx_donors_verification ON donors(verification_status);

-- Hospitals
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100),
  address_line VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  contact_phone VARCHAR(50),
  is_approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hospitals_user ON hospitals(user_id);
CREATE INDEX idx_hospitals_location ON hospitals(latitude, longitude);
CREATE INDEX idx_hospitals_approved ON hospitals(is_approved) WHERE is_approved = TRUE;

-- Blood requests (emergency requests from hospitals)
CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE request_status AS ENUM ('open', 'matched', 'in_progress', 'fulfilled', 'cancelled');

CREATE TABLE blood_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  blood_group VARCHAR(5) NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  units_required INT NOT NULL DEFAULT 1 CHECK (units_required > 0),
  urgency urgency_level NOT NULL DEFAULT 'high',
  status request_status NOT NULL DEFAULT 'open',
  patient_info TEXT,
  notes TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  fulfilled_at TIMESTAMPTZ
);

CREATE INDEX idx_blood_requests_hospital ON blood_requests(hospital_id);
CREATE INDEX idx_blood_requests_status ON blood_requests(status);
CREATE INDEX idx_blood_requests_blood_urgency ON blood_requests(blood_group, urgency, status);
CREATE INDEX idx_blood_requests_created ON blood_requests(created_at DESC);

-- Donation history (completed donations)
CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  request_id UUID REFERENCES blood_requests(id) ON DELETE SET NULL,
  units_donated DECIMAL(4, 2) NOT NULL DEFAULT 1,
  donated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_donations_donor ON donations(donor_id);
CREATE INDEX idx_donations_request ON donations(request_id);
CREATE INDEX idx_donations_donated_at ON donations(donated_at DESC);

-- Request-Donor matches (when donor accepts / hospital assigns)
CREATE TABLE request_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
  donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','completed')),
  distance_km DECIMAL(10, 4),
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(request_id, donor_id)
);

CREATE INDEX idx_request_matches_request ON request_matches(request_id);
CREATE INDEX idx_request_matches_donor ON request_matches(donor_id);

-- Audit log table (critical actions; detailed logs go to MongoDB)
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_events_user ON audit_events(user_id);
CREATE INDEX idx_audit_events_created ON audit_events(created_at DESC);
CREATE INDEX idx_audit_events_resource ON audit_events(resource_type, resource_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER donors_updated_at BEFORE UPDATE ON donors FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER hospitals_updated_at BEFORE UPDATE ON hospitals FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER blood_requests_updated_at BEFORE UPDATE ON blood_requests FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
