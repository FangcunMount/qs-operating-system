/**
 * 生成uuid
 * @param {Number} len 指定uuid的长度
 * @param {Number} radix 进制，默认16进制
 */
export function uuid(len = 12, radix = 16): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('')
  const uuid: Array<string> = []
  let i = 0
  radix = radix || chars.length

  if (len) {
    // Compact form
    for (i = 0; i < len; i++) uuid[i] = chars[0 | (Math.random() * radix)]
  } else {
    // rfc4122, version 4 form
    let r

    // rfc4122 requires these characters
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-'
    uuid[14] = '4'

    // Fill in random data.  At i==19 set the high bits of clock sequence as
    // per rfc4122, sec. 4.1.5
    for (i = 0; i < 36; i++) {
      if (!uuid[i]) {
        r = 0 | (Math.random() * 16)
        uuid[i] = chars[i == 19 ? (r & 0x3) | 0x8 : r]
      }
    }
  }

  return uuid.join('')
}

export function getParamsValueFromHref(name: string): string {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(window.location.href) || ['', ''])[1].replace(/\+/g, '%20'))
}

function getType(type: string) {
  return function (v: unknown) {
    return Object.prototype.toString.call(v).slice(8, -1) === type
  }
}

export const isArray = getType('Array')
export const isObject = getType('Object')

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function deepCopy(o: any): any {
  if (!isObject(o) && !isArray(o)) {
    return o
  }

  if (isObject(o)) {
    const tmp: { [index: string]: unknown } = {}
    Object.keys(o).map((k) => {
      tmp[k] = deepCopy(o[k])
    })

    return { ...tmp }
  }

  if (isArray(o)) {
    const tmp = o.map((v: any) => {
      return deepCopy(v)
    })
    return [...tmp]
  }
}

export function oneZeroToBool(v?: string | number | boolean): boolean {
  if (v === void 0) return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') v = Number(v)

  return v === 1
}
export function boolToOneZero(v?: string | number | boolean): string {
  if (v === void 0) return '0'
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)

  return v ? '1' : '0'
}
