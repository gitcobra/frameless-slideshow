// tweak the incomplete lib.scriptHost.d.ts for MSIE
/// <reference path="./1.5.0a/lib.scriptHost.d.ts" />

declare class Enumerator<T> {
  constructor(collection?: any);
  atEnd(): boolean
  item(): T | undefined
  moveFirst(): void
  moveNext(): void
}

declare function GetObject(param: string): any;
