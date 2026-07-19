'use client'

import { createContext, useContext } from 'react'

// Abre el drill-down de pedidos por causa y/o desenlace, sin pasar por la URL.
export type DrillFn = (causa: string | null, desenlace: string | null) => void

export const DrillContext = createContext<DrillFn | null>(null)
export const useDrill = () => useContext(DrillContext)
