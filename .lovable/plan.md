
Objetivo: reparar de una vez la visibilidad y gestión de Grupos Opcionales, Extras Disponibles y Removibles en Centro de Costos, y corregir la capa de permisos relacionada para que no vuelva a romperse.

1. Confirmar y atacar la causa raíz en backend
- No falta ninguna tabla ni columna de estas features. Las tablas existen y tienen datos:
  - `menu_item_option_groups`
  - `menu_item_option_group_items`
  - `extra_assignments`
  - `removable_items`
  - `item_modifiers`
- El problema real es de permisos: varias funciones RLS todavía consultan la tabla eliminada `public.user_roles_v2`, mientras la base actual usa `roles` + `user_role_assignments`.
- Esto rompe en especial estas consultas:
  - lectura de `extra_assignments`
  - lectura/escritura de `removable_items`
  - lectura/escritura de `menu_item_option_groups`
  - lectura/escritura de `menu_item_option_group_items`

2. Crear una migración única de reparación de helpers RLS
- Reescribir con `SECURITY DEFINER` y `search_path = public` las funciones que hoy siguen atadas a `user_roles_v2`, manteniendo firma y nombre para no romper políticas existentes:
  - `is_staff()`
  - `is_staff(uuid)`
  - `is_staff_member(uuid)`
  - `is_financial_manager(uuid)`
  - `is_hr_manager(uuid)`
  - `is_cashier_for_branch(uuid, uuid)`
  - `user_has_branch_access(uuid)`
  - `has_hr_access(uuid)`
  - `has_financial_access(uuid)`
  - `validate_clock_pin(text, text)`
- La nueva lógica va a consultar:
  - `user_role_assignments.is_active`
  - `user_role_assignments.branch_id`
  - `roles.key`
- Se respetará la semántica actual:
  - superadmin de marca = acceso global
  - roles locales (`franquiciado`, `encargado`, `contador_local`, etc.) = acceso por sucursal asignada
  - roles de marca (`coordinador`, `contador_marca`) = acceso global según corresponda

3. Barrido de consistencia sobre políticas y dependencias
- Revisar que las políticas de estas tablas sigan apuntando a los helpers ya corregidos y no tengan referencias directas viejas:
  - `menu_item_option_groups`
  - `menu_item_option_group_items`
  - `extra_assignments`
  - `removable_items`
  - `item_modifiers`
- Si aparece alguna policy o función adicional con referencia residual a `user_roles_v2`, incluirla en la misma reparación para dejar la capa consistente “de punta a punta”.

4. Hardening de frontend para no volver a ocultar errores como “vacío”
- Ajustar las secciones de `ComposicionInline` para mostrar error explícito cuando falle una query de:
  - grupos opcionales
  - extras
  - removibles
- Mantener el estado vacío real (“sin datos”) separado del estado de error (“no se pudo cargar”).
- Hacer el mismo endurecimiento en vistas relacionadas donde hoy una falla de RLS puede parecer simplemente lista vacía:
  - vista previa del producto
  - personalización webapp si aplica

5. Verificación funcional completa
- Validar en Centro de Costos que vuelvan a aparecer:
  - “Grupos Opcionales” con sus opciones
  - “Extras Disponibles” con sus toggles
  - “Removibles” con sus toggles
- Probar lectura y mutación:
  - crear/editar/eliminar grupo opcional
  - activar/desactivar extra
  - activar/desactivar removible
  - editar nombres display/nombre carta
- Confirmar también que `item_modifiers` siga operativo y que no haya regresión en otras pantallas que usan los mismos helpers.

Detalles técnicos
- Evidencia ya confirmada:
  - `menu_item_option_groups` responde 200 pero vacío para items que sí tienen grupos cargados.
  - `extra_assignments` y `removable_items` fallan con `relation "public.user_roles_v2" does not exist`.
  - En base hay datos reales:
    - grupos opcionales cargados
    - extras asignados
    - removibles activos
- Alcance esperado del fix:
  - principal: Centro de Costos
  - secundario: otras partes que dependan de los mismos helpers de acceso
- No hace falta rediseñar estas tablas; el arreglo es principalmente una reparación de RLS/helpers y un pequeño endurecimiento de UI.
