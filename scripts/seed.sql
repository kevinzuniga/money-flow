-- Database Seed Script
-- This script seeds the database with default categories and sample data

-- Start transaction
BEGIN;

-- Default Categories for Income
INSERT INTO categorias (nombre, color, icono, tipo)
VALUES 
  ('Salario', '#4CAF50', 'work', 'ingreso'),
  ('Inversiones', '#2196F3', 'trending_up', 'ingreso'),
  ('Freelance', '#9C27B0', 'computer', 'ingreso'),
  ('Regalos', '#E91E63', 'redeem', 'ingreso'),
  ('Reembolsos', '#FF9800', 'sync', 'ingreso'),
  ('Otros ingresos', '#607D8B', 'add_circle', 'ingreso');

-- Default Categories for Expenses
INSERT INTO categorias (nombre, color, icono, tipo)
VALUES 
  ('Alimentación', '#F44336', 'restaurant', 'egreso'),
  ('Transporte', '#3F51B5', 'directions_car', 'egreso'),
  ('Vivienda', '#009688', 'home', 'egreso'),
  ('Servicios', '#FFC107', 'power', 'egreso'),
  ('Ocio', '#673AB7', 'movie', 'egreso'),
  ('Ropa', '#795548', 'checkroom', 'egreso'),
  ('Salud', '#8BC34A', 'medical_services', 'egreso'),
  ('Educación', '#03A9F4', 'school', 'egreso'),
  ('Impuestos', '#FF5722', 'account_balance', 'egreso'),
  ('Otros gastos', '#9E9E9E', 'more_horiz', 'egreso');

-- Common Categories
INSERT INTO categorias (nombre, color, icono, tipo)
VALUES 
  ('Transferencias', '#00BCD4', 'swap_horiz', 'ambos');

-- Create Demo User
-- Hash for 'password123' would typically be generated with bcrypt, 
-- using a pre-generated hash for this SQL script
INSERT INTO users (email, password_hash, nombre)
VALUES ('demo@example.com', '$2a$10$rY7G8xMiT/l5ow5WGSrDCO6TlA8Gwx5ufYnq8RnzafLqGb3UvhYLO', 'Usuario Demo')
RETURNING id;

-- Store the returned id for later use
DO $$
DECLARE
  demo_user_id INTEGER;
BEGIN
  SELECT id INTO demo_user_id FROM users WHERE email = 'demo@example.com';
  
  -- Sample Income Records
  INSERT INTO ingresos (monto, descripcion, fecha, categoria_id, user_id)
  VALUES 
    (2500, 'Salario mensual', '2025-05-01', (SELECT id FROM categorias WHERE nombre = 'Salario' AND user_id IS NULL), demo_user_id),
    (150, 'Dividendos', '2025-05-10', (SELECT id FROM categorias WHERE nombre = 'Inversiones' AND user_id IS NULL), demo_user_id),
    (350, 'Proyecto web', '2025-05-15', (SELECT id FROM categorias WHERE nombre = 'Freelance' AND user_id IS NULL), demo_user_id),
    (2500, 'Salario mensual', '2025-04-01', (SELECT id FROM categorias WHERE nombre = 'Salario' AND user_id IS NULL), demo_user_id),
    (120, 'Dividendos', '2025-04-10', (SELECT id FROM categorias WHERE nombre = 'Inversiones' AND user_id IS NULL), demo_user_id);
  
  -- Sample Expense Records
  INSERT INTO egresos (monto, descripcion, fecha, categoria_id, user_id)
  VALUES 
    (350, 'Supermercado', '2025-05-05', (SELECT id FROM categorias WHERE nombre = 'Alimentación' AND user_id IS NULL), demo_user_id),
    (120, 'Gasolina', '2025-05-08', (SELECT id FROM categorias WHERE nombre = 'Transporte' AND user_id IS NULL), demo_user_id),
    (800, 'Alquiler', '2025-05-01', (SELECT id FROM categorias WHERE nombre = 'Vivienda' AND user_id IS NULL), demo_user_id),
    (150, 'Electricidad y agua', '2025-05-12', (SELECT id FROM categorias WHERE nombre = 'Servicios' AND user_id IS NULL), demo_user_id),
    (80, 'Cine', '2025-05-20', (SELECT id FROM categorias WHERE nombre = 'Ocio' AND user_id IS NULL), demo_user_id),
    (120, 'Restaurante', '2025-05-18', (SELECT id FROM categorias WHERE nombre = 'Alimentación' AND user_id IS NULL), demo_user_id),
    (330, 'Supermercado', '2025-04-03', (SELECT id FROM categorias WHERE nombre = 'Alimentación' AND user_id IS NULL), demo_user_id),
    (100, 'Gasolina', '2025-04-10', (SELECT id FROM categorias WHERE nombre = 'Transporte' AND user_id IS NULL), demo_user_id),
    (800, 'Alquiler', '2025-04-01', (SELECT id FROM categorias WHERE nombre = 'Vivienda' AND user_id IS NULL), demo_user_id),
    (145, 'Electricidad y agua', '2025-04-12', (SELECT id FROM categorias WHERE nombre = 'Servicios' AND user_id IS NULL), demo_user_id);
END $$;

-- Commit transaction
COMMIT;

-- Display success message
DO $$
BEGIN
  RAISE NOTICE '🎉 Database seeding completed successfully!';
  RAISE NOTICE '📝 Demo user credentials:';
  RAISE NOTICE '   Email: demo@example.com';
  RAISE NOTICE '   Password: password123';
END $$;

