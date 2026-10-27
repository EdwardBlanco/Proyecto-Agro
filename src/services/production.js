export function harvestKilograms(harvest) {
  const quantity = Number(harvest.quantity) || 0
  if (harvest.unit === 'kg') return quantity
  if (harvest.unit === 'toneladas') return quantity * 1000
  return 0
}
