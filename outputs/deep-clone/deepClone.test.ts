import { describe, it, expect } from 'vitest';
import { deepClone, type DeepClone } from './deepClone.js';

// =============================================================================
// Helper: verify that a cloned value is deeply equal but not reference-equal
// =============================================================================

/** Assert structural equality without shared references (for objects). */
function assertDeepClone<T>(original: T, cloned: T): void {
  expect(cloned).toEqual(original);
  // For non-primitive non-function values, the reference must differ
  if (
    original !== null &&
    original !== undefined &&
    typeof original === 'object'
  ) {
    expect(cloned).not.toBe(original);
  }
}

// =============================================================================
// 1. Primitives
// =============================================================================

describe('primitives', () => {
  it('clones a string', () => {
    const val = 'hello';
    const cloned = deepClone(val);
    expect(cloned).toBe('hello');
    expect(typeof cloned).toBe('string');
  });

  it('clones a number', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone(0)).toBe(0);
    expect(deepClone(-1)).toBe(-1);
    expect(deepClone(3.14)).toBe(3.14);
  });

  it('clones NaN', () => {
    expect(Number.isNaN(deepClone(NaN))).toBe(true);
  });

  it('clones Infinity and -Infinity', () => {
    expect(deepClone(Infinity)).toBe(Infinity);
    expect(deepClone(-Infinity)).toBe(-Infinity);
  });

  it('clones a boolean', () => {
    expect(deepClone(true)).toBe(true);
    expect(deepClone(false)).toBe(false);
  });

  it('clones null', () => {
    expect(deepClone(null)).toBeNull();
  });

  it('clones undefined', () => {
    expect(deepClone(undefined)).toBeUndefined();
  });

  it('clones a symbol', () => {
    const sym = Symbol('test');
    const cloned = deepClone(sym);
    expect(cloned).toBe(sym); // symbols are identity-based, returned as-is
  });

  it('clones a bigint', () => {
    const val = 123n;
    expect(deepClone(val)).toBe(123n);
  });
});

// =============================================================================
// 2. Function — returned as-is
// =============================================================================

describe('functions', () => {
  it('returns the same function reference', () => {
    function foo() {
      return 'bar';
    }
    const cloned = deepClone(foo);
    expect(cloned).toBe(foo);
    expect(cloned()).toBe('bar');
  });

  it('returns arrow functions as-is', () => {
    const arrow = () => 42;
    expect(deepClone(arrow)).toBe(arrow);
  });
});

// =============================================================================
// 3. Date
// =============================================================================

describe('Date', () => {
  it('clones a Date with the same time value', () => {
    const date = new Date('2025-06-15T12:00:00.000Z');
    const cloned = deepClone(date);
    expect(cloned).toBeInstanceOf(Date);
    expect(cloned.getTime()).toBe(date.getTime());
    expect(cloned).not.toBe(date);
  });

  it('mutating the clone does not affect the original', () => {
    const date = new Date('2025-01-01T00:00:00.000Z');
    const cloned = deepClone(date);
    cloned.setFullYear(2030);
    expect(cloned.getFullYear()).toBe(2030);
    expect(date.getFullYear()).toBe(2025);
  });

  it('clones the current date', () => {
    const now = new Date();
    const cloned = deepClone(now);
    expect(cloned.getTime()).toBe(now.getTime());
  });
});

// =============================================================================
// 4. RegExp
// =============================================================================

describe('RegExp', () => {
  it('clones a RegExp with the same pattern and flags', () => {
    const re = /hello\s+world/gi;
    const cloned = deepClone(re);
    expect(cloned).toBeInstanceOf(RegExp);
    expect(cloned.source).toBe(re.source);
    expect(cloned.flags).toBe(re.flags);
    expect(cloned).not.toBe(re);
  });

  it('clones flagless RegExp', () => {
    const re = /^test$/;
    const cloned = deepClone(re);
    expect(cloned.source).toBe('^test$');
    expect(cloned.flags).toBe('');
  });

  it('clones RegExp with all flags', () => {
    const re = /abc/gimsuy;
    const cloned = deepClone(re);
    expect(cloned.flags).toBe('gimsuy');
  });

  it('cloned RegExp behaves identically', () => {
    const re = /(\d{4})-(\d{2})/g;
    const cloned = deepClone(re);
    const testStr = '2025-06-15';
    // Both original and clone should match and produce the same result
    expect(cloned.test(testStr)).toBe(true);
    expect(re.test(testStr)).toBe(true);
    // Verify the matched groups are identical
    const match1 = '2025-06-15'.match(cloned);
    const match2 = '2025-06-15'.match(re);
    expect(match1).toEqual(match2);
  });
});

// =============================================================================
// 5. Array
// =============================================================================

describe('Array', () => {
  it('clones an empty array', () => {
    const arr: number[] = [];
    const cloned = deepClone(arr);
    expect(cloned).toEqual([]);
    expect(cloned).not.toBe(arr);
    expect(cloned.length).toBe(0);
  });

  it('clones an array of primitives', () => {
    const arr = [1, 'two', true, null, undefined];
    const cloned = deepClone(arr);
    expect(cloned).toEqual([1, 'two', true, null, undefined]);
    expect(cloned).not.toBe(arr);
  });

  it('clones nested arrays', () => {
    const arr = [1, [2, [3, [4]]]];
    const cloned = deepClone(arr);
    expect(cloned).toEqual([1, [2, [3, [4]]]]);
    // Verify no shared references at each level
    expect(cloned).not.toBe(arr);
    expect(cloned[1]).not.toBe(arr[1]);
    expect((cloned[1] as number[])[1]).not.toBe((arr[1] as number[])[1]);
  });

  it('preserves sparse arrays (holes)', () => {
    // eslint-disable-next-line no-sparse-arrays
    const sparse = [1, , 3]; // hole at index 1
    const cloned = deepClone(sparse);
    expect(cloned.length).toBe(3);
    expect(0 in cloned).toBe(true);
    expect(1 in cloned).toBe(false); // hole preserved
    expect(2 in cloned).toBe(true);
    expect(cloned[0]).toBe(1);
    expect(cloned[2]).toBe(3);
  });

  it('mutating the clone does not affect the original', () => {
    const arr: Record<string, number>[] = [{ a: 1 }, { b: 2 }];
    const cloned = deepClone(arr);
    cloned[0].a = 999;
    cloned.push({ c: 3 });
    expect(arr[0].a).toBe(1);
    expect(arr.length).toBe(2);
  });
});

// =============================================================================
// 6. Plain objects
// =============================================================================

describe('plain objects', () => {
  it('clones an empty object', () => {
    const obj = {};
    const cloned = deepClone(obj);
    expect(cloned).toEqual({});
    expect(cloned).not.toBe(obj);
  });

  it('clones a flat object', () => {
    const obj = { a: 1, b: 'hello', c: true };
    const cloned = deepClone(obj);
    expect(cloned).toEqual({ a: 1, b: 'hello', c: true });
    expect(cloned).not.toBe(obj);
  });

  it('clones deeply nested objects', () => {
    const obj = {
      level1: {
        level2: {
          level3: {
            value: 'deep',
          },
        },
      },
    };
    const cloned = deepClone(obj);
    expect(cloned).toEqual(obj);
    // All levels should have different references
    expect(cloned).not.toBe(obj);
    expect(cloned.level1).not.toBe(obj.level1);
    expect(cloned.level1.level2).not.toBe(obj.level1.level2);
    expect(cloned.level1.level2.level3).not.toBe(obj.level1.level2.level3);
  });

  it('mutating the clone does not affect the original', () => {
    const obj = { nested: { value: 10 } };
    const cloned = deepClone(obj);
    cloned.nested.value = 99;
    expect(obj.nested.value).toBe(10);
  });

  it('clones objects with symbol keys', () => {
    const sym = Symbol('hidden');
    const obj = {
      visible: 'yes',
      [sym]: 'secret',
    };
    const cloned = deepClone(obj);
    expect(cloned.visible).toBe('yes');
    expect((cloned as Record<symbol, string>)[sym]).toBe('secret');
    expect(cloned).not.toBe(obj);
  });

  it('clones Object.create(null) (null prototype)', () => {
    const obj = Object.create(null);
    obj.a = 1;
    obj.b = 'test';
    const cloned = deepClone(obj);
    expect(Object.getPrototypeOf(cloned)).toBeNull();
    expect(cloned.a).toBe(1);
    expect(cloned.b).toBe('test');
    expect(cloned).not.toBe(obj);
  });

  it('clones object with mixed value types', () => {
    const obj = {
      str: 'hello',
      num: 42,
      bool: false,
      nil: null,
      undef: undefined,
      date: new Date('2025-01-01'),
      re: /test/gi,
      arr: [1, 2, 3],
      map: new Map([['k', 'v']]),
      set: new Set([1, 2]),
    };
    const cloned = deepClone(obj);

    assertDeepClone(obj, cloned);
    expect(cloned.date).toBeInstanceOf(Date);
    expect(cloned.date.getTime()).toBe(obj.date.getTime());
    expect(cloned.re).toBeInstanceOf(RegExp);
    expect(cloned.re.source).toBe(obj.re.source);
    expect(cloned.map).toBeInstanceOf(Map);
    expect(cloned.map.get('k')).toBe('v');
    expect(cloned.set).toBeInstanceOf(Set);
    expect(cloned.set.has(1)).toBe(true);
  });
});

// =============================================================================
// 7. Map
// =============================================================================

describe('Map', () => {
  it('clones an empty Map', () => {
    const map = new Map();
    const cloned = deepClone(map);
    expect(cloned).toBeInstanceOf(Map);
    expect(cloned.size).toBe(0);
    expect(cloned).not.toBe(map);
  });

  it('clones a Map with primitive keys and values', () => {
    const map = new Map([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
    const cloned = deepClone(map);
    expect(cloned.size).toBe(3);
    expect(cloned.get('a')).toBe(1);
    expect(cloned.get('b')).toBe(2);
    expect(cloned.get('c')).toBe(3);
    expect(cloned).not.toBe(map);
  });

  it('clones a Map with object keys', () => {
    const keyObj = { id: 'key' };
    const valObj = { data: 'value' };
    const map = new Map([[keyObj, valObj]]);
    const cloned = deepClone(map);

    expect(cloned.size).toBe(1);
    // The cloned key object should be deeply equal but not the same reference
    const clonedKey = [...cloned.keys()][0];
    expect(clonedKey).toEqual(keyObj);
    expect(clonedKey).not.toBe(keyObj);
    // The cloned value should be deeply equal but not the same reference
    const clonedVal = cloned.get(clonedKey);
    expect(clonedVal).toEqual(valObj);
    expect(clonedVal).not.toBe(valObj);
  });

  it('mutating cloned Map does not affect original', () => {
    const map = new Map([['x', 10]]);
    const cloned = deepClone(map);
    cloned.set('x', 999);
    cloned.set('y', 888);
    expect(map.get('x')).toBe(10);
    expect(map.has('y')).toBe(false);
  });

  it('clones nested Maps', () => {
    const inner = new Map([['k', 'inner']]);
    const outer = new Map([['outer', inner]]);
    const cloned = deepClone(outer);

    const clonedInner = cloned.get('outer')!;
    expect(clonedInner).toBeInstanceOf(Map);
    expect(clonedInner).not.toBe(inner);
    expect(clonedInner.get('k')).toBe('inner');
  });
});

// =============================================================================
// 8. Set
// =============================================================================

describe('Set', () => {
  it('clones an empty Set', () => {
    const set = new Set();
    const cloned = deepClone(set);
    expect(cloned).toBeInstanceOf(Set);
    expect(cloned.size).toBe(0);
    expect(cloned).not.toBe(set);
  });

  it('clones a Set with primitive values', () => {
    const set = new Set([1, 2, 3, 'hello']);
    const cloned = deepClone(set);
    expect(cloned.size).toBe(4);
    expect(cloned.has(1)).toBe(true);
    expect(cloned.has(2)).toBe(true);
    expect(cloned.has(3)).toBe(true);
    expect(cloned.has('hello')).toBe(true);
    expect(cloned).not.toBe(set);
  });

  it('clones a Set with object values', () => {
    const obj = { name: 'item' };
    const set = new Set([obj]);
    const cloned = deepClone(set);

    const clonedItem = [...cloned][0];
    expect(clonedItem).toEqual(obj);
    expect(clonedItem).not.toBe(obj);
  });

  it('mutating cloned Set does not affect original', () => {
    const set = new Set([1, 2]);
    const cloned = deepClone(set);
    cloned.add(3);
    cloned.delete(1);
    expect(set.has(1)).toBe(true);
    expect(set.has(3)).toBe(false);
    expect(set.size).toBe(2);
  });

  it('clones nested Sets', () => {
    const inner = new Set(['a', 'b']);
    const outer = new Set([inner]);
    const cloned = deepClone(outer);

    // Get the cloned inner Set
    for (const item of cloned) {
      expect(item).toBeInstanceOf(Set);
      expect(item).not.toBe(inner);
      expect(item.has('a')).toBe(true);
      expect(item.has('b')).toBe(true);
    }
  });
});

// =============================================================================
// 9. Circular references
// =============================================================================

describe('circular references', () => {
  it('handles self-referencing objects', () => {
    const obj: Record<string, unknown> = { name: 'root' };
    obj.self = obj;

    const cloned = deepClone(obj);
    expect(cloned.name).toBe('root');
    expect(cloned.self).toBe(cloned); // self-reference points to clone
    expect(cloned.self).not.toBe(obj); // not the original
  });

  it('handles mutual circular references', () => {
    interface Node {
      label: string;
      b?: Node;
      a?: Node;
    }
    const a: Node = { label: 'A' };
    const b: Node = { label: 'B' };
    a.b = b;
    b.a = a;

    const clonedA = deepClone(a);

    expect(clonedA.label).toBe('A');
    expect(clonedA.b!.label).toBe('B');
    expect(clonedA.b!.a).toBe(clonedA);
    expect(clonedA.b!.a!.b).toBe(clonedA.b);
  });

  it('handles circular references in arrays', () => {
    const arr: unknown[] = [1, 2];
    arr.push(arr); // self-reference

    const cloned = deepClone(arr);
    expect(cloned[0]).toBe(1);
    expect(cloned[1]).toBe(2);
    expect(cloned[2]).toBe(cloned);
  });

  it('handles circular references in Maps', () => {
    const map = new Map();
    map.set('self', map);

    const cloned = deepClone(map);
    expect(cloned.get('self')).toBe(cloned);
  });

  it('handles circular references in Sets', () => {
    const obj: Record<string, unknown> = { name: 'item' };
    obj.ref = obj;

    const set = new Set([obj]);
    const cloned = deepClone(set);

    const clonedObj = [...cloned][0] as Record<string, unknown>;
    expect(clonedObj.name).toBe('item');
    expect(clonedObj.ref).toBe(clonedObj);
  });

  it('handles deeply nested circular structures', () => {
    interface Node {
      value: number;
      children: Node[];
      parent?: Node;
    }

    const root: Node = { value: 1, children: [] };
    const child: Node = { value: 2, children: [], parent: root };
    root.children.push(child);

    const cloned = deepClone(root);
    expect(cloned.value).toBe(1);
    expect(cloned.children[0].value).toBe(2);
    expect(cloned.children[0].parent).toBe(cloned);
  });
});

// =============================================================================
// 10. Mutation isolation
// =============================================================================

describe('mutation isolation', () => {
  it('original is completely untouched when clone is deeply mutated', () => {
    const original = {
      arr: [{ x: 1 }, { x: 2 }],
      map: new Map([['key', { y: 10 }]]),
      set: new Set(['a', 'b']),
      obj: { nested: { value: 42 } },
      date: new Date('2025-06-15'),
      re: /original/i,
    };

    const cloned = deepClone(original);

    // Mutate clone extensively
    cloned.arr[0].x = 999;
    cloned.arr.push({ x: 3 });
    cloned.map.set('key', { y: 777 });
    cloned.map.set('newKey', { y: 888 });
    cloned.set.delete('a');
    cloned.set.add('c');
    cloned.obj.nested.value = 0;
    cloned.date.setFullYear(2035);
    // Note: RegExp is cloned by value, so source/flags are immutable anyway

    // Verify original is intact
    expect(original.arr[0].x).toBe(1);
    expect(original.arr.length).toBe(2);
    expect(original.map.get('key')).toEqual({ y: 10 });
    expect(original.map.has('newKey')).toBe(false);
    expect(original.set.has('a')).toBe(true);
    expect(original.set.has('c')).toBe(false);
    expect(original.obj.nested.value).toBe(42);
    expect(original.date.getFullYear()).toBe(2025);
  });
});

// =============================================================================
// 11. Edge cases & mixed structures
// =============================================================================

describe('edge cases', () => {
  it('clones an object with a key named "length" (not confused with array)', () => {
    const obj = { length: 5, name: 'fake array' };
    const cloned = deepClone(obj);
    expect(cloned.length).toBe(5);
    expect(cloned.name).toBe('fake array');
    expect(Array.isArray(cloned)).toBe(false);
  });

  it('clones an empty string', () => {
    expect(deepClone('')).toBe('');
  });

  it('clones the number 0', () => {
    expect(deepClone(0)).toBe(0);
  });

  it('clones boolean false', () => {
    expect(deepClone(false)).toBe(false);
  });

  it('clones a very deeply nested structure', () => {
    // Build a deeply nested object
    let current: Record<string, unknown> = { value: 'bottom' };
    for (let i = 0; i < 1000; i++) {
      current = { next: current, index: i };
    }
    const cloned = deepClone(current);
    expect(cloned.index).toBe(999);
    expect(cloned).toEqual(current);
  });

  it('clones an array-like object without confusing it with an array', () => {
    const arrayLike = { 0: 'a', 1: 'b', length: 2 };
    const cloned = deepClone(arrayLike);
    expect(cloned).toEqual({ 0: 'a', 1: 'b', length: 2 });
    expect(Array.isArray(cloned)).toBe(false);
  });

  it('clones objects containing both Map and Set', () => {
    const data = {
      map: new Map([['nestedSet', new Set([1, 2, 3])]]),
      set: new Set([new Map([['deepKey', 'deepValue']])]),
    };
    const cloned = deepClone(data);

    const clonedNestedSet = cloned.map.get('nestedSet');
    expect(clonedNestedSet).toBeInstanceOf(Set);
    expect(clonedNestedSet!.size).toBe(3);

    const clonedNestedMap = [...cloned.set][0];
    expect(clonedNestedMap).toBeInstanceOf(Map);
    expect(clonedNestedMap.get('deepKey')).toBe('deepValue');
  });
});

// =============================================================================
// 12. Type-level tests (compile-time)
// =============================================================================

describe('type inference (compile-time checks)', () => {
  it('infers correct types for primitives', () => {
    const s: string = deepClone('hello');
    const n: number = deepClone(42);
    const b: boolean = deepClone(true);
    const u: undefined = deepClone(undefined);
    const nl: null = deepClone(null);
    const sym: symbol = deepClone(Symbol('test'));
    const bi: bigint = deepClone(123n);

    // These assertions exist purely to use the variables and satisfy linting
    expect(typeof s).toBe('string');
    expect(typeof n).toBe('number');
    expect(typeof b).toBe('boolean');
    expect(u).toBeUndefined();
    expect(nl).toBeNull();
    expect(typeof sym).toBe('symbol');
    expect(typeof bi).toBe('bigint');
  });

  it('infers Date and RegExp types', () => {
    const d: Date = deepClone(new Date());
    const r: RegExp = deepClone(/test/);
    expect(d).toBeInstanceOf(Date);
    expect(r).toBeInstanceOf(RegExp);
  });

  it('infers Map and Set types', () => {
    const m: Map<string, number> = deepClone(new Map([['a', 1]]));
    const s: Set<boolean> = deepClone(new Set([true, false]));
    expect(m.get('a')).toBe(1);
    expect(s.has(true)).toBe(true);
  });

  it('infers array types', () => {
    const arr: number[] = deepClone([1, 2, 3]);
    const nested: { x: number }[] = deepClone([{ x: 1 }]);
    expect(arr.length).toBe(3);
    expect(nested[0].x).toBe(1);
  });

  it('infers object types', () => {
    interface User {
      name: string;
      age: number;
    }
    const user: User = { name: 'Alice', age: 30 };
    const cloned: User = deepClone(user);
    expect(cloned.name).toBe('Alice');
    expect(cloned.age).toBe(30);
  });

  it('infers complex nested types', () => {
    interface Complex {
      id: number;
      tags: string[];
      metadata: Map<string, { created: Date; flags: RegExp }>;
      items: Set<{ value: number }>;
    }

    const c: Complex = {
      id: 1,
      tags: ['a'],
      metadata: new Map([['k', { created: new Date(), flags: /test/ }]]),
      items: new Set([{ value: 42 }]),
    };

    const cloned: Complex = deepClone(c);

    // Type narrowing through usage
    expect(cloned.id).toBe(1);
    expect(cloned.tags[0]).toBe('a');
    expect(cloned.metadata.get('k')!.created).toBeInstanceOf(Date);
    expect(cloned.metadata.get('k')!.flags).toBeInstanceOf(RegExp);
    for (const item of cloned.items) {
      expect(item.value).toBe(42);
    }
  });
});

// =============================================================================
// 13. Identity checks (edge-case verification)
// =============================================================================

describe('identity and structural equality', () => {
  it('primitives are returned as the same value', () => {
    const sym = Symbol('id');
    expect(deepClone(sym)).toBe(sym);
    expect(deepClone(42)).toBe(42);
    expect(deepClone('test')).toBe('test');
  });

  it('objects are structurally equal but not reference equal', () => {
    const obj = { a: 1, b: [2, 3] };
    const cloned = deepClone(obj);
    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
    expect(cloned.b).not.toBe(obj.b);
  });

  it('deep equality holds for complex structures', () => {
    const mapKey = { keyId: 'k' };
    const complex = {
      date: new Date('2025-01-01T00:00:00.000Z'),
      re: /^hello$/gim,
      map: new Map([[mapKey, { nested: [1, 2, { deep: true }] }]]),
      set: new Set([new Map([['a', 1]])]),
      arr: [1, { x: 2 }, [3, [4]]],
    };

    const cloned = deepClone(complex);

    // ToEqual uses deep equality internally
    expect(cloned).toEqual(complex);

    // Explicit structural checks
    expect(cloned.date.getTime()).toBe(complex.date.getTime());
    expect(cloned.re.source).toBe(complex.re.source);
    expect(cloned.re.flags).toBe(complex.re.flags);

    // Map key is an object — cloned key should be deeply equal but not the
    // same reference
    const origMapKey = [...complex.map.keys()][0];
    const clonedMapKey = [...cloned.map.keys()][0];
    expect(clonedMapKey).toEqual(origMapKey);
    expect(clonedMapKey).not.toBe(origMapKey);

    const origMapVal = complex.map.get(origMapKey);
    const clonedMapVal = cloned.map.get(clonedMapKey);
    expect(clonedMapVal).toEqual(origMapVal);
    expect(cloned.arr).toEqual(complex.arr);
  });
});
