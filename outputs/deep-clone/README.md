# deepClone

A type-safe deep cloning utility for JavaScript and TypeScript. Recursively copies values of any shape -- primitives, objects, arrays, `Date`, `RegExp`, `Map`, `Set` -- producing a deeply-equal but fully independent clone. Handles circular references, sparse arrays, Symbol-keyed properties, and null-prototype objects out of the box.

## Quick Start

```ts
import { deepClone } from './deepClone.js';

const original = {
  name: 'Alice',
  tags: ['admin', 'editor'],
  meta: new Map([['created', new Date('2025-01-01')]]),
  prefs: new Set(['dark-mode']),
  pattern: /^hello\s+world/gi,
};

const cloned = deepClone(original);

// cloned !== original -- no shared references
// cloned.meta !== original.meta
// cloned.meta.get('created') !== original.meta.get('created')

// The clone is fully independent:
cloned.tags.push('viewer');
cloned.meta.set('updated', new Date());
console.log(original.tags);       // ['admin', 'editor']
console.log(original.meta.size);  // 1
```

## Installation

Copy `deepClone.ts` into your project. The function has zero dependencies and works in any environment that supports ES modules (Node.js, Deno, Bun, modern browsers).

```ts
import { deepClone } from './deepClone.js';
```

## API

### `deepClone<T>(value: T): DeepClone<T>`

Creates a deep clone of `value`. The returned value is deeply equal to the input but shares no references with it (except for functions, which are returned as-is).

| Parameter | Type | Description |
|---|---|---|
| `value` | `T` | The value to deep-clone. |

**Returns** `DeepClone<T>` -- a recursively cloned copy whose type is inferred from the input via the `DeepClone` conditional type.

#### Basic Example

```ts
const obj = { a: 1, b: { c: [2, 3] } };
const cloned = deepClone(obj);

cloned.b.c[0] = 99;
console.log(obj.b.c[0]); // 2 -- original is untouched
```

## Supported Types

| Type | Behavior |
|---|---|
| `string`, `number`, `boolean`, `symbol`, `bigint` | Returned as-is (value semantics). |
| `null`, `undefined` | Returned as-is. |
| `Function` | Returned as-is (functions are not cloned -- reference is shared). |
| `Date` | New `Date` instance with the same timestamp. |
| `RegExp` | New `RegExp` instance with the same `source` and `flags`. |
| `Map` | New `Map`; keys and values are recursively cloned. |
| `Set` | New `Set`; entries are recursively cloned. |
| `Array` | New array; elements are recursively cloned. Holes in sparse arrays are preserved. |
| Plain object | New object with the same prototype (including `Object.create(null)`). All own keys (string and Symbol) are recursively cloned. |

## Feature Highlights

### Circular Reference Handling

Uses an internal `WeakMap` cache to detect cycles. When a back-reference is encountered, the clone points to the already-created copy rather than recursing infinitely.

```ts
const obj = { name: 'root' };
obj.self = obj;

const cloned = deepClone(obj);
console.log(cloned.self === cloned); // true
console.log(cloned.self === obj);    // false
```

Mutual references (A -> B -> A), self-referencing arrays, Maps that contain themselves, and deeply nested parent-child cycles are all handled correctly.

### Sparse Array Preservation

Array holes ("empty slots") are carried over to the clone. The cloned array has the same `length` and the same set of defined indices.

```ts
const sparse = [1, , 3]; // hole at index 1
const cloned = deepClone(sparse);

console.log(cloned.length);    // 3
console.log(0 in cloned);      // true
console.log(1 in cloned);      // false -- hole preserved
console.log(2 in cloned);      // true
```

### Symbol-Keyed Properties

Object properties keyed by `Symbol` are cloned, not ignored.

```ts
const sym = Symbol('hidden');
const obj = { visible: 'yes', [sym]: 'secret' };

const cloned = deepClone(obj);
console.log(cloned[sym]); // 'secret'
```

### Null-Prototype Objects

Objects created via `Object.create(null)` retain their null prototype in the clone.

```ts
const obj = Object.create(null);
obj.a = 1;
obj.b = 'test';

const cloned = deepClone(obj);
console.log(Object.getPrototypeOf(cloned)); // null
console.log(cloned.a); // 1
```

### Mutation Isolation

Mutating the clone -- at any depth, on any supported type -- never affects the original. This is verified across deeply nested objects, arrays, Maps, Sets, Dates, and mixed structures.

## Type Safety

The return type is inferred via the `DeepClone<T>` conditional type, which maps each input category to its cloned counterpart:

```
DeepClone<number>            ->  number
DeepClone<Date>              ->  Date
DeepClone<Map<K, V>>         ->  Map<DeepClone<K>, DeepClone<V>>
DeepClone<Set<V>>            ->  Set<DeepClone<V>>
DeepClone<Array<V>>          ->  Array<DeepClone<V>>
DeepClone<{ a: string }>     ->  { a: string }
DeepClone<string | Date>     ->  string | Date
```

This means you get accurate return types at compile time without manual type assertions:

```ts
const m: Map<string, Date> = deepClone(new Map([['k', new Date()]]));
//    ^ inferred as Map<string, Date>

interface User { name: string; age: number }
const u: User = deepClone({ name: 'Bob', age: 40 });
//    ^ inferred as User
```

**Limitation**: Date and RegExp subclasses are typed as `Date` / `RegExp`, losing any custom subclass identity. Functions and primitives (`symbol`, `bigint`, etc.) are returned as the same type `T`.

## Comparison with Built-in Alternatives

| Feature | `deepClone` | `structuredClone` | `JSON.parse(JSON.stringify())` |
|---|---|---|---|
| Primitives | Yes | Yes | Yes (except `undefined`, `NaN`, `Infinity`) |
| `Date` | Yes (new instance) | Yes | No (serialized as string) |
| `RegExp` | Yes (new instance) | No (throws `DataCloneError`) | No (serialized as `{}`) |
| `Map` | Yes | Yes | No |
| `Set` | Yes | Yes | No |
| `Function` | Returned as-is (shared) | No (throws `DataCloneError`) | No (silently dropped) |
| Circular references | Yes | Yes | No (throws) |
| Sparse arrays | Yes (holes preserved) | Yes | No (holes become `null`) |
| Symbol keys | Yes | No (ignored) | No (ignored) |
| Null-prototype objects | Yes (prototype preserved) | No (prototype becomes `Object.prototype`) | No |
| `undefined` values | Yes | Yes | No (silently dropped) |
| `BigInt` | Yes | No (throws `DataCloneError`) | No (throws) |
| `Symbol` | Yes (returned as-is) | No (throws `DataCloneError`) | No (ignored) |
| Transferable objects | No | Yes | No |
| Browser support | Any ES module env | Chrome 98+, Firefox 94+, Safari 15.4+, Node 17+ | Universal |

### When to Use `deepClone`

- You need to clone `RegExp`, `Symbol` keys, or null-prototype objects.
- You are targeting a runtime that does not yet support `structuredClone`.
- You want the source object to remain fully intact (no transfer semantics).
- You need `BigInt` or `Symbol` as top-level values.

### When to Use `structuredClone`

- You need to clone built-in types not supported here (e.g., `ArrayBuffer`, `Blob`, `ImageBitmap`).
- You need transfer semantics for large binary data.
- You are in a modern runtime and only clone the structured-clone-algorithm subset.

---

## 文档信息

- **字数**: ~1,200 字
- **目标读者**: TypeScript/JavaScript 开发者，需要类型安全的深拷贝工具函数的中级到高级工程师。
