/*
  manage image lists
*/

import { ImagePathList } from "./data-types";

export class ImgList {
  private _index = 0;
  private _baselist: string[];
  private _list: string[];
  private _random = false;
  private _allowDup = false;

  constructor(list?: string | string[], {allowDup = false, random = false} = {}) {
    this._allowDup = allowDup;
    this._random = random;
    this._baselist = list instanceof Array ? list.concat() : typeof list === 'string' ? [list] : [];
    if( !this._allowDup )
      removeDup(this._baselist);
    
    this._list = this._baselist.concat();
    if( this._random )
      shuffleList(this._baselist);
  }
  
  get(index?: number, offsetFlag=false) {
    if( typeof index === 'undefined' )
      index = this._index;
    return this._list[!offsetFlag? index: this._index + index];
  }
  jump(index: number = 0) {
    if( index > this._list.length - 1 || !(index >= 0) )
      index = 0;
    this._index = index;
    return this._list[index];
  }
  getIndex() {
    return this._index;
  }
  getLength() {
    return this._list.length;
  }
  next(notChangeIndex = false) {
    let i = this._index + 1;
    if( i >= this._list.length )
      i = 0;
    if( !notChangeIndex )
      this._index = i;
    return this._list[i];
  }
  getNextIndex() {
    let nextIndex = this._index + 1;
    if( nextIndex >= this._list.length )
      nextIndex = 0;
    return nextIndex;
  }
  prev() {
    this._index--;
    if( this._index < 0 )
      this._index = this._list.length - 1;
    return this._list[this._index];
  }
  home() {
    this._index = 0;
    return this._list[this._index];
  }
  last() {
    this._index = this._list.length - 1;
    return this._list[this._index];
  }

  add(args: string | string[]) {
    const newlist = args instanceof Array ? args.concat() : typeof args === 'string' ? [args] : [];

    this._baselist.push( ...newlist );
    this._list.push( ...newlist );
  }
  addRandomizedList(newlist: string[]) {
    let list = newlist.concat();
    let startIndex = this._index + 2;
    if( startIndex <= this._list.length - 1 ) {
      const restlist = this._list.splice(startIndex, this._list.length);
      list = list.concat(restlist);
    }
    for (let i = list.length - 1; i--; ) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    this._list.push(...list);
  }
  remove(index: number) {
    this._list.splice(index, 1);
  }
  shuffle() {
    const current = this._list.splice(this._index, 1);
    shuffleList(this._list);
    this._list.splice(this._index, 0, ...current);
  }
  getArray() {
    return this._list;
  }
  clear() {
    this._index = 0;
    this._list.length = 0;
    this._baselist.length = 0;
  }
}


function sortList() {
}
function removeDup(list: string[]) {
  for( const test in {} ) {
  }
}
function shuffleList(list: string[]) {
  var l = list;
  var tmp, t;
  for( var i=l.length; i--; ) {
    t = Math.random()*i|0;
    tmp = l[i];
    l[i] = l[t];
    l[t] = tmp;
  }
}
