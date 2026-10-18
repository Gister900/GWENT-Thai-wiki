import { useLang } from '../store'
import { UI, type Dict } from './ui'

/** UI dictionary of the current language */
export const useT = (): Dict => UI[useLang()]
