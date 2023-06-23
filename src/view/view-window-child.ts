import { _ViewWindow } from "./view-window-_base";



import { _ViewBase } from "./view-_base";
import { MovedCoordinates } from "src/utils/resizable-border";

export class ViewChild extends _ViewWindow {
  protected _window: MSWindowModeless;
  protected _document: Document;

  constructor(uid: string) {
    super(uid);
    // create a ModelessDialog with relative path
    //this._window = window.showModelessDialog(`about:<base href="${document.URL.replace(/[^/\\]+$/, '')}"><body ondragstart="return false">`, this, `dialogLeft: 200; dialogTop: 200; resizable:1; center:0; unadorned:1; scroll:0;`);
    this._window = window.showModelessDialog(`html/dialog.html`, this, `resizable:0; center:0; unadorned:1; scroll:0;`);
    this._document = this._window.document;

    this.initWindow();
  }
  moveViewFrame(x: number, y: number) {
    if( this._framepos.x !== x ) {
      this._window.dialogLeft = x;
      this._framepos.x = x;
    }
    if( this._framepos.y !== y ) {
      this._window.dialogTop = y;
      this._framepos.y = y;
    }
  }
  resizeViewFrame(w: number, h:number) {
    if( this._framepos.w !== w ) {
      this._window.dialogWidth = w + 'px';
      this._framepos.w = w;
    }
    if( this._framepos.h !== h ) {
      this._window.dialogHeight = h + 'px';
      this._framepos.h !== h;
    }
  }

  public getViewFramePos() {
    return {
      x: parseInt(this._window.dialogLeft),
      y: parseInt(this._window.dialogTop),
      w: parseInt(this._window.dialogWidth),
      h: parseInt(this._window.dialogHeight),
    };
  }
  /*
  public resizeFrameBy(pos: MovedCoordinates): void {
    let { resizeX, resizeY, resizeW, resizeH, moveX, moveY, startH, startW, startX, startY } = pos;
    try {
      if (resizeW) {
        this._width = this._startW + resizeW;
        this._window.dialogWidth = `${this._width}px`;
      }
      if (resizeH) {
        this._height = this._startH + resizeH;
        this._window.dialogHeight = `${this._height}px`;
      }
      if (resizeX) {
        this._x = this._startX + resizeX;
        this._window.dialogLeft = `${this._x}px`;
      }
      if (resizeY)
        this._y = this._startY + resizeY;
        this._window.dialogTop = `${this._y}px`;
    } catch (e: any) {
      console.log(e.message, 'red');
    }

    try {
      if (moveX) {
        this._x = this._startX + moveX;
        this._window.dialogLeft = `${this._x}px`;
      }
      if (moveY) {
        this._y = this._startY + moveY;
        this._window.dialogTop = `${this._y}px`;
      }
    } catch (e: any) {
      console.log(e.message, 'red');
    }
  }
  */
  
  protected $L() {
    return `[${this._modelUID}]ViewChild#`;
  }
}

