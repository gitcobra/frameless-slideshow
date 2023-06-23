import { _ViewBase } from "./view-_base";
import { MovedCoordinates } from "../utils/resizable-border";
import { AdjustmentPosition, BoxPosition } from "src/model/data-types";
import { IE_Version } from "src/utils/utils";


const BaseZIndex = 7999;
const BackgroundZIndex = 7999;
export class ViewElement extends _ViewBase {
  protected _window: Window;
  protected _document: Document;
  protected _backgroundElement!: HTMLImageElement;

  protected _container: HTMLElement;

  constructor(uid: string, document: Document, initPos?: BoxPosition, initPath?: string) {
    super(uid);
    this._document = document;
    this._window = document.parentWindow;
    this._container = this._document.createElement('div');
    this._container.id = 'ViewElement_' + this._container.uniqueID;
    this._container.style.cssText = `display:inline-block; position:absolute; zoom:1;`;
    //this.setMaxZIndex();
    this._document.body.appendChild(this._container);
    this._borderStyle = 'dotted';
    this._borderWidth = 1;
    this._borderColor1 = 'white';

    if( initPos ) {
      this.resizeViewFrame(initPos.w, initPos.h);
      this.moveViewImage(initPos.x, initPos.y);
    }
    if( initPath ) {
      this.load(initPath);
    }
    
    this.initBase();
    this._border1.style.border = `${this._borderWidth}px ${this._borderStyle} ${this._borderColor1}`;
    // use border2 as highlight
    this._border2.style.cssText += `;position:absolute; zoom:1; width:1px; height:1px; left:0px; top:0px;`;

    // use wallpaper element as backgroundElement(highlight element's background)
    this._backgroundElement = document.all('wallpaper'+ this._UID)! as HTMLImageElement;
    this._backgroundElement.style.cssText = `display:none; z-index:-1; zoom:1; left:0px; top:0px; width:100%; height:100%; position:absolute;`;
    this._backgroundElement.src = this.BlankGIF;
  }
  setWallpaper(...args: any) {
    // do nothing
    return;
  }
  showBorder(flag = true) {
    super.showBorder(flag);
    if( flag ) {
      this._backgroundElement.style.display = 'inline-block';
      this.updateBorder2HighlightPosition();
    }
    else {
      this._backgroundElement.style.display = 'none';
    }
  }
  bringBGElementToFront(flag = true) {
    this._backgroundElement.style.zIndex = flag ? '1' : '-1';
  }
  
  // OPTIMIZE: update border2 (highlight frame)
  updateBorder2HighlightPosition() {
    const {x, y, w, h} = this.getViewImagePosInsideFrame();
    this._border2.style.cssText += `;width:${w}px; height:${h}px; left:${x}px; top:${y}px;`;
  }
  updateBorder2HighlightVisibility(flag: boolean) {
    this._border2.style.visibility = flag ? 'visible': 'hidden';
  }
  setHighlightEffects(flag: boolean): void {
    this._border2.style.filter = flag && IE_Version.real >= 9 ? 'Alpha(opacity=40) progid:DXImageTransform.Microsoft.Gradient(startcolorStr=#77AAAAFF, endcolorStr=#11000066)' : '';
    this._backgroundElement.style.filter = flag && IE_Version.real >= 5 ? 'progid:DXImageTransform.Microsoft.Gradient(startcolorStr=#33000000, endcolorStr=#BB000033)' : '';
    
    this._enableHighlightEffects = flag;
  }

  moveViewImage(x: number, y: number, diff?: boolean): void {
    super.moveViewImage(x, y, diff);
    this.updateBorder2HighlightPosition();
  }
  resizeViewImage(x: number, y: number): void {
    super.resizeViewImage(x, y);
    this.updateBorder2HighlightPosition();
  }
  
  getTargetDocument() {
    return this._document;
  }
  moveViewFrame(x: number, y: number, diff = false) {
    //console.log(`${this.$L()}moveViewFrame ${[x,y]}`, 'darkcyan');
    if( diff ) {
      x = this._framepos.x + x;
      y = this._framepos.y + y;
    }
    if( this._framepos.x !== x ) {
      this._container.style.pixelLeft = x;
      this._framepos.x = x;
    }
    if( this._framepos.y !== y ) {
      this._container.style.pixelTop = y;
      this._framepos.y = y;
    }
  }
  resizeViewFrame(w: number, h:number) {
    if( this._framepos.w !== w ) {
      this._container.style.pixelWidth = w;
      this._framepos.w = w;
    }
    if( this._framepos.h !== h ) {
      this._container.style.pixelHeight = h;
      this._framepos.h = h;
    }
  }
  setZIndex(zIndex: number, background = false) {
    this._container.style.zIndex = String((background ? BackgroundZIndex : BaseZIndex) + zIndex);
  }

  updateBasePositionArrowIcon(frameadjust: AdjustmentPosition) {
    if( !this._enableHighlightEffects ) {
      this._border1.innerHTML = '';
      return;
    }
    
    // draw an arrow pointing adjusted drection for frame
    let iconSizeRatio = 16;
    let fontWeight = 'normal';
    let icon = '';
    let textAlign = '';
    let verticalAlign = '';
    let color = 'white';
    switch(frameadjust) {
      case 'left-center':
        icon = 'è';
        //position = 'left:0px; top:50%;';
        textAlign = 'left';
        verticalAlign = 'middle';
        break;
      case 'left-bottom':
        icon = 'ì';
        textAlign = 'left';
        verticalAlign = 'bottom';
        //position = 'left:0px; bottom:0px;';
        break;
      case 'center-top':
        icon = 'ê';
        verticalAlign = 'top';
        textAlign = 'center';
        //position = 'left:50%; top:0px;';
        break;
      case 'center-center':
        icon = '°';
        iconSizeRatio = 8;
        fontWeight = 'bolder';
        verticalAlign = 'middle';
        textAlign = 'center';
        //position = `left:expression(${leftCenterExp}+'px'); top:50%;`;
        break;
      case 'center-bottom':
        icon = 'é';
        verticalAlign = 'bottom';
        textAlign = 'center';
        //position = 'left:50%; bottom:0px;';
        break;
      case 'right-top':
        icon = 'í';
        //position = 'right:0px; top:0px;';
        textAlign = 'right';
        verticalAlign = 'top';
        break;
      case 'right-center':
        icon = 'ç';
        //position = 'right:0px; top:50%;';
        textAlign = 'right';
        verticalAlign = 'middle';
        break;
      case 'right-bottom':
        icon = 'ë';
        //position = 'right:0px; bottom:0px;';
        textAlign = 'right';
        verticalAlign = 'bottom';
        break;
      default:
      case 'left-top':
        icon = 'î';
        textAlign = 'left';
        verticalAlign = 'top';
        break;
    }
    const frameArrow = `
      <table style="position:absolute; left:0px; top:0px; width:100%; height:100%; font-size:1px;"><tr><td style="text-align:${textAlign}; vertical-align:${verticalAlign}; ">
        <span style="color:${color}; zoom:1; padding:1px; filter:Glow(Strength=1, color=black); font-weight:${fontWeight}; font-size:expression(Math.max((parentNode.offsetWidth/${iconSizeRatio}|0), 4)+'px'); line-height:80%; font-family:WingDings;">${icon}</span>
      </td></tr>
    `;

    this._border1.innerHTML = frameArrow;
  }
  updateImagePositionArrowIcon(imgadjust: AdjustmentPosition) {
    if( !this._enableHighlightEffects ) {
      this._border2.innerHTML = '';
      return;
    }

    // draw an arrow pointing adjusted drection for image
    let iconSizeRatio = 17;
    let fontWeight = 'normal';
    let icon = '';
    let textAlign = '';
    let verticalAlign = '';
    let color = 'white';
    switch(imgadjust) {
     case 'left-center':
        icon = '\xf0';
        //position = 'left:0px; top:50%;';
        textAlign = 'left';
        verticalAlign = 'middle';
        break;
      case 'left-bottom':
        icon = '\xf6';
        textAlign = 'left';
        verticalAlign = 'bottom';
        //position = 'left:0px; bottom:0px;';
        break;
      case 'center-top':
        icon = '\xf2';
        verticalAlign = 'top';
        textAlign = 'center';
        //position = 'left:50%; top:0px;';
        break;
      case 'center-center':
        icon = '\xb1';
        iconSizeRatio = 10;
        fontWeight = 'bolder';
        verticalAlign = 'middle';
        textAlign = 'center';
        //position = `left:expression(${leftCenterExp}+'px'); top:50%;`;
        break;
      case 'center-bottom':
        icon = '\xf1';
        verticalAlign = 'bottom';
        textAlign = 'center';
        //position = 'left:50%; bottom:0px;';
        break;
      case 'right-top':
        icon = '\xf7';
        //position = 'right:0px; top:0px;';
        textAlign = 'right';
        verticalAlign = 'top';
        break;
      case 'right-center':
        icon = '\xef';
        //position = 'right:0px; top:50%;';
        textAlign = 'right';
        verticalAlign = 'middle';
        break;
      case 'right-bottom':
        icon = '\xf5';
        //position = 'right:0px; bottom:0px;';
        textAlign = 'right';
        verticalAlign = 'bottom';
        break;
      default:
      case 'left-top':
        icon = '\xf8';
        textAlign = 'left';
        verticalAlign = 'top';
        break;
    }

    const fpos = this._framepos;
    const ipos = this._imgpos;
    let fontSize = Math.min(ipos.w / 4, ipos.h / 4, Math.max(fpos.w / iconSizeRatio, 4)) + 'px';

    this._border2.innerHTML = `
      <table style="border:1px solid white; position:absolute; left:0px; top:0px; width:100%; height:100%; font-size:1px;"><tr><td style="text-align:${textAlign}; vertical-align:${verticalAlign};">
        <span style="color:${color}; padding:1px; font-weight:${fontWeight}; font-size:${fontSize}; line-height:80%; font-family:WingDings;">${icon}</span>
      </td></tr>
    `;
  }


  public getViewFramePos() {
    return {
      x: this._container.style.pixelLeft,
      y: this._container.style.pixelTop,
      w: this._container.style.pixelWidth,
      h: this._container.style.pixelHeight,
    };
  }


  dispose() {
    this._container.parentNode?.removeChild(this._container);
    this._document = null as any;
    this._window = null as any;
  }

  protected $L() {
    return `[${this._modelUID}]ViewElement#`;
  }
}
