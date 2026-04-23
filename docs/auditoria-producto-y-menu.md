# Auditoría — Producto y Menú (Mi Marca)

Flujo completo de cada botón dentro de la sección `menu-eng` del sidebar de Mi Marca. Para cada acción: qué hook llama, qué endpoint dispara, qué tabla toca, y si el flujo está completo o tiene gaps.

> **Método**: análisis estático sobre `main`, sin ejecutar flujos en runtime.

---

## Resumen

| Métrica | Valor |
|---|---|
| Páginas auditadas | 10 |
| Acciones clickeables auditadas | ~110 |
| Gaps críticos (P0) | 3 |
| Gaps funcionales (P1) | 4 |
| Bugs / UX menores (P2) | 12 |

---

## Mapa de la sección

Items del sidebar `menu-eng`, en orden, con ruta y estado general.

| Label | Ruta | Componente | Permiso | Estado |
|---|---|---|---|---|
| Carta | `/mimarca/carta` | `MenuCartaPage.tsx` | `canViewInsumos` | 2 bugs |
| Canales de Venta | `/mimarca/canales-venta` | `CanalesVentaPage.tsx` | `canViewInsumos` | OK c/gap |
| Cambios por canal | `/mimarca/cambios-canal` | `ChannelPendingChangesPage.tsx` | `canViewInsumos` | OK |
| Categorías Carta | `/mimarca/categorias-carta` | `CategoriasCartaPage.tsx` | `canViewInsumos + superadmin` | Código muerto |
| Recetas | `/mimarca/recetas` | `PreparacionesPage.tsx` | `canViewInsumos + superadmin` | 2 bugs |
| Catálogo de Compras | `/mimarca/finanzas/insumos` | `InsumosPage.tsx` | `canViewInsumos` | OK |
| Proveedores | `/mimarca/finanzas/proveedores` | `ProveedoresPage.tsx` | `canViewProveedoresMarca` | OK |
| Promociones | `/mimarca/promociones` | `PromocionesPage.tsx` | `canViewInsumos` | UX + 1 gap |
| Códigos Descuento | `/mimarca/codigos-descuento` | `CodigosDescuentoPage.tsx` | `canViewInsumos` | Falta UI |
| Control de Costos | `/mimarca/centro-costos` | `CentroCostosPage.tsx` | `canViewInsumos + superadmin` | **3 gaps** |

---

## Hallazgos críticos (cross-cutting)

### P0 — Fase 3: visibilidad por canal no se aplica en POS ni WebApp

El ojo/ojo-tachado en `Canales de Venta → Precios por Producto` persiste correctamente en `price_list_items.is_visible`, pero **ningún consumidor lo lee**.

- `PedirPage.tsx` y `ProductGrid.tsx` llaman a `buildSellableArticles` sin pasar `isVisibleInChannel`.
- El endpoint público `GET /api/menu/webapp/items` tampoco cruza `price_list_items`.

**Efecto**: ocultar un artículo del canal es visualmente admin-only; en POS y WebApp se sigue vendiendo igual.

### P0 — El botón "Actualizar Costos" en Centro de Costos es un no-op

`POST /api/admin/recalculate-all-costs` responde éxito pero no recalcula nada. El botón hace solo `refetch` de datos pre-calculados. Ítems con composición nueva / insumos con precio cambiado quedan con `total_cost` y `fc_actual` desactualizados hasta que se toca cada uno individualmente.

### P0 — Guardar composición no dispara recálculo de costo del ítem

`ComposicionInline.tsx` al guardar llama `POST /menu/items/:id/composition`, que hace delete+insert en `menu_item_compositions` pero **no actualiza** `menu_items.total_cost`. Los flujos de extras y grupos opcionales sí llaman a `recalcularCostoItemCarta`; este camino no.

**Fix**: encadenar `POST /items/:id/recalculate-cost` tras guardar composición.

### P1 — `custom_name` / `custom_image_url` por canal se persisten pero no se consumen

Fase 3 agregó columnas para override visual por canal. El backend las guarda, pero ninguna vista (POS, WebApp, listados admin) las lee. Hoy son dead fields.

### P1 — Combos no tienen flujo específico en POS

`ProductGrid.tsx` solo filtra `type !== 'extra'`, así que combos (`type = 'combo'`) aparecen en la grilla y abren el `ModifiersModal` genérico. No hay expansión a componentes ni señalización visual. El módulo Combo (`menu_item_components`) vive solo en admin.

### P1 — Cache invalidation: cambios en admin no refrescan WebApp

- `useItemCartaMutations` invalida `['items-carta']` (POS) pero no `['webapp-menu-items']`.
- Cambios de precio en `Canales de Venta` tampoco pinchan cachés de menú POS/WebApp.

El usuario ve datos viejos hasta navegar.

### P1 — Campo `visible_en_carta` vs `is_visible_menu` (primer click al ojo puede estar roto)

En `MenuCartaPage`, la UI lee `cat.visible_en_carta` pero la API devuelve `is_visible_menu`. El toggle manda `!undefined === true`, lo que puede hacer que el primer click siempre intente mostrar en vez de invertir el estado.

---

## Auditoría detallada por página

### 1. Carta — `MenuCartaPage.tsx`

Listado editable de categorías del menú con sus ítems. Búsqueda local, reordenable por drag, edición inline de nombre, ocultar/mostrar en carta, expandir para ver preview del producto.

| Acción | Hook / Mutación | Endpoint | Tabla |
|---|---|---|---|
| Ir a Control de Costos | Link navegación | — | — |
| Nueva Categoría (✓) | `useMenuCategoriaMutations.create` | `POST /api/menu/categories` | `menu_categories` |
| Drag reordenar | `reorder.mutateAsync` | `POST /api/menu/categories/reorder` | `menu_categories.sort_order` |
| Ojo / ojo tachado | `toggleVisibility.mutate` | `PUT /api/menu/categories/:id/visibility` | `menu_categories.is_visible_menu` |
| Lápiz (editar nombre) | `update.mutateAsync` | `PUT /api/menu/categories/:id` | `menu_categories.name` |
| Papelera → confirmar | `softDelete.mutateAsync` | `DELETE /api/menu/categories/:id` | `menu_categories.is_active = false` |
| Click en item (expandir) | Estado local (ProductPreviewPanel) | — | — |
| Subir/cambiar foto | `uploadProductImage` | `POST /menu/items/:id/upload-image` | **501 — NO IMPLEMENTADO** |

**Bugs detectados:**
1. UI lee `cat.visible_en_carta`, API devuelve `is_visible_menu`. Primer click al ojo puede fallar.
2. Badge "Delivery" lee `item.disponible_delivery`, DB guarda `available_delivery`: el badge nunca aparece.
3. Upload de imagen devuelve `501` desde el backend. El flujo de foto desde acá está roto.

---

### 2. Canales de Venta — `CanalesVentaPage.tsx`

3 tabs: Canales y Comisiones / Reglas de Precio / Precios por Producto. Gestiona listas de precio por canal y overrides por ítem.

#### Tab: Canales y Comisiones

| Acción | Hook / Mutación | Endpoint | Tabla |
|---|---|---|---|
| Exportar PDF (snapshot) | jsPDF + autoTable (solo cliente) | — | — |
| Nuevo Canal → Crear | `insertPriceLists` | `POST /api/promotions/price-lists` | `price_lists` |
| Guardar comisión (ícono Save) | `updateConfig.mutateAsync` | `PUT /api/promotions/price-lists/:id` | `price_lists.pricing_value` |
| Basura (eliminar canal) | `deletePriceList` | `DELETE /api/promotions/price-lists/:id` | `price_lists + price_list_items` |
| **Switch "Activo"** | **disabled fijo — NO hace nada** | — | — |

#### Tab: Reglas de Precio

| Acción | Hook / Mutación | Endpoint | Tabla |
|---|---|---|---|
| Select modo (base/percentage/fixed/mirror/manual) | `handleModeChange → updateConfig` | `PUT /api/promotions/price-lists/:id` | `price_lists.pricing_mode` |
| Input valor %/monto fijo | `handleValueChange → updateConfig` | `PUT /api/promotions/price-lists/:id` | `price_lists.pricing_value` |
| Select canal espejo (mirror) | `handleMirrorChange → updateConfig` | `PUT /api/promotions/price-lists/:id` | `price_lists.mirror_channel` |

#### Tab: Precios por Producto

| Acción | Hook / Mutación | Endpoint | Tabla |
|---|---|---|---|
| Click celda → editar precio | `bulkUpdate.mutate` | `POST /api/promotions/price-lists/:id/items/bulk` | `price_list_items.price` |
| **Ícono ojo (Fase 3)** | `updateItem.mutate (useUpdatePriceListItem)` | `PUT /api/promotions/price-lists/:id/items/:itemId` | `price_list_items.is_visible` |

> **Gap crítico**: visibilidad no llega a POS/WebApp. Persiste en DB pero `buildSellableArticles` no recibe `isVisibleInChannel` desde `PedirPage` ni `ProductGrid`. Fix: construir el map de visibility desde `useAllPriceListItems` + canal activo y pasarlo al build.

---

### 3. Cambios por canal — `ChannelPendingChangesPage.tsx`

Tabs Rappi / PedidosYa / MP Delivery. Muestra cambios pendientes acumulados automáticamente, genera PDF checklist, registra exports e histórico.

#### Acciones

| Acción | Hook / Mutación | Endpoint | Tabla |
|---|---|---|---|
| Tabs (Rappi/PY/MPD) | `fetchPendingChanges` | `GET /api/channels/pending-changes?channel_code` | `channel_pending_changes` |
| Generar PDF | `exportMutation + generateChannelChangesPdf` | `POST /api/channels/:code/export` | `channel_pdf_exports + pending.included_in_pdf_id` |
| Histórico: Marcar cargado | `confirmMutation` | `PUT /api/channels/exports/:id/confirm` | `channel_pdf_exports.confirmed_loaded_at` |

#### Triggers que alimentan los pendientes

| Origen | Evento | `change_type` |
|---|---|---|
| Canales de Venta (bulk upsert) | Precio modificado en app channel | `price_change` |
| Canales de Venta (ojo toggle) | Visibilidad cambiada en app channel | `deactivation` / `activation` |
| Promos (crear/editar/toggle/borrar) | Cambio en promo configurada para app channel | `new_promotion` / `promotion_change` / `promotion_end` |

> **Bug UX menor**: `confirming={confirmMutation.isPending}` deshabilita todos los botones "Marcar cargado" de la lista cuando uno está en curso (no solo el que se clickeó). No bloquea el uso, pero genera flicker.

---

### 4. Categorías Carta — `CategoriasCartaPage.tsx`

Alternativa a Carta que además deja elegir "Tipo de impresión" (Comanda / Vale / No imprimir) por categoría. Sin tabs.

| Acción | Hook / Mutación | Endpoint | Tabla |
|---|---|---|---|
| Nueva Categoría (✓) | `create.mutateAsync` | `POST /api/menu/categories` | `menu_categories + print_type` |
| Drag reordenar | `reorder.mutateAsync` | `POST /api/menu/categories/reorder` | `menu_categories.sort_order` |
| Lápiz (editar nombre + tipo impresión) | `handleUpdate → update.mutateAsync` | `PUT /api/menu/categories/:id` | `menu_categories.name + print_type` |
| Papelera | `softDelete` | `DELETE /api/menu/categories/:id` | `menu_categories.is_active = false` |

> **Código muerto detectado**: `handleTipoChange` se define en la página y se pasa al hijo, donde se renombra a `_handleTipoChange` y se ignora. La intención de cambiar tipo sin entrar a editar el nombre no existe en runtime.

---

### 5. Recetas — `PreparacionesPage.tsx`

Listado de preparaciones (recetas) agrupadas por categoría. Modal para crear con tabs "General" + "Ficha técnica / Opciones". Edición inline en fila expandida.

| Acción | Hook / Mutación | Endpoint | Tabla |
|---|---|---|---|
| Nueva Receta (modal General → Continuar) | `mutations.create` | `POST /api/menu/recipes` | `recipes` |
| Guardar Ficha (ingredientes) | `saveIngredientes` | `POST /api/menu/recipes/:id/ingredients` | `recipe_ingredients (delete+insert)` |
| Guardar Opciones (tipo componente) | `saveOpciones` | `POST /api/menu/recipes/:id/options` | `recipe_options` |
| Inline Nombre/Descripción/Categoría | `mutations.update` | `PUT /api/menu/recipes/:id` | `recipes.name / description / categoria_preparacion_id` |
| Papelera receta | `mutations.softDelete` | `DELETE /api/menu/recipes/:id` | `recipes.deleted_at` |
| Nueva / Editar categoría preparación | `catMutations.create / update` | `POST/PUT /api/menu/recipe-categories` | `recipe_categories` |

**Bugs detectados:**
1. `FichaTecnicaTab` mapea `cantidad: item.quantity` pero el resto del código usa `quantity`. Filas cargadas llegan con `quantity` undefined hasta editar.
2. Al crear receta, `mutations.create` no manda `categoria_preparacion_id` aunque se elija en "General". Hay que fijarla después desde la lista con inline edit.

---

### 6. Catálogo de Compras — `InsumosPage.tsx`

Tabs Ingredientes / Insumos / Productos. Sub-filtro Obligatorio / Sugerido.

| Acción | Hook / Mutación | Endpoint | Tabla |
|---|---|---|---|
| Nuevo Ingrediente/Insumo/Producto (modal) | `useInsumoMutations.create` | `POST /api/menu/supplies` | `supplies` |
| Lápiz (editar) | `useInsumoMutations.update` | `PUT /api/menu/supplies/:id` | `supplies` |
| Papelera → confirmar | `softDelete` | `DELETE /api/menu/supplies/:id` | `supplies.deleted_at` |
| Filtros Obligatorio / Sugerido / búsqueda | Estado local | — | — |

---

### 7. Proveedores — `ProveedoresPage.tsx`

Listado simple de proveedores de la marca. Sin tabs.

| Acción | Hook / Mutación | Endpoint | Tabla |
|---|---|---|---|
| Nuevo Proveedor (modal) | `create` | `POST /api/suppliers` | `suppliers` |
| Lápiz (editar) | `update` | `PUT /api/suppliers/:id` | `suppliers` |
| Papelera | `softDelete` | `DELETE /api/suppliers/:id` | `suppliers.deleted_at` |

> **Patrón frágil**: el listado usa `branch_id=__marca_only__` como hack para filtrar por marca (query trae `OR ambito = 'marca'`). Funciona pero conviene reemplazar por un flag explícito.

---

### 8. Promociones — `PromocionesPage.tsx` + `PromoFormFields.tsx`

Listado agrupado por día. Formulario compartido entre "Nueva" (dialog) y edición inline en la card. Incluye cards por canal con overrides de precio/formato/funded_by (Fase 2).

#### Lista de promos (`PromoCard`)

| Acción | Hook / Mutación | Endpoint | Tabla |
|---|---|---|---|
| Click fila → editar inline | Estado local + fetch items con extras | `GET /api/admin/promotions/:id/items-with-extras` | `promotion_items + promotion_item_extras` |
| Switch (activa/inactiva) | `toggleActive.mutate` | `PUT /api/promotions/:id/toggle-active` | `promotions.is_active + logs app channels` |
| Duplicar (icono Copy) | `fetchPromoItemsWithExtras + openForm` | `GET items-with-extras` | Lectura (abre dialog) |
| Papelera → confirmar | `remove.mutateAsync` | `DELETE /api/promotions/:id` | `promotions.deleted_at + logs promotion_end` |

#### Formulario (`PromoFormFields`)

| Sección | Campos clave | Persiste en |
|---|---|---|
| Descuento | tipo, valor, "Aplicar a todos" | `promotions.type / value` |
| **Dónde aplica (Fase 2)** | Card expandible por canal con funded_by / display_format / precio override / texto | `promotion_channel_config (replace all)` |
| Cuándo aplica | días, horarios, rango fechas | `promotions.dias_semana / hora_inicio / hora_fin / start_date / end_date` |
| Productos | buscar carta, precio promo por ítem, extras incluidos | `promotion_items + promotion_item_extras` |
| Restricciones | funded_by default, display_format default, show_in_webapp_section, restriccion_pago, tipo_usuario | `promotions (varias columnas)` |

#### Guardar (Crear / Actualizar)

| Paso | Endpoint |
|---|---|
| 1. Crear/actualizar promo + canal configs | `POST/PUT /api/promotions[/:id]` |
| 2. Replace items | `DELETE + POST /api/promotions/:id/items` |
| 3. Insertar extras preconfigurados | `POST /api/promotions/preconfig-extras/batch` |
| 4. (auto) Log cambios a canales externos | `channel_pending_changes` |

**Gaps / UX:**
1. Switch "Activa" en el form es un `sr-only` checkbox casi invisible (hay uno funcional en la card, pero inconsistente).
2. Alineación API/form: `promotions` usa columnas en inglés (`type/value/description`); el front envía nombres en español en algunos lugares. Verificar en runtime que el `PUT` rellene las columnas correctas.

---

### 9. Códigos Descuento — `CodigosDescuentoPage.tsx`

Listado de códigos públicos de descuento. Usados en checkout vía `PromoCodeInput`.

| Acción | Hook / Mutación | Endpoint | Tabla |
|---|---|---|---|
| Nuevo Código (modal) | `create.mutateAsync` | `POST /api/promotions/discount-codes` | `discount_codes` |
| Copiar código (clipboard) | `navigator.clipboard.writeText` | — | — |
| Lápiz (editar) | `update.mutateAsync` | `PUT /api/promotions/discount-codes/:id` | `discount_codes` |
| Papelera | `remove.mutateAsync` | `DELETE /api/promotions/discount-codes/:id` | `discount_codes.deleted_at` |

> **UI incompleta**: el tipo `CodigoDescuentoFormData` incluye `branch_ids` pero el formulario no expone la selección de sucursales. Al crear queda vacío (código aplica a todas las sucursales). El modal tampoco tiene botón "Cancelar" explícito.

---

### 10. Control de Costos — `CentroCostosPage.tsx`

Página más compleja de la sección. Tabs Análisis / Simulador / Actualizar Precios. Además abre `ItemExpandedPanel` con sub-tabs (Composición / Combo / Canales / Editar / Historial).

#### Top-level

| Acción | Hook / Mutación | Endpoint | Tabla |
|---|---|---|---|
| Ir a Carta (link) | — | — | — |
| **Actualizar Costos (botón refresh)** | `recalcularTodosLosCostos + refetch` | `POST /api/admin/recalculate-all-costs` | **STUB — no recalcula** |
| Nuevo Item → ItemFormModal | `mutations.create` | `POST /api/menu/items` | `menu_items (incl. type)` |

#### Tab: Análisis

| Acción | Efecto |
|---|---|
| Búsqueda + filtros (Todos/OK/Atención/Críticos) | Estado local — sin red |
| Click categoría → colapsa | Estado local |
| Click fila → ItemExpandedPanel | Abre panel (ver abajo) |
| Link "≈ $XXXX" (Sugerido) | Encola precio redondeado y cambia a tab "Actualizar" |

#### Tab: Simulador

| Acción | Efecto |
|---|---|
| Input % + "Subir todo +X%" | Rellena precios simulados (estado local) |
| "Ajustar a CMV objetivo" | Calcula precios según FC target |
| "Limpiar" | Borra simulación |
| "Aplicar estos precios" | Copia a cola pending y cambia a tab "Actualizar" |

#### Tab: Actualizar Precios

| Acción | Hook / Mutación | Endpoint | Tabla |
|---|---|---|---|
| Papelera por fila | Estado local | — | — |
| "Descartar" | Estado local | — | — |
| "Confirmar" | `cambiarPrecioItemCarta (loop)` | `POST /menu/items/:id/change-price` | `menu_item_price_history + menu_items.base_price` |

#### `ItemExpandedPanel` — Composición

| Acción | Hook / Mutación | Endpoint | Tabla |
|---|---|---|---|
| "Guardar Composición" | `mutations.saveComposicion` | `POST /menu/items/:id/composition` | `menu_item_compositions (delete+insert)` |
| ExtraRow (switch + nombre) | `useToggleExtra` | Varios (crear extra, asignar, recalc) | `extra_assignments + menu_items` |
| Removibles (toggles) | `useItemRemoviblesMutations` | `POST/DELETE /menu/items/:id/removables` | `removable_items` |
| Grupos opcionales | `useGruposOpcionalesMutations` | `/menu/item/:id/option-groups + recalc` | `menu_item_option_groups + _items` |

#### `ItemExpandedPanel` — Combo (Fase 6)

| Acción | Hook / Mutación | Endpoint | Tabla |
|---|---|---|---|
| Buscar + agregar componente | Estado local | — | — |
| Papelera / input cantidad | Estado local | — | — |
| "Guardar y recalcular" | `useReplaceComboComponents` | `PUT combo-components + POST recalculate-combo-cost` | `menu_item_components + menu_items.total_cost` |

#### `ItemExpandedPanel` — Canales (Fase 2/3)

| Acción | Hook / Mutación | Endpoint | Tabla |
|---|---|---|---|
| Input precio por canal | Estado local hasta Guardar | — | — |
| RotateCcw (borrar override) | `deletePriceOverride` | `DELETE /promotions/price-lists/:id/items/:itemId` | `price_list_items (fila)` |
| "Guardar" (con cambios) | `bulkUpdate.mutateAsync (loop por canal)` | `POST /promotions/price-lists/:id/items/bulk` | `price_list_items` |

#### `ItemExpandedPanel` — Editar

| Acción | Hook / Mutación | Endpoint | Tabla |
|---|---|---|---|
| "Guardar Cambios" | `mutations.update` | `PUT /menu/items/:id` | `menu_items (name, short_name, description, base_price, reference_price, fc_objetivo, available_delivery)` |

#### `ItemFormModal` — Tipo: Simple / Combo

Agregado recientemente. Al crear "Combo" envía `tipo: 'combo'`; al crear "Simple" envía `tipo: null`; en edición, elegir "Simple" no manda nada (para no pisar `type` preexistente como `'extra'`).

**3 gaps críticos en Centro de Costos:**
1. "Actualizar Costos" llama a `POST /admin/recalculate-all-costs` que es un **stub en el backend**. No recalcula nada.
2. Guardar composición fija no dispara `recalcularCostoItemCarta`. El `total_cost` queda desactualizado hasta que otro flujo lo toque.
3. `ComposicionModal`, `HistorialModal` y el `ConfirmDialog` top-level de delete están declarados en `CentroCostosPage` pero nunca se invoca su setter — código muerto.

**Bugs UX menores:**
- Botón "Cancelar" en footer de Canales llama `setPriceEdits({})` dos veces (copy-paste).
- `ItemFormModal`: cambiar un combo a "Simple" en edición no envía `tipo` al backend. El `type` queda como `'combo'`. Fix: enviar `tipo: null` explícito cuando el usuario cambia a simple.

---

## Checklist de fixes priorizada

| # | Prioridad | Fix | Impacto |
|---|---|---|---|
| 1 | **P0** | Plumbing de `isVisibleInChannel` en `PedirPage` y `ProductGrid` (map de visibility desde `useAllPriceListItems`) | Sin esto la Fase 3 no funciona end-to-end |
| 2 | **P0** | Implementar `POST /admin/recalculate-all-costs` o deshabilitar el botón | Evita ilusión de recálculo global |
| 3 | **P0** | Encadenar `recalcularCostoItemCarta` tras guardar composición fija | FC/costo quedan correctos tras editar recetas |
| 4 | P1 | Invalidation cross-app: tras mutaciones de ítems/precios, pinchar `['webapp-menu-items']` | WebApp ve cambios sin F5 |
| 5 | P1 | Fix toggle visible de categoría en `MenuCartaPage`: alinear nombre de campo (`is_visible_menu`) | Ojo de categorías funciona en el primer click |
| 6 | P1 | Consumir `custom_name` / `custom_image_url` en `buildSellableArticles` | Promesa de Fase 3 completa |
| 7 | P1 | Fix upload de imagen del producto (backend 501) | Flujo de foto desde Carta |
| 8 | P2 | Switch "Activo" de lista en Canales de Venta: habilitar o esconder | UX coherente (hoy miente) |
| 9 | P2 | Limpiar código muerto (`ComposicionModal`, `HistorialModal` en `CentroCostosPage`; `_handleTipoChange` en `CategoriasCartaPage`) | Menos ruido para el próximo dev |
| 10 | P2 | Exponer `branch_ids` en form de Códigos Descuento | Permite restringir códigos a locales |
| 11 | P2 | Corregir mapeo `cantidad` ↔ `quantity` en `FichaTecnicaTab` | Ingredientes se cargan con cantidad correcta |
| 12 | P2 | Enviar `categoria_preparacion_id` al crear receta | Categoría queda fija desde el modal |
| 13 | P2 | Arreglar "Combo → Simple" en `ItemFormModal` edición | Permite revertir tipo |
| 14 | P2 | Proveedores: reemplazar hack `__marca_only__` por flag explícito | Query más robusta |
| 15 | P2 | Deshabilitar solo la fila en curso en "Marcar cargado" de Cambios por canal | Menos flicker |
| 16 | P2 | Unificar Switch "Activa" de promo: el form tiene un sr-only escondido | UX coherente con la card |
