// HTML string helpers for card ability text (rendered with dangerouslySetInnerHTML; input is escaped first)
export const esc = (s: unknown) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c])

/** bold "Keyword:" / "Keyword (x):" labels at line starts, after ". " or after Thai text */
export const fmtAb = (s: string) => esc(s).replace(/(^|\n|\. |[฀-๿] )([A-Z][A-Za-z ]{1,24}?)(\s?\([^()\n]{1,12}\))?:/g, (_m, a, b, c) => `${a}<span class="k">${b}${c || ''}</span>:`)
