-- Ventana de fichaje configurable por sucursal.
-- beforeMin = cuántos minutos antes del inicio del turno se acepta un fichaje.
-- afterMin  = cuántos minutos después del fin del turno se acepta un fichaje.
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS clock_window_before_min integer NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS clock_window_after_min  integer NOT NULL DEFAULT 60;
