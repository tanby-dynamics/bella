import { ElectronAPI } from '@electron-toolkit/preload'
import type { BellaApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: BellaApi
  }
}
