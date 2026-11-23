import { describe, expect, it } from "vitest"
import { canAccess, canManageNotificationActions, canWrite } from "@/services/permissions"

describe("role permissions (Línea Base v2.1.1)", () => {
  it("restricts user administration and finance to ADMIN_PRODUCTOR", () => {
    expect(canAccess({ role: "ADMIN_PRODUCTOR" }, "users")).toBe(true)
    expect(canWrite({ role: "ADMIN_PRODUCTOR" }, "users")).toBe(true)
    expect(canAccess({ role: "ADMIN_PRODUCTOR" }, "finance")).toBe(true)
    expect(canAccess({ role: "TECNICO_AGRONOMO" }, "users")).toBe(false)
    expect(canAccess({ role: "TECNICO_AGRONOMO" }, "finance")).toBe(false)
  })

  it("allows ADMIN_PRODUCTOR and TECNICO_AGRONOMO to manage notifications and ICA book", () => {
    expect(canManageNotificationActions({ role: "ADMIN_PRODUCTOR" })).toBe(true)
    expect(canManageNotificationActions({ role: "TECNICO_AGRONOMO" })).toBe(true)
    expect(canAccess({ role: "TECNICO_AGRONOMO" }, "ica-book")).toBe(true)
  })

  it("gives OPERARIO_CAMPO read-only access to calendar and telemetry without finance or ICA book", () => {
    const operator = { role: "OPERARIO_CAMPO" }

    expect(canAccess(operator, "calendar")).toBe(true)
    expect(canAccess(operator, "telemetry")).toBe(true)
    expect(canAccess(operator, "users")).toBe(false)
    expect(canAccess(operator, "finance")).toBe(false)
    expect(canAccess(operator, "ica-book")).toBe(false)
    expect(canWrite(operator, "activities")).toBe(false)
  })

  it("preserves cycle and activity write access for ADMIN_PRODUCTOR and TECNICO_AGRONOMO", () => {
    expect(canWrite({ role: "ADMIN_PRODUCTOR" }, "cycles")).toBe(true)
    expect(canWrite({ role: "TECNICO_AGRONOMO" }, "activities")).toBe(true)
  })
})
