-- Initial database schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
    color VARCHAR(7),
    icono VARCHAR(50),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Income table
CREATE TABLE IF NOT EXISTS ingresos (
    id SERIAL PRIMARY KEY,
    monto DECIMAL(12,2) NOT NULL CHECK (monto > 0),
    descripcion TEXT,
    fecha DATE NOT NULL,
    categoria_id INTEGER REFERENCES categorias(id),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Expenses table
CREATE TABLE IF NOT EXISTS egresos (
    id SERIAL PRIMARY KEY,
    monto DECIMAL(12,2) NOT NULL CHECK (monto > 0),
    descripcion TEXT,
    fecha DATE NOT NULL,
    categoria_id INTEGER REFERENCES categorias(id),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ingresos_user_id ON ingresos(user_id);
CREATE INDEX IF NOT EXISTS idx_ingresos_categoria_id ON ingresos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_ingresos_fecha ON ingresos(fecha);

CREATE INDEX IF NOT EXISTS idx_egresos_user_id ON egresos(user_id);
CREATE INDEX IF NOT EXISTS idx_egresos_categoria_id ON egresos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_egresos_fecha ON egresos(fecha);

CREATE INDEX IF NOT EXISTS idx_categorias_user_id ON categorias(user_id);
CREATE INDEX IF NOT EXISTS idx_categorias_tipo ON categorias(tipo);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON categorias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ingresos_updated_at BEFORE UPDATE ON ingresos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_egresos_updated_at BEFORE UPDATE ON egresos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

