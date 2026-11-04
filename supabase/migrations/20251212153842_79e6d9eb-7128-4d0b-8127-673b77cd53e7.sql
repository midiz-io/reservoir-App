-- Create role enum for user roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'employee');

-- Create profiles table for basic user info
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table for role-based access
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'employee',
  UNIQUE (user_id, role)
);

-- Create locations table
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create reservoir status enum
CREATE TYPE public.reservoir_status AS ENUM ('active', 'maintenance', 'inactive');

-- Create reservoirs table
CREATE TABLE public.reservoirs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  geofence_radius INTEGER NOT NULL DEFAULT 100,
  capacity BIGINT,
  description TEXT,
  status reservoir_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create employees table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  assigned_reservoirs UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create data_entries table for reservoir measurements
CREATE TABLE public.data_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservoir_id UUID REFERENCES public.reservoirs(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  water_level DOUBLE PRECISION NOT NULL,
  temperature DOUBLE PRECISION NOT NULL,
  ph DOUBLE PRECISION NOT NULL,
  dissolved_oxygen DOUBLE PRECISION NOT NULL,
  turbidity DOUBLE PRECISION NOT NULL,
  flow_rate DOUBLE PRECISION NOT NULL,
  notes TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create employee_locations table for tracking
CREATE TABLE public.employee_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION NOT NULL,
  battery_level DOUBLE PRECISION,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservoirs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_locations ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user roles (prevents recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's employee_id
CREATE OR REPLACE FUNCTION public.get_employee_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.employees WHERE user_id = _user_id LIMIT 1
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Locations policies (readable by all authenticated, writable by admins)
CREATE POLICY "Authenticated users can view locations" ON public.locations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage locations" ON public.locations
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Reservoirs policies (readable by all authenticated, writable by admins)
CREATE POLICY "Authenticated users can view reservoirs" ON public.reservoirs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage reservoirs" ON public.reservoirs
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Employees policies
CREATE POLICY "Users can view own employee record" ON public.employees
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all employees" ON public.employees
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can manage employees" ON public.employees
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Data entries policies
CREATE POLICY "Employees can view own entries" ON public.data_entries
  FOR SELECT USING (employee_id = public.get_employee_id(auth.uid()));

CREATE POLICY "Employees can insert entries" ON public.data_entries
  FOR INSERT WITH CHECK (employee_id = public.get_employee_id(auth.uid()));

CREATE POLICY "Admins can view all entries" ON public.data_entries
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- Employee locations policies
CREATE POLICY "Employees can manage own location" ON public.employee_locations
  FOR ALL USING (employee_id = public.get_employee_id(auth.uid()));

CREATE POLICY "Admins can view all locations" ON public.employee_locations
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- Trigger function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  );
  
  -- Default role is employee
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservoirs_updated_at BEFORE UPDATE ON public.reservoirs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_data_entries_reservoir ON public.data_entries(reservoir_id);
CREATE INDEX idx_data_entries_employee ON public.data_entries(employee_id);
CREATE INDEX idx_data_entries_recorded_at ON public.data_entries(recorded_at DESC);
CREATE INDEX idx_employee_locations_employee ON public.employee_locations(employee_id);
CREATE INDEX idx_employee_locations_timestamp ON public.employee_locations(timestamp DESC);
CREATE INDEX idx_reservoirs_status ON public.reservoirs(status);

-- Enable realtime for employee locations and data entries
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.data_entries;