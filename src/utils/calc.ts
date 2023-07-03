/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Big from 'big.js';
import { createChainMethods } from './createChainMethods';
import { addition, division, multiply, subtraction } from 'accurate';

type CalcValue = number | null | string;

export const isNumber = (value: any): value is number =>
  typeof value === 'number' && !Number.isNaN(value);

export const isCalcNumber = (value: any): value is number | string =>
  !isNaN(value) && !Number.isNaN(value);

export const toNumber = (value: any, fb: any = null): number =>
  !isNaN(value) ? Number(value) : fb;

export const toCalcNumber = (value: any) => toNumber(value, 0);

const others = {
  fixed: 8 as CalcValue,
  tempFixed: null as CalcValue,
  setFixed(num: number, once = true) {
    if (once) {
      this.tempFixed = num;
    } else {
      this.fixed = num;
    }
    return this;
  },
  format(v: CalcValue, dp?: CalcValue) {
    dp ??= this.tempFixed ?? this.fixed;
    if (isNumber(dp) && isCalcNumber(v)) {
      this.tempFixed = null;
      // dp 为 null 时，则传入 undefined 相当于返回原值
      return Number(Big(v).toFixed(dp ?? undefined));
    }
    return v;
  },
};

const methods = {
  add(a: CalcValue, b: CalcValue): CalcValue {
    if (isCalcNumber(a) || isCalcNumber(b)) {
      return addition(toCalcNumber(a), toCalcNumber(b));
    }
    return null;
  },
  multiple(a: CalcValue, b: CalcValue): CalcValue {
    if (isCalcNumber(a) || isCalcNumber(b)) {
      return multiply(toCalcNumber(a), toCalcNumber(b));
    }
    return null;
  },
  divide: (a: CalcValue, b: CalcValue): CalcValue => {
    if (a === 0 && b === 0) return null;
    if (a === 0) return 0;
    if (isCalcNumber(b) && b !== 0) {
      return division(toCalcNumber(a), b);
    }
    return null;
  },
  subtract: (a: CalcValue, b: CalcValue): CalcValue => {
    if (isCalcNumber(a) || isCalcNumber(b)) {
      return subtraction(toCalcNumber(a), toCalcNumber(b));
    }
    return null;
  },
};

interface calcMethod<T = any> {
  (...args: Array<T | T[]>): number;
}

const infiniteMethods = (
  Object.entries(methods) as Array<[keyof typeof methods, calcMethod]>
).reduce((result, [key, fn]) => {
  result[key] = function (...args) {
    const arr = args.flat(2);
    // reduce 初始值为 null，以处理 arr 长度为 0 时问题
    return arr.reduce((a, b, index) => {
      if (index === 0) return b;
      return fn(a, b);
    }, null);
  };
  return result;
}, {} as Record<keyof typeof methods, calcMethod>);

export const zCalc = createChainMethods(infiniteMethods, others);

export const { _add, _divide, _multiple, _subtract, add, divide, subtract, multiple, setFixed } =
  zCalc;
