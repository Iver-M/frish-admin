export function createEvidenceBlobLifecycle({
  createObjectURL = (blob) => URL.createObjectURL(blob),
  revokeObjectURL = (url) => URL.revokeObjectURL(url),
} = {}) {
  let currentUrl = null

  function replace(blob) {
    clear()
    currentUrl = createObjectURL(blob)
    return currentUrl
  }

  function clear() {
    if (!currentUrl) return false
    const previous = currentUrl
    currentUrl = null
    revokeObjectURL(previous)
    return true
  }

  return Object.freeze({ replace, clear, current: () => currentUrl })
}
