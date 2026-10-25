function copyWithExecCommand(value: string): boolean {
  const field = document.createElement("textarea")
  field.value = value
  field.setAttribute("readonly", "")
  field.setAttribute("aria-hidden", "true")
  field.style.position = "fixed"
  field.style.top = "0"
  field.style.left = "0"
  field.style.width = "1px"
  field.style.height = "1px"
  field.style.opacity = "0"
  document.body.appendChild(field)
  field.focus()
  field.select()
  field.setSelectionRange(0, field.value.length)
  let ok = false
  try {
    ok = document.execCommand("copy")
  } catch {
    ok = false
  }
  document.body.removeChild(field)
  return ok
}

export function copyText(value: string): Promise<void> {
  if (typeof document !== "undefined" && copyWithExecCommand(value)) {
    return Promise.resolve()
  }
  const write = typeof navigator !== "undefined" ? navigator.clipboard?.writeText : undefined
  if (write) return write.call(navigator.clipboard, value)
  return Promise.reject(new Error("Copy is not available"))
}
