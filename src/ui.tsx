import { createContext, useContext } from 'react'
import type { MedRecord } from './types'

export interface Ui {
  openChat: (focus?: MedRecord) => void
}
export const UiCtx = createContext<Ui>({ openChat: () => {} })
export const useUi = () => useContext(UiCtx)
