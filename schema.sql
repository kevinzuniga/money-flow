CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ingresos (
  id SERIAL PRIMARY KEY,
  monto NUMERIC NOT NULL,
  descripcion TEXT,
  fecha DATE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE egresos (
  id SERIAL PRIMARY KEY,
  monto NUMERIC NOT NULL,
  descripcion TEXT,
  fecha DATE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

-- Create an initial admin user
-- password is "password" hashed
INSERT INTO users (email, password, nombre) 
VALUES ('admin@example.com', '$2a$10$XyTxS/gIhdWUvomU.8loY.I4xTXZMjy2eEhPvurE2RG3.x1cUSA4O', 'Admin User');
