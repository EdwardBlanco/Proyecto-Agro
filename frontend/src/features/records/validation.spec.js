import { describe, expect, it } from 'vitest'
import { isFieldVisible, validateConfiguredFields } from './validation'

describe('record form validation', () => {
  it('only shows fields matching their current conditional values', () => {
    const field = { visibleWhen: { role: ['Operario'], eppStatus: ['Entregado'] } }

    expect(isFieldVisible(field, { role: 'Operario', eppStatus: 'Entregado' })).toBe(true)
    expect(isFieldVisible(field, { role: 'Admin', eppStatus: 'Entregado' })).toBe(false)
    expect(isFieldVisible(field, { role: 'Operario', eppStatus: 'Pendiente' })).toBe(false)
  })

  it('rejects invalid real dates and non-HTTP evidence references', () => {
    expect(() => validateConfiguredFields([
      { key: 'date', label: 'Fecha', type: 'date' },
      { key: 'evidence', label: 'Evidencia', type: 'textarea', urlList: true }
    ], {
      date: '2025-02-29',
      evidence: 'javascript:alert(1)'
    })).toThrow('Fecha debe ser una fecha válida.')

    expect(() => validateConfiguredFields([
      { key: 'evidence', label: 'Evidencia', type: 'textarea', urlList: true }
    ], { evidence: 'javascript:alert(1)' })).toThrow('Evidencia debe contener únicamente URL HTTP o HTTPS, una por línea.')
  })

  it('requires complete application details when a product application is selected', () => {
    expect(() => validateConfiguredFields([], {
      applicationType: 'Plaguicida',
      applications: [{ inputId: 'input-1', quantity: 1, dose: 1 }]
    })).toThrow('Completa las unidades de cantidad y dosis, y el método de aplicación.')
  })

  it('validates required training topic and date when a training record has data', () => {
    expect(() => validateConfiguredFields([], {
      trainingRecords: [{ title: 'Primeros auxilios', date: '', provider: 'SENA' }]
    })).toThrow('Cada capacitación registrada debe incluir tema y fecha.')
  })
})
