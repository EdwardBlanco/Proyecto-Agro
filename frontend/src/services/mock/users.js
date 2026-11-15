import { getRecords } from '@/services/storage'

// TODO: Replace with the real users endpoint when it is available.
export function getResponsibleUsers() {
  return getRecords('users')
    .filter((user) => user.active)
    .map((user) => ({ label: user.name, value: user.id }))
}
