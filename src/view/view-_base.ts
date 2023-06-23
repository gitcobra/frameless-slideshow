import { AdjustmentPosition, BoxPosition, FilterSettings, PictureFrameSettings, ImageSettings, ShapeNames, Shapes, ImageQuality } from "src/model/data-types";
import { ViewNode, createUID } from "./view-updater";
import { ImgInfo } from "src/model/img-database";
import { CtrlElement } from "src/ctrl/ctrl-element";
import { escapeHTML } from "src/utils/utils";

import TemplateHTML from "../../res/frame-template.html";
import Version from "../../script/version.json";

const BASE_HTML_TEMPLATE = TemplateHTML
  .replace('${ICON}', 'img/slideshow.ico')
  .replace('${VERSION}', `${Version.major}.${Version.minor}.${Version.build}${Version.tag}`)





let UniqueCounter = 0;
export abstract class _ViewBase implements ViewNode {
  protected BlankGIF!: string;
  static {
    this.prototype.BlankGIF = 'img/blank.gif';
  }
  
  protected _UID: string;
  protected abstract _window: Window;
  protected abstract _document: Document;
  
  protected abstract _container: HTMLElement;
  protected _title!: HTMLImageElement;
  protected _name!: HTMLElement;
  protected _commands!: HTMLElement;
  protected _error!: HTMLImageElement;
  protected _errorMessage!: HTMLImageElement;
  
  protected _image!: HTMLImageElement;// | HTMLSpanElement;
  protected _imgElement!: HTMLImageElement;
  protected _framedImg!: HTMLImageElement;
  protected _framedVml!: HTMLImageElement;
  protected _vmlElement!: HTMLImageElement;
  //protected _ailElement!: HTMLSpanElement; // AlphaImageLoader

  protected _border1!: HTMLElement;
  protected _border2!: HTMLElement;
  protected _filterContainer!: HTMLElement;
  protected _shapeImage!: HTMLImageElement;
  protected _quality!: ImageQuality;
  protected _useAlphaImageLoader?: boolean;
  
  protected _borderWidth = 2;
  protected _borderStyle = 'dashed';
  protected _borderColor1 = 'white';
  protected _borderColor2 = 'black';

  protected _transitionName = '';
  protected _useShape = false;
  protected _shapeFilePath = '';
  protected _stretchShape = false;

  protected _enableHighlightEffects = true;

  protected _filterOffset = {
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    
    width: 0,
    height: 0,
  };
  
  public abstract moveViewFrame(x: number, y: number): void;
  public abstract resizeViewFrame(width: number, height: number): void;
  public abstract getViewFramePos(): BoxPosition;

  protected _currentImagePath = '';
  protected _imgpos: BoxPosition = {
    x: -1,
    y: -1,
    w: -1,
    h: -1,
  };
  protected _framepos: BoxPosition = {
    x: -1,
    y: -1,
    w: -1,
    h: -1,
  };


  constructor(protected _modelUID: string) {
    this._UID = createUID();
  }
  getUID() {
    return this._UID;
  }
  updateView(): void {
    // TODO
  }

  protected initBase() {
    //const ucounter = this.getUniqueCounter();
    // write base HTML
    this._container.innerHTML = this.getTemplateHTMLwithUID(this._UID);
    
    this._title = this._container.all('title'+ this._UID)! as HTMLImageElement;
    this._name = this._container.all('name'+ this._UID)! as HTMLImageElement;
    this._commands = this._container.all('commands'+ this._UID)! as HTMLUListElement;
    this._error = this._container.all('error'+ this._UID)! as HTMLImageElement;
    this._errorMessage = this._container.all('error-message'+ this._UID)! as HTMLImageElement;

    this._imgElement = this._container.all('image'+ this._UID)! as HTMLImageElement;
    this._imgElement.style.cssText = `display:none; position:absolute; left:0px; top:0px;`;
    this._imgElement.src = this.BlankGIF;
    this._vmlElement = this._container.all('vml'+ this._UID)! as HTMLImageElement;
    this._vmlElement.src = this.BlankGIF;
    this._vmlElement.style.cssText += `display:none; position:absolute; left:0px; top:0px;`;

    this._framedImg = this._container.all('framedimg'+ this._UID)! as HTMLImageElement;
    this._framedImg.style.cssText = `display:none; position:absolute; left:0px; top:0px;`;
    this._framedImg.src = this.BlankGIF;
    this._framedVml = this._container.all('framedvml'+ this._UID)! as HTMLImageElement;
    this._framedVml.style.cssText = `display:none; position:absolute; left:0px; top:0px;`;
    this._framedVml.src = this.BlankGIF;

    //this._ailElement = this._container.all('ail'+ this._UID)! as HTMLSpanElement;
    //this._ailElement.style.cssText = `display:none; position:absolute; left:0px; top:0px;`;
    this._quality = 'low';
    this._image = this._vmlElement;
    this._image.style.display = 'inline';
    //this.setImageQuality('low');

    this._filterContainer = this._container.all('filter'+ this._UID)! as HTMLElement;
    this._filterContainer.style.cssText += `; display:block; zoom:1; overflow:hidden; position:absolute; left:0px; top: 0px; width:100%; height:100%; font-size: 1px;`;

    this._border1 = this._container.all('border1_'+ this._UID)! as HTMLElement;
    this._border1.style.cssText += `; position:absolute; width:100%; height:100%; left:0px; top:0px; border:${this._borderWidth}px ${this._borderStyle} ${this._borderColor1}`;
    this._border2 = this._container.all('border2_'+ this._UID)! as HTMLElement;

    this._shapeImage = this._container.all('shape' + this._UID)! as HTMLImageElement;
    this._shapeImage.style.visibility = 'hidden';
    this._shapeImage.style.display = 'inline';
    this._shapeImage.src = this.BlankGIF;
  }

  load(path: string) {
    console.log(`${this.$L()}load ${path}`, 'darkcyan');
    this._image.style.visibility = 'visible';
    this._image.src = path || this.BlankGIF;
    
    //this._image.path = ['m '+r+',0', 'l '+(w-r)+',0', 'qx '+w+','+r, 'l '+w+','+(h-r), 'qy '+(w-r)+','+h, 'l '+r+','+h, 'qx 0,'+(h-r), 'l 0,'+r, 'qy '+r+',0', 'x e'].join(' ')
    
    this._currentImagePath = path;
  }
  // changing quality may causes change image element
  setImageQuality(quality: ImageQuality, useAlphaImageLoader = false) {
    console.log(`${this.$L()}setImageQuality ${quality}`, 'darkcyan');
    const preimg = this._image;
    const w = this._image.style.pixelWidth;
    const h = this._image.style.pixelHeight;
    const x = this._image.style.pixelLeft;
    const y = this._image.style.pixelTop;
    
    if( useAlphaImageLoader !== this._useAlphaImageLoader ) {
      this._useAlphaImageLoader = !!useAlphaImageLoader;
      /*
      if( useAlphaImageLoader ) {
        this._image.style.display = 'none';
        this._image = this._ailElement;
        this._image.style.filter = `progid:DXImageTransform.Microsoft.AlphaImageLoader(src='img/blank.gif', sizingMethod='scale')`;
      }
      else {
        this._ailElement.style.display = 'none';
        this._ailElement.style.filter = '';
      }
      */
    }
    else if( this._quality === quality || this._useAlphaImageLoader )
      return;

    if( !this._useAlphaImageLoader ) {
      // clear current image element except when "low => medium" or "medium => low"
      if( quality !== 'low' && quality !== 'medium' || this._image !== this._imgElement ) {
        this._image.style.display = 'none';
        this._image.src = this.BlankGIF;
      }

      switch(quality) {
        case 'low': // img
          console.log('low', 'darkcyan');
          this._image = this._imgElement;
          this._image.style.msInterpolationMode = 'nearest-neighbor';
          break;
        case 'high': // VML
          console.log('high', 'darkcyan');
          this._image = this._vmlElement;
          break;
        default:
        case 'medium': // img + msInterpolationMode
          console.log('medium', 'darkcyan');
          this._image = this._imgElement;
          this._image.style.msInterpolationMode = 'bicubic';
          break;
      }
    }

    this._image.style.display = 'inline';
    this._image.style.pixelWidth = w;
    this._image.style.pixelHeight = h;
    this._image.style.pixelLeft = x;
    this._image.style.pixelTop = y;
    this._quality = quality;
  }
  getViewImageQuality() {
    return this._quality;
  }

  // NOTE:
  // each filter could not be added or removed individually, (probably)
  // so the entire filter needs to be re-configured every time it is changed, even if it simply needs add one new filter.
  setFilters(all:FilterSettings, changed?: Partial<FilterSettings>) {
    console.log(`${this.$L()}setFilter`, 'darkcyan');
    
    const {trans, duration=500, shape} = all;
    
    // check static filters
    const { alpha, chroma, gradient, /*rotation,*/ invert, mirror, grayscale, xray, shadow, engrave, emboss, blur, matrix, glow, border } = all;
    let staticFilters = [];
    let oleft = 0, otop = 0, obottom = 0, oright = 0, owidth = 0, oheight = 0; // filter offsets

    if( chroma ) {
      //TODO
    }
    if( gradient ) {
      staticFilters.push(`progid:DXImageTransform.Microsoft.gradient(startColorstr=#11000011, endColorstr=#11111111, GradientType=1)`);
    }
    if( emboss ) {
      staticFilters.push(`progid:DXImageTransform.Microsoft.Emboss()`);
    }
    if( engrave ) {
      staticFilters.push(`progid:DXImageTransform.Microsoft.Engrave()`);
    }
    if( border ) {
      let { borderWidth=1, borderColor='000000', } = all;
      if( borderWidth > 100 )
        borderWidth = 100;
      oleft += borderWidth;
      oright += borderWidth;
      otop += borderWidth;
      obottom += borderWidth;
      
      /*
      staticFilters.push(`progid:DXImageTransform.Microsoft.DropShadow(offX=${-borderWidth}, offY=${-borderWidth}, color=#${borderColor})`);
      staticFilters.push(`progid:DXImageTransform.Microsoft.DropShadow(offX=${-borderWidth}, offY=${borderWidth}, color=#${borderColor})`);
      staticFilters.push(`progid:DXImageTransform.Microsoft.DropShadow(offX=${borderWidth}, offY=${-borderWidth}, color=#${borderColor})`);
      staticFilters.push(`progid:DXImageTransform.Microsoft.DropShadow(offX=${borderWidth}, offY=${borderWidth}, color=#${borderColor})`);
      */

      staticFilters.push(`progid:DXImageTransform.Microsoft.DropShadow(offX=${-borderWidth}, offY=${0}, color=#${borderColor})`);
      staticFilters.push(`progid:DXImageTransform.Microsoft.DropShadow(offX=${borderWidth}, offY=${0}, color=#${borderColor})`);
      staticFilters.push(`progid:DXImageTransform.Microsoft.DropShadow(offX=${0}, offY=${-borderWidth}, color=#${borderColor})`);
      staticFilters.push(`progid:DXImageTransform.Microsoft.DropShadow(offX=${0}, offY=${borderWidth}, color=#${borderColor})`);
      //staticFilters.push(`progid:DXImageTransform.Microsoft.DropShadow(offX=18, offY=18, color=black)`);
    }
    if( glow ) {
      const { glowStr: glowStrength=5, glowColor='000000', } = all;
      oleft += glowStrength;
      otop += glowStrength;
      obottom += glowStrength;
      oright += glowStrength;
      staticFilters.push(`progid:DXImageTransform.Microsoft.Glow(Strength=${glowStrength}, color=${glowColor})`);
    }
    if( blur) {
      const {blurStr: bradius = 3} = all;
      oleft += bradius;
      oright += bradius;
      otop += bradius;
      obottom += bradius;
      staticFilters.push(`progid:DXImageTransform.Microsoft.Blur(PixelRadius=${bradius})`);
    }
    if( alpha ) {
      const {alphaOpacity=100, alpha='none', alphaDegree=0, alphaReverse=false} = all;
      if( alpha !== 'none' ) {
        let style = 1; // 1: linear
        let opacity = alphaOpacity;
        let finishOpacity = 0;
        let startX = 0, startY = 0, finishX = 0, finishY = 0;
        if( alpha === 'linear' ) {
          switch(alphaDegree) {
            case 0:
            default:
              startX = 50;
              startY = 0;
              finishX = 50;
              finishY = 100;
              break;
            case 45:
              startX = 100;
              startY = 0;
              finishX = 20;
              finishY = 80;
              break;
            case 90:
              startX = 100;
              startY = 50;
              finishX = 0;
              finishY = 50;
              break;
            case 135:
              startX = 100;
              startY = 100;
              finishX = 20;
              finishY = 20;
              break;
            case 180:
              startX = 50;
              startY = 100;
              finishX = 50;
              finishY = 0;
              break;
            case 225:
              startX = 0;
              startY = 100;
              finishX = 80;
              finishY = 20;
              break;
            case 270:
              startX = 0;
              startY = 50;
              finishX = 100;
              finishY = 50;
              break;
            case 315:
              startX = 0;
              startY = 0;
              finishX = 80;
              finishY = 80;
              break;
          }
        }
        if( alpha === 'plain' ) {
          finishOpacity = alphaOpacity;
        }
        if( alphaReverse ) {
          //[startX, startY, finishX, finishY] = [finishX, finishY, startX, startY];
          [opacity, finishOpacity] = [finishOpacity, opacity];
        }
        if( alpha === 'radial' )
          style = 2;
        if( alpha === 'rect' )
          style = 3;

        staticFilters.push(`progid:DXImageTransform.Microsoft.Alpha(opacity=${opacity}, finishOpacity=${finishOpacity}, style=${style}, finishX=${finishX}, finishY=${finishY}, startX=${startX}, startY=${startY})`);
      }
    }
    if( matrix ) { // TODO
      let deg = matrix;
      const torad = Math.PI * 2 / 360;
      const M11 = Math.cos(torad * deg);
      const M12 = Math.sin(- torad * deg);
      const M21 = Math.sin(torad * deg);
      const M22 = Math.cos(torad * deg);
      staticFilters.push(`progid:DXImageTransform.Microsoft.Matrix(M11=${M11}, M12=${M12}, M21=${M21}, M22=${M22}, SizingMethod="auto expand")`);
    }
    if( shadow ) {
      const swidth = 3;
      oright += swidth;
      obottom += swidth;
      staticFilters.push(`progid:DXImageTransform.Microsoft.Shadow(color='black', Direction=135, Strength=${swidth})`);
    }


    // BasicImage
    let basicImage = '';
    if( /*rotation ||*/ invert || mirror || grayscale || xray ) {
      const str: string[] = [];
      //Number(rotation) > 0 && str.push('rotation=' + rotation);
      invert && str.push('invert=1');
      mirror && str.push('mirror=1');
      grayscale && str.push('grayscale=1');
      xray && str.push('xray=1');

      basicImage += `progid:DXImageTransform.Microsoft.BasicImage(${ str.join(',') })`;
    }


    // check transition
    let transFilter = '';
    let transName = '';
    if( trans && trans !== 'none' ) {
      transName = `DXImageTransform.Microsoft.${trans}`;

      const str: string[] = [];
      str.push(`duration=${duration/1000}`);
      str.push(`percent=0`);
      
      // transition options
      switch(trans) {
        case 'RevealTrans':
          str.push(`transition=${Math.random()*24|0}`);
          break;
        case 'fade':
          str.push(`center=1`);
          break;
        case 'slide':
          str.push(`slideStyle=push`);
          break;
      }
      transFilter = `progid:${transName}(${ str.join(',') })`;
    }
    this._transitionName = transName;

    // check shape
    // always apply Compositor because of "framedframe"
    let shapeFilter = 'progid:DXImageTransform.Microsoft.Compositor(function=21, enabled=0)';
    this._useShape = false;
    this._stretchShape = false;
    this._shapeFilePath = '';
    //this._shapeImage.style.display = 'none';
    if( shape && shape !== 'none' ) {
      this._shapeFilePath = shape === 'file' ? all.shapeFilePath || '' : Shapes[shape as ShapeNames];
      if( this._shapeFilePath ) {
        shapeFilter = 'progid:DXImageTransform.Microsoft.Compositor(function=21, enabled=0)';
        
        this._shapeImage.src = this._shapeFilePath;
        this._shapeImage.style.display = 'inline';
        this._useShape = true;
        this._stretchShape = !!all.shapestretch;
      }
    }
    
    const staticFiltersText = staticFilters.join(' ') + ' ' + basicImage;
    const filterText = transFilter + ' ' + shapeFilter + ' ' + staticFiltersText;
    this._filterContainer.style.filter = filterText;
    console.log(this._filterContainer.style.filter, "cyan")
    
    // overflow is automatically cropped when filters are applied
    this._filterContainer.style.overflow = /progid:/i.test(staticFiltersText) ? 'visible' : 'hidden';

    // calculate filter effects' offset
    this._filterOffset = {
      left: oleft,
      right: oright,
      top: otop,
      bottom: obottom,
      width: oleft + oright,
      height: otop + obottom,
    };
    this._filterContainer.style.pixelTop = -this._filterOffset.top;
    this._filterContainer.style.pixelLeft = -this._filterOffset.left;
  }

  apply(currentFrame: BoxPosition, nextFrame: BoxPosition, currentImage: BoxPosition, nextImage: BoxPosition, shapeInfo: ImgInfo | null) {
    console.log(`${this.$L()}apply`, 'darkcyan');
    // 
  }
  applyTrans(nextFrame: BoxPosition) {
    // transition
    if( this._transitionName ) {
      /*
      const scrx = currentFrame.x + currentImage.x;
      const scry = currentFrame.y + currentImage.y;
      const nextscrx = nextFrame.x + nextImage.x;
      const nextscry = nextFrame.y + nextImage.y;
      */
      const currentFrame = this.getViewFramePos();
      const difx = (currentFrame.x - nextFrame.x);// + (currentImage.x - nextImage.x)
      const dify = (currentFrame.y - nextFrame.y);// + (currentImage.y - nextImage.y)
      
      // move and resize for transition
      //const {x, y} = this._imgpos;
      this.resizeViewFrame(nextFrame.w, nextFrame.h);
      this.moveViewImage(difx, dify, true);

      this._filterContainer.filters.item(this._transitionName).apply();

      // restore
      //this.moveViewImage(x, y);
    }
  }

  applyShape(nextFrame: BoxPosition, nextImage: BoxPosition, shapeInfo: ImgInfo | null, framedframe: PictureFrameSettings | null) {
    console.log(`${this.$L()}applyShape ${this._useShape}`, 'darkcyan');
    //console.log(shapeInfo);
    // shape
    if( this._useShape && shapeInfo || framedframe ) {
      const shape = this._shapeImage;
      //const nextImage = this._imgpos;
      //const nextFrame = this._framepos;
      const swidth = shapeInfo?.width || framedframe?.width || 1;
      const sheight = shapeInfo?.height || framedframe?.height || 1;
      const src = shapeInfo?.path || this.BlankGIF;
      let shapeWidth = 0;
      let shapeHeight = 0;
      let shapeLeft = 0;
      let shapeTop = 0;
      
      const destx = nextImage.x < 0 ? 0 : nextImage.x;
      const desty = nextImage.y < 0 ? 0 : nextImage.y;
      const destw = nextImage.w > nextFrame.w ? nextFrame.w : nextImage.w;
      const desth = nextImage.h > nextFrame.h ? nextFrame.h : nextImage.h;
      if( this._stretchShape ) {
        shape.style.pixelLeft = destx;
        shape.style.pixelTop = desty;
        shape.style.pixelWidth = destw;
        shape.style.pixelHeight = desth;
        shapeWidth = destw;
        shapeHeight = desth;
        shapeLeft = destx;
        shapeTop = desty;
      }
      else {
        const wratio = swidth / destw;
        const hratio = sheight / desth;

        if( wratio > hratio ) {
          shapeWidth = destw;
          shapeHeight = sheight / wratio |0;
        }
        else {
          shapeWidth = swidth / hratio |0;
          shapeHeight = desth;
        }
        
        shape.style.pixelWidth = shapeWidth;
        shape.style.pixelHeight = shapeHeight;
        
        // centering shape
        const xdif = (destw - shapeWidth) / 2 |0;
        const ydif = (desth - shapeHeight) / 2 |0;
        shapeLeft = destx + xdif;
        shapeTop = desty + ydif;
        
        shape.style.pixelLeft = shapeLeft;
        shape.style.pixelTop = shapeTop;
      }

      if( framedframe ) {
        let {wratio:wrate, hratio:hrate, xratio:xrate, yratio:yrate, framePath, quality} = framedframe;
        if( quality !== 'high')
          this._framedVml.style.display = 'none';
        else
          this._framedImg.style.display = 'none';
        const frameimg = ( quality === 'high') ? this._framedVml : this._framedImg;
        
        //const {x,y,w,h} = this._framepos;
        frameimg.style.display = 'inline';
        frameimg.style.zIndex = '10';
        frameimg.style.msInterpolationMode = quality === 'low' ? 'nearest-neighbor' : 'bicubic';
        frameimg.src = framePath;
        frameimg.style.pixelLeft = shapeLeft - shapeWidth * xrate;
        frameimg.style.pixelTop = shapeTop - shapeHeight*yrate;
        frameimg.style.pixelWidth = shapeWidth * wrate;
        frameimg.style.pixelHeight = shapeHeight * hrate;
        shape.style.visibility = 'visible';
        if( !shapeInfo ) {
          shape.style.backgroundColor = 'black';
          this._filterContainer.filters.item('DXImageTransform.Microsoft.Compositor').enabled = true;
        }
      }
      
      shape.onload = () => {
        shape.onload = null as any;

        // temporarily disable the transition filter for Compositor
        if( this._transitionName )
          this._filterContainer.filters.item(this._transitionName).enabled = false;
        
        // show shape only
        shape.style.visibility = 'visible';
        this._image.style.visibility = 'hidden';
        this._error.style.display = 'none';
        this._title.style.display = 'none';
        this._filterContainer.filters.item('DXImageTransform.Microsoft.Compositor').apply();
        
        // hide shape and show image
        shape.style.visibility = 'hidden';//display = 'none';
        if( !shapeInfo )
          shape.style.backgroundColor = '';
        this._image.style.visibility = 'visible';
        this._filterContainer.filters.item('DXImageTransform.Microsoft.Compositor').play();
        
        // restore transition filter
        if( this._transitionName )
          this._filterContainer.filters.item(this._transitionName).enabled = true;
      };
      
      shape.src = src;
    }
    else {
      this._filterContainer.filters.item('DXImageTransform.Microsoft.Compositor').enabled = false;
    }
    
    if( !framedframe ) {
      this._framedVml.style.display = 'none';
      this._framedImg.style.display = 'none';
      this._shapeImage.style.backgroundColor = '';
    }
  }
  play() {
    console.log(`${this.$L()}play`, 'darkcyan');
    if( this._transitionName ) {
      this._filterContainer.filters.item(this._transitionName).play();
    }
  }
  getShape() {
    return this._shapeImage;
  }
  
  moveViewImage(x:number, y:number, diff = false) {
    if( diff ) {
      x = this._imgpos.x + x;
      y = this._imgpos.y + y;
    }
    console.log(`${this.$L()}moveViewImage ${[x,y]}`, 'darkcyan');

    if( x !== this._imgpos.x || y !== this._imgpos.y ) {
      this._image.style.pixelLeft = x;
      this._imgpos.x = x;
    }
    if( y !== this._imgpos.y ) {
      this._image.style.pixelTop = y;
      this._imgpos.y = y;
    }
    //console.log(this._filterOffset)
  }

  resizeViewImage(w:number, h:number) {
    console.log(`${this.$L()}resizeViewImage ${w} ${h}`, 'darkcyan');
    if( w !== this._imgpos.w || h !== this._imgpos.h ) {
      this._image.style.pixelWidth = w;
      this._imgpos.w = w;
    }
    if( h !== this._imgpos.h ) {
      this._image.style.pixelHeight = h;
      this._imgpos.h = h;
    }
  }
  
  getViewImagePos(): BoxPosition {
    return {...this._imgpos};
  }
  getViewImagePosInsideFrame(): BoxPosition {
    const {w: fw, h: fh} = this._framepos;
    let {x, y, w, h} = this._imgpos;

    if( x < 0 )
      x = 0;
    if( y < 0 )
      y = 0;
    if( w > fw )
      w = fw;
    if( h > fh )
      h = fh;
    
    return {
      x,
      y,
      w,
      h,
    };
  }
  
  setContainerStyle<T extends keyof MSStyleCSSProperties>(prop:T , val: MSStyleCSSProperties[T]) {
    this._container.style[prop] = val;
  }
  setImageStyle<T extends keyof MSStyleCSSProperties>(prop:T , val: MSStyleCSSProperties[T]) {
    this._image.style[prop] = val;
  }


  protected getTemplateHTMLwithUID(unique: number | string): string {
    const rep = String( unique );
    return BASE_HTML_TEMPLATE.replace(/\$\{UNIQUE\}/g, rep);
  }
  protected getUniqueCounter() {
    return ++UniqueCounter;
  }

  getWin() {
    return this._window;
  }
  getDoc() {
    return this._document;
  }
  getContainer() {
    return this._container;
  }
  showTitle(flag = true) {
    //console.log(`${this.$L()}showTitle ${flag}`, 'darkcyan');
    this._title.style.display = flag ? 'inline-block' : 'none';
  }
  showError(flag = true, message = '') {
    this._error.style.display = flag ? 'inline-block' : 'none';
    if( flag ) {
      this._errorMessage.innerHTML = escapeHTML(message);
    }
  }
  
  showBorder(flag = true) {
    console.log(`${this.$L()}showBorder ${flag}`, 'darkcyan');
    // hide border
    if( !flag ) {
      this._border1.style.display = `none`;
      this._border2.style.display = `none`;
    }
    else if( flag ) {
      // show border
      this._border1.style.display = `inline-block`;
      this._border2.style.display = `inline-block`;
    }
  }
  
  setName(name: string) {
    this._name.innerText = `[${name}]`;
  }
  getNameElement() {
    return this._name;
  }
  getCommandElement() {
    return this._commands;
  }

  setHighlightEffects(flag: boolean) {
    this._enableHighlightEffects = flag;
  }

  abstract dispose(): void;

  protected abstract $L(): string;
}


