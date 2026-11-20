function isValidDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''))
  if (!match) return false
  const [, rawYear, rawMonth, rawDay] = match
  const year = Number(rawYear)
  const month = Number(rawMonth)
  const day = Number(rawDay)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function isValidUrl(value) {
  try {
    const url = new URL(String(value))
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

export function isFieldVisible(field, values) {
  return Object.entries(field.visibleWhen ?? {}).every(([key, expected]) =>
    Array.isArray(expected) ? expected.includes(values[key]) : values[key] === expected
  )
}

export function validateConfiguredFields(fields, values) {
  for (const field of fields) {
    const value = values[field.key]
    if (value === '' || value === null || value === undefined) continue

    if (field.type === 'date' && !isValidDate(value)) {
      throw new Error(`${field.label} debe ser una fecha válida.`)
    }
    if (field.type === 'time' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value))) {
      throw new Error(`${field.label} debe tener un formato de hora válido.`)
    }
    if (field.type === 'url' && !isValidUrl(value)) {
      throw new Error(`${field.label} debe ser una URL HTTP o HTTPS válida.`)
    }
    if (field.urlList) {
      const urls = String(value).split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      if (urls.some((url) => !isValidUrl(url))) {
        throw new Error(`${field.label} debe contener únicamente URL HTTP o HTTPS, una por línea.`)
      }
    }
  }

  if (values.startDate && values.estimatedEndDate && values.estimatedEndDate < values.startDate) {
    throw new Error('La fecha estimada de finalización no puede ser anterior a la fecha de inicio.')
  }

  if (values.sowingDate && values.germinationDate && values.germinationDate < values.sowingDate) {
    throw new Error('La germinación no puede ser anterior a la siembra.')
  }
  if (values.sowingDate && values.transplantDate && values.transplantDate < values.sowingDate) {
    throw new Error('El trasplante no puede ser anterior a la siembra.')
  }
  if (values.germinationDate && values.transplantDate && values.transplantDate < values.germinationDate) {
    throw new Error('El trasplante no puede ser anterior a la germinación.')
  }
  if (values.date && values.followUpDate && values.followUpDate < values.date) {
    throw new Error('La fecha de seguimiento no puede ser anterior a la fecha de la incidencia.')
  }

  const applications = Array.isArray(values.applications) ? values.applications : []
  if (values.applicationType && applications.length === 0) {
    throw new Error('Agrega al menos un producto aplicado o selecciona una actividad sin aplicación.')
  }
  if (!values.applicationType && applications.length > 0) {
    throw new Error('Selecciona el tipo de aplicación para los productos registrados.')
  }
  for (const application of applications) {
    if (!application.inputId) throw new Error('Selecciona el producto aplicado.')
    if (!(Number(application.quantity) > 0)) throw new Error('La cantidad aplicada debe ser mayor que cero.')
    if (!(Number(application.dose) > 0)) throw new Error('La dosis debe ser mayor que cero.')
    if (!application.quantityUnit || !application.doseUnit || !application.method) {
      throw new Error('Completa las unidades de cantidad y dosis, y el método de aplicación.')
    }
    if (application.expirationDate && !isValidDate(application.expirationDate)) {
      throw new Error('La fecha de vencimiento del producto aplicado debe ser válida.')
    }
    if (values.date && application.expirationDate && application.expirationDate < values.date) {
      throw new Error('El producto aplicado no puede estar vencido en la fecha de la actividad.')
    }
    for (const [key, label] of [
      ['reentryIntervalDays', 'El período de reentrada'],
      ['preharvestIntervalDays', 'El período de carencia']
    ]) {
      if (application[key] !== '' && application[key] !== null && application[key] !== undefined &&
          (!Number.isFinite(Number(application[key])) || Number(application[key]) < 0)) {
        throw new Error(`${label} debe ser un número igual o mayor que cero.`)
      }
    }
  }

  const trainingRecords = Array.isArray(values.trainingRecords) ? values.trainingRecords : []
  for (const training of trainingRecords) {
    const hasTrainingData = [training.title, training.date, training.provider]
      .some((value) => String(value ?? '').trim())
    if (!hasTrainingData) continue
    if (!String(training.title ?? '').trim() || !training.date) {
      throw new Error('Cada capacitación registrada debe incluir tema y fecha.')
    }
    if (!isValidDate(training.date)) {
      throw new Error('La fecha de cada capacitación debe ser válida.')
    }
  }
}
