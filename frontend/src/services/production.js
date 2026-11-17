/**
 * Utilidades de cálculo productivo compartidas por DashboardPage.vue y CycleDetailPage.vue.
 */

/**
 * Convierte la cantidad de una cosecha a kilogramos cuando la unidad es compatible ('kg' o 'toneladas').
 */
export function harvestKilograms(harvest) {
  const quantity = Number(harvest.quantity) || 0
  if (harvest.unit === 'kg') return quantity
  if (harvest.unit === 'toneladas') return quantity * 1000
  return 0
}
