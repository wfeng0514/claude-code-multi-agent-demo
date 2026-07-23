/**
 * deepClone — 递归深拷贝一个值，生成深度相等但完全独立的副本。
 *
 * 支持的类型：
 *   - 原始值（string, number, boolean, symbol, bigint, null, undefined）
 *   - Function（原样返回，不做拷贝）
 *   - Date
 *   - RegExp
 *   - Map（键和值均递归拷贝）
 *   - Set（元素递归拷贝）
 *   - Array（包括稀疏数组 — 空洞会被保留）
 *   - 普通对象和 null 原型对象
 *
 * 循环引用通过内部 WeakMap 缓存处理。
 * 对象上的 Symbol 键也会被拷贝。
 */

// ---------------------------------------------------------------------------
// 类型级深拷贝
// ---------------------------------------------------------------------------

/**
 * 条件类型，将源类型 `T` 映射为深拷贝后的对应类型。
 *
 * - 原始值、null、undefined、Function 原样返回 `T`
 * - Date 和 RegExp 会重新构造，因此丢失子类身份，类型上变为 `Date` / `RegExp`
 * - Map 和 Set 递归处理其键/值/元素类型
 * - 数组递归处理元素类型
 * - 其他对象逐属性映射（homomorphic mapped type），保留 optional 和 readonly 修饰符
 */
export type DeepClone<T> =
  T extends string | number | boolean | symbol | bigint | null | undefined | Function
    ? T
    : T extends Date
      ? Date
      : T extends RegExp
        ? RegExp
        : T extends Map<infer K, infer V>
          ? Map<DeepClone<K>, DeepClone<V>>
          : T extends Set<infer V>
            ? Set<DeepClone<V>>
            : T extends Array<infer V>
              ? Array<DeepClone<V>>
              : T extends object
                ? { [K in keyof T]: DeepClone<T[K]> }
                : T;

// ---------------------------------------------------------------------------
// 实现辅助函数
// ---------------------------------------------------------------------------

/**
 * 当 `value` 是原始值（含 null、undefined）或函数时返回 `true`，
 * 这些值应该直接返回而不需要拷贝。
 */
function isPrimitiveOrFunction(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  const t = typeof value;
  return t !== 'object' && t !== 'function'
    ? true   // string | number | boolean | symbol | bigint
    : t === 'function';
}

// ---------------------------------------------------------------------------
// 内部递归拷贝
// ---------------------------------------------------------------------------

function cloneImpl(value: unknown, cache: WeakMap<object, unknown>): unknown {
  // 1. 原始值、null、undefined、函数 — 直接返回
  if (isPrimitiveOrFunction(value)) {
    return value;
  }

  // 到此处 `value` 一定是对象（含数组等）
  const obj = value as object;

  // 2. 循环引用检测
  if (cache.has(obj)) {
    return cache.get(obj);
  }

  // 3. Date
  if (value instanceof Date) {
    const cloned = new Date(value.getTime());
    cache.set(obj, cloned);
    return cloned;
  }

  // 4. RegExp
  if (value instanceof RegExp) {
    const cloned = new RegExp(value.source, value.flags);
    cache.set(obj, cloned);
    return cloned;
  }

  // 5. Map — 递归拷贝键和值
  if (value instanceof Map) {
    const cloned = new Map();
    cache.set(obj, cloned);
    for (const [k, v] of value) {
      cloned.set(cloneImpl(k, cache), cloneImpl(v, cache));
    }
    return cloned;
  }

  // 6. Set — 递归拷贝元素
  if (value instanceof Set) {
    const cloned = new Set();
    cache.set(obj, cloned);
    for (const item of value) {
      cloned.add(cloneImpl(item, cache));
    }
    return cloned;
  }

  // 7. Array — 保留空洞（稀疏数组）
  if (Array.isArray(value)) {
    const cloned: unknown[] = [];
    cache.set(obj, cloned);
    for (let i = 0; i < value.length; i++) {
      if (i in value) {
        cloned[i] = cloneImpl(value[i], cache);
      }
      // 否则保留空槽位（hole）
    }
    return cloned;
  }

  // 8. 普通对象（含 Object.create(null)）
  // 沿用源对象的原型，确保 null 原型对象保持 null 原型
  const proto = Object.getPrototypeOf(value);
  const cloned: Record<PropertyKey, unknown> = Object.create(proto as object | null);
  cache.set(obj, cloned);

  for (const key of Reflect.ownKeys(obj)) {
    cloned[key] = cloneImpl((value as Record<PropertyKey, unknown>)[key], cache);
  }

  return cloned;
}

// ---------------------------------------------------------------------------
// 公开 API
// ---------------------------------------------------------------------------

/**
 * 创建 `value` 的深拷贝。
 *
 * 返回值与输入深度相等，但不共享任何引用（函数除外，函数原样返回）。
 *
 * @typeParam T — 要拷贝的值的类型，返回类型通过 {@link DeepClone} 条件类型推导
 * @param value  要深拷贝的值
 * @returns      与输入深度相等、完全独立的副本
 *
 * @example
 * ```ts
 * const obj = { a: 1, b: { c: [2, 3] } };
 * const cloned = deepClone(obj);
 * // cloned !== obj  且  cloned.b !== obj.b  — 无任何共享引用
 * ```
 */
export function deepClone<T>(value: T): DeepClone<T> {
  const cache = new WeakMap<object, unknown>();
  return cloneImpl(value, cache) as DeepClone<T>;
}
