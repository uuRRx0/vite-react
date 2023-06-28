/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Big from 'big.js';

type CalcValue = number | null;

export const isCalcNumber = (value: unknown): value is number =>
  typeof value === 'number' && !Number.isNaN(value);

/**
 * 创建一个可链式调用的 Proxy，
 * 支持以 '_ + 同名方法' 开始链式调用，并存储方法其结果，
 * 中间可多次调用其他方法，且方法的第一个参数始终为上次链式调用的计算值，
 * 直到再次被 '_ + 同名方法' 结束链式调用，则返回最终方法的返回值
 * @param methods
 * @returns
 */
const createChainMethods = <T extends Record<string, (...args: any[]) => any>>(methods: T) => {
  type MethodKey = keyof T & string;

  const status = {
    isLink: false,
    result: null as ReturnType<T[MethodKey]>,
    isFreeze: false,
  };

  type Status = typeof status;

  type GetLinkMethod<K extends MethodKey, IsLink extends boolean = false> = (
    ...args: Parameters<T[K]> extends [any, ...infer Rest] ? Rest : Parameters<T[K]>
  ) => IsLink extends true ? LinkProxy<ReturnType<T[K]>> : ReturnType<T[K]>;

  type LinkProxy<FirstArg> = {
    [K in MethodKey as T[K] extends (a: FirstArg, ...args: any[]) => any
      ? K
      : never]: GetLinkMethod<K, true>;
  } & {
    [K in MethodKey as T[K] extends (a: FirstArg, ...args: any[]) => any
      ? `_${K}`
      : never]: GetLinkMethod<K>;
  };

  type MethodPlus = {
    [K in MethodKey as K extends `${infer S}` ? `_${S}` : never]: (
      ...args: Parameters<T[K]>
    ) => LinkProxy<ReturnType<T[K]>>;
  };

  type Base = {
    isRoot?: boolean;
    copy: any;
    status: Status;
  };

  type Methods = T & MethodPlus & Pick<Base, 'status'>;
  type FullProxy = Methods & Base & ThisType<Base>;

  const getMethods = function (): T & MethodPlus {
    return Object.entries(methods).reduce((acc, [key, fn]) => {
      acc[`_${key}`] = function (...args: unknown[]) {
        const { status } = this;
        const isLink = !status.isLink;
        // 首次调用时是没有上一个结果的
        const result = status.isLink ? fn(status.result, ...args) : fn(...args);
        if (isLink) {
          return this.copy({ status: { isLink, result } });
        } else {
          status.result = null;
          status.isLink = isLink;
          // 链式调用结束后，不再支持二次调用子 Proxy
          status.isFreeze = true;
        }
        return result;
      };
      acc[key] = function (...args: unknown[]) {
        const { status } = this;
        const isLink = status.isLink;
        let result;
        if (isLink) {
          result = fn(status.result, ...args);
          return this.copy({ status: { isLink, result } });
        } else {
          result = fn(...args);
        }
        return result;
      };
      return acc;
    }, {} as any);
  };

  const mergeCreate = (o: object | null, mergeObj: object) =>
    Object.assign(Object.create(o), mergeObj);

  const createProxy = <P extends FullProxy>(target?: P) => {
    target ??= mergeCreate(
      {
        isRoot: true,
        copy(extra?: P) {
          const { isRoot, status, ...rest } = this;
          if (!isRoot) {
            // 不是根 Proxy，则只变更 result 并返回 this
            status.result = extra?.status.result ?? status.result;
            return this;
          }
          return createProxy(
            mergeCreate(
              { copy: this.copy },
              {
                status: { ...status },
                ...rest,
                ...extra,
              },
            ),
          );
        },
      } as any,
      { ...getMethods(), status },
    );

    return new Proxy<Methods>(target!, {
      set(target, p, newValue, receiver) {
        return Reflect.set(target, p, newValue, receiver);
      },
      get(target, p, receiver) {
        if (target?.status?.isFreeze) {
          // 为了程序的逻辑语义明确
          // 禁止重复使用被链式调用结束后的子 Proxy
          throw new Error('Proxy is Freeze, please do not reuse the Proxy that has been chained');
        }
        const result = Reflect.get(target, p, receiver);
        // 绑定this，用于解构后直接使用（链式调用中的方法则不用）
        return typeof result === 'function' && target.isRoot ? result.bind(target) : result;
      },
    });
  };
  return createProxy();
};

const methods = {
  add: (a: CalcValue, b: CalcValue) => {
    if (isCalcNumber(a) || isCalcNumber(b)) {
      return Big(a || 0)
        .add(b || 0)
        .toNumber();
    }
    return null;
  },
  multiple: (a: string, b: CalcValue) => {
    if (isCalcNumber(a) || isCalcNumber(b)) {
      return Big(a || 0)
        .mul(b || 0)
        .toNumber();
    }
    return null;
  },
  divide: (a: CalcValue, b: CalcValue) => {
    if (a === 0 && b === 0) return null;
    if (a === 0) return 0;
    if (isCalcNumber(b) && b !== 0) {
      return Big(a || 0)
        .div(b)
        .toNumber();
    }
    return null;
  },
  subtract: (a: CalcValue, b: CalcValue) => {
    if (isCalcNumber(a) || isCalcNumber(b)) {
      return Big(a || 0)
        .sub(b || 0)
        .toNumber();
    }
    return null;
  },
};

export const zCalc = createChainMethods(methods);

export const { _add, _divide, _multiple, _subtract, add, divide, subtract, multiple } = zCalc;
