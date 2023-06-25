import Big from "big.js";

type MethodKey = 'add' | 'multiple' | 'divide' | 'subtract'

type LinkMehtodKey = MethodKey extends `${infer S}` ? `_${S}` : never

type CalcValue = number | null

interface MethodFn<isLink extends boolean = false> {
  (a?: CalcValue, b?: CalcValue): isLink extends true ? LinkProxy : CalcValue;
}

interface CalcOption {
  fixed: number;
  isLinkCall?: boolean;
  preResult?: CalcValue
}


type CalcProxy = CalcOption & Record<MethodKey, MethodFn> & {
  setTempFixed: (v: number) => CalcProxy;
} & Record<LinkMehtodKey, MethodFn<true>>

type LinkProxy = Omit<CalcProxy, LinkMehtodKey | MethodKey> & Record<LinkMehtodKey, MethodFn<false>> & Record<MethodKey, MethodFn<true>> 


export const isCalcNumber = (value: unknown): value is number => 
  typeof value === 'number' && !Number.isNaN(value)

export const getCalcMethod = (options: CalcOption = { fixed: 3 }) => {
  let isLinkCall = options.isLinkCall ?? false
  let preResult: null | number = options.preResult ?? null
  const _options = { ...options }
  const createLinkMethod = (prop: string) => {
    const methodKey = prop.replace(/_(.+)/, (x, y) => y) as MethodKey
    isLinkCall = !isLinkCall
    return function(...args: CalcValue[]){
      console.log("🚀calc in link method ==> ", {args})
      let [a, b] = args
      if(b === undefined){
        b = a
        a = preResult
      }
      const result = proxy[methodKey].call(null, a, b)
      if(isLinkCall){
        const newOptions = {
          ..._options,
          preResult: result,
          isLinkCall: isLinkCall,
        }
        isLinkCall = !isLinkCall
        return getCalcMethod(newOptions) as unknown as LinkProxy
      }
      preResult = null
      tempFixed = null
      return result
    }
  }
  const handler: ProxyHandler<CalcProxy> = {
    set(obj, prop, value){
      if(prop in _options){
        return Reflect.set(obj, prop, value)
      }
      return false
    },
    get(obj, prop, value){
      console.log("🚀prop ==> ", prop)
      if(typeof prop === 'string' && prop.startsWith('_')){
        const c = createLinkMethod(prop)
        console.log("🚀c ==> ", c)
        return c
      }
      return Reflect.get(obj, prop, value)
    },
  }

  const calcMethod: Record<MethodKey, MethodFn> = {
    add: (a, b) => {
      if(isCalcNumber(a) || isCalcNumber(b)){
        return getResult(Big(a || 0).add(b || 0))
      }
      return null
    },
    multiple: (a, b) => {
      if(isCalcNumber(a) || isCalcNumber(b)){
        return getResult(Big(a || 0).mul(b || 0))
      }
      return null
    },
    divide: (a, b) => {
      if(a === 0 && b === 0) return null
      if(a === 0) return 0
      if(isCalcNumber(b) && b !== 0){
        return getResult(Big(a || 0).div(b))
      }
      return null
    },
    subtract: (a, b) => {
      if(isCalcNumber(a) || isCalcNumber(b)){
        return getResult(Big(a || 0).sub(b || 0))
      }
      return null
    },
  }
  let tempFixed: CalcValue = null
  const proxy = new Proxy<CalcProxy>({
    setTempFixed: (v: CalcValue) => {
      tempFixed = v
      return proxy
    },
    ...calcMethod,
    ..._options,
  } as any, handler)
  const getResult = (v: Big) => {
    let result = v.toNumber()
    if(tempFixed || proxy.fixed){
      result = +v.toFixed(tempFixed || proxy.fixed)
    }
    if(!isLinkCall){
      tempFixed = null
    }
    return result
  }
  return proxy as CalcProxy
}

export const calcMethod = getCalcMethod()