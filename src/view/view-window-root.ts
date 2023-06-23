import { _ViewWindow } from "./view-window-_base";
import { BoxPosition } from "src/model/data-types";


export class ViewRoot extends _ViewWindow {
  protected _window: Window;
  protected _document: Document;
  //protected _borderColor1 = 'red';
  
  constructor(uid: string) {
    super(uid);
    this._window = window;
    this._document = document;

    this.initWindow();
  }

  moveViewFrame(x: number, y: number, diffFlag = false) {
    if( this._framepos.x !== x || this._framepos.y !== y ) {
      try {
        window.moveTo( x, y );
        this._framepos.x = x;
        this._framepos.y = y;
      } catch(e: any) {
        console.log(e.message);
      }
    }
  }
  resizeViewFrame(w: number, h:number) {
    if( this._framepos.w !== w || this._framepos.h !== h ) {
      try {
        window.resizeTo(w, h);
        this._framepos.w = w;
        this._framepos.h = h;
      } catch(e: any) {
        console.log(e.message);
      }
    }
  }
  public getViewFramePos(): BoxPosition {
    return {
      x: window.screenLeft,
      y: window.screenTop,
      w: document.documentElement.offsetWidth,
      h: document.documentElement.offsetHeight,
    };
  }

  protected $L() {
    return `[${this._modelUID}]ViewRoot#`;
  }
}
