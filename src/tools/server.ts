export function getUrl<T>(url: string, params: T): string {
  let tmpUrl = `${url}?`
  for (const k in params) {
    tmpUrl += `${k}=${params[k]}&`
  }
  return tmpUrl
}
