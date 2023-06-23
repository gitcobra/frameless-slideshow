// *currently this is only used OverlayControl

export interface ViewNode {
  getUID(): string;
  updateView(): void;
}

let UID_COUNTER = 0;
export function createUID() {
  return 'ViewNodeUID_' + UID_COUNTER++;
}

class ViewUpdater {
  private _started = false;
  private _list: ViewNode[] = [];
  private _listHash: { [key: string]: ViewNode} = {};
  constructor() {

  }

  add(item: ViewNode) {
    const uid = item.getUID();
    if( this._listHash[uid] )
      return;
    
    this._list.push(item);
    this._listHash[uid] = item;
    this.start();
  }

  start() {
    if( this._started )
      return;
    setTimeout(() => this._process(), 0);
    this._started = true;
  }
  private _process() {
    // preserve the current list beforehand to prepare against an interrupting
    const list = this._list.concat();
    this._list.length = 0;
    this._listHash = {};

    for( const item of list ) {
      item.updateView();
    }
    
    this._started = false;
    // re-execute if the list is updated by interrupts
    if( this._list.length !== 0 )
      this.start();
  }
}


// Singleton
const instance = new ViewUpdater();
export { instance as ViewUpdater }
