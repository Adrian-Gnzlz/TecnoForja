-- backend/sql/schema.sql

CREATE DATABASE IF NOT EXISTS tecnoforja_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tecnoforja_db;

CREATE TABLE IF NOT EXISTS productos (
id INT AUTO_INCREMENT PRIMARY KEY,
nombre VARCHAR(150) NOT NULL,
descripcion TEXT,
precio_base DECIMAL(10,2) DEFAULT 0,
tipo ENUM('producto','servicio') DEFAULT 'servicio',
categoria ENUM('herreria','estructuras','soldadura') DEFAULT 'herreria',
badge VARCHAR(50) DEFAULT NULL,
imagen_url VARCHAR(255) DEFAULT NULL,
activo TINYINT(1) DEFAULT 1
);

CREATE TABLE IF NOT EXISTS citas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  nombre_cliente VARCHAR(150) NOT NULL,
  telefono VARCHAR(30) NOT NULL,
  correo VARCHAR(150) DEFAULT '',
  direccion VARCHAR(255) NOT NULL,
  comentarios TEXT,
  monto_estimado DECIMAL(10,2) DEFAULT 0,
  estado VARCHAR(50) DEFAULT 'Pendiente',
  work_status ENUM(
    'pendiente_visita',
    'visita_realizada',
    'en_proceso',
    'terminado',
    'entregado',
    'cancelado'
  ) DEFAULT 'pendiente_visita',
  payment_status ENUM(
    'sin_pago',
    'pago_registrado',
    'pago_parcial',
    'cancelado'
  ) DEFAULT 'sin_pago',
  prioridad ENUM('alta','media','baja') DEFAULT 'media',
  admin_notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS cita_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cita_id INT NOT NULL,
  producto_id INT NULL,
  nombre_producto VARCHAR(150) NOT NULL,
  precio_unitario DECIMAL(10,2) DEFAULT 0,
  FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cita_id INT NOT NULL,
  nombre_cliente VARCHAR(150) NOT NULL,
  metodo ENUM('tarjeta','efectivo') NOT NULL,
  monto DECIMAL(10,2) DEFAULT 0,
  estado VARCHAR(50) DEFAULT 'Registrado',
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE CASCADE
);

INSERT INTO productos (nombre, descripcion, precio_base, tipo) VALUES
('Bases para Tinacos', 'Estructuras metálicas de alta resistencia diseñadas para soporte óptimo de tinacos.', 1200.00, 'producto'),
('Puertas a Medida', 'Puertas personalizadas con acabados de herrería artística y funcional.', 0.00, 'servicio'),
('Ventanas a Medida', 'Ventanas personalizadas con protección y diseño en herrería industrial.', 0.00, 'servicio'),
('Rejas para Ventana', 'Sistemas de protección y elegancia para ventanas residenciales y comerciales.', 0.00, 'servicio'),
('Portones', 'Portones robustos con acabados profesionales para uso residencial e industrial.', 0.00, 'servicio'),
('Rejas para Jardín', 'Vallas metálicas decorativas para delimitar y embellecer espacios exteriores.', 0.00, 'servicio');
