import { MovedCoordinates } from "src/utils/resizable-border";
import { ImagePathList, FrameSettings, ImageSettings, BoxPosition, SlideshowSettings as SlideshowSettings, FrameSettingsJSON, FilterSettings, XYPos, Shapes, ShapeNames, MiscSettings, WindowSettings, PictureFrameSettings, DefaultFrameSettingsJSON, RootWindowSettings, ElementSettings, SettingType } from "./data-types";
import { ImgInfoDatabase as ImageDatabase, ImgInfo, ImgInfoDatabase } from "./img-database";
import WallpaperInfo from "../utils/wallpaper-info";
import { ImgList } from "./img-list";
import { ModelRoot } from "./model-root";
import { ModelWindow } from "./model-window";
import { CtrlElement } from "src/ctrl/ctrl-element";
import { ModelElement } from "./model-element";
import { escapeHTML } from "src/utils/utils";


const MinimumFrameSize = 32;
const BlankGIFPath = 'img/blank.gif';
const FailedImgAlt = 'img/blank.gif';
const FailedBlankWidth = 180;
const FailedBlankHeight = 120;

export type ModelEventHandlers = {
  "load": (imgDat: ImgInfo, frameSize: BoxPosition, imageSize: BoxPosition) => any;
  "load-error": (imgDat: ImgInfo) => any;
  "load-error-next": (imgDat: ImgInfo) => any;
  "before-load": (imgDat: ImgInfo, frameSize: BoxPosition, imageSize: BoxPosition) => any;
  "slide-start": (...args: any) => any;
  "slide-stop": (...args: any) => any;
  "slide-next": (dat: ImgInfo) => any;
  "slide-next-error": (dat: ImgInfo) => any;

  "playlist-update": (length: number) => any;
  
  "change-image-settings": (param: Partial<ImageSettings>) => any;
  "change-image-position": (x:number, y:number) => any;
  "change-image-size": (w:number, h:number) => any;

  "change-frame-settings": (param: Partial<FrameSettings>) => any;
  "change-frame-size": (w:number, h:number) => any;
  "change-frame-position": (x:number, y:number) => any;

  "change-slideshow-settings": (param: Partial<SlideshowSettings>) => any;
  "change-misc-settings": (param: Partial<MiscSettings>) => any;
  "change-picture-frame": (pframe: PictureFrameSettings | null) => any;
  "change-window-settings": (param: Partial<WindowSettings>) => any;
  "change-root-settings": (param: Partial<RootWindowSettings>) => any;
  "change-element-settings": (param: Partial<ElementSettings>) => any;

  "change-filter-settings": (changedParam: Partial<FilterSettings>, allParam: FilterSettings) => any;
  "load-shape": (imgDat: ImgInfo, shape: FilterSettings["shape"]) => any;

  "change-name": (name: string) => any;
  "change-wallpaper": (data: any) => any;
  "settings-changed": (handler: string) => any;

  "add-frames": (frames: ModelElement[]) => any;
  "remove-frames": (frames: ModelElement[]) => any;
};
type ModelEventNames = keyof ModelEventHandlers;
type ModelEventListeners = {
  [K in keyof ModelEventHandlers]? : {
    [id: number]: (...args: Parameters<ModelEventHandlers[K]>) => any
  }
};

let UniqueIdCounter = 0;
export abstract class _ModelBase {
  protected abstract _type: 'root' | 'window' | 'element';
  
  protected _name: string = '';
  protected _list: ImgList; // path list of photos
  private _uid: string;
  private _listLinked: boolean = false;
  protected abstract _parent: ModelWindow | ModelRoot | null;
  private _currentShapeData: ImgInfo | null = null;
  private _disposed = false;

  public _blankImgInfo!: ImgInfo;
  static {
    this.prototype._blankImgInfo = {
      path: BlankGIFPath,
      width: 240,
      height: 180,
      dateCompleted: false,
      dateFailed: false,
      dateCreated: '',
      dateLastGotInfo: 0,
      dateUpdated: '',
      failedCount: 0,
      size: 0,
      status: 'COMPLETED',
      success: true,
    } as const;
  }
  protected _currentImgInfo: ImgInfo | null = null;

  constructor(json?: Partial<FrameSettingsJSON>) {
    this._uid = `ID` + ++UniqueIdCounter;
    
    if( json ) {
      // TODO: check consistency
      this._name = json.name || this._name;
      this._frameSettings = json.frame || this._frameSettings;
      this._imageSettings = json.image || this._imageSettings;
      
      this._slideshowSettings = json.slide || this._slideshowSettings;
      this._filterSettings = json.filter || this._filterSettings;
      this._miscSettings = json.misc || this._miscSettings;
      this._pictureFrame = json.picframe || null;
    }

    // set default settings
    const defaultSettings = this.getDefaultSettings();
    if( !json && defaultSettings ) {
      this._frameSettings = {...defaultSettings.frame};
      this._imageSettings = {...defaultSettings.image};
      this._filterSettings = {...defaultSettings.filter};
      this._slideshowSettings = {...defaultSettings.slide};
      this._miscSettings = {...defaultSettings.misc};
      this._pictureFrame = defaultSettings.picframe ? {...defaultSettings.picframe} : null;
    }

    // init playlist
    if( json?.playlist ) {
      this._list = this.createNewList(json.playlist);
      this._list.jump(this._slideshowSettings.index || 0);
    }
    else {
      this._list = new ImgList();
    }
    this._fireModelEvent('playlist-update', this._list.getLength());

    const firstPath = this._list.get();
    if( firstPath ) {
      this.load(firstPath);
    }
  }

  private _timeoutIdForLoading = -1;
  load(path?: string) {
    console.log(`${this.$L()}load "${path}"`, 'olive');
    
    // just reload
    if( !path ) {
      path = this._list.get();
      if( !path ) {
        const img = ImageDatabase.createBlankImgInfo();
        img.width = 180;
        img.height = 120;
        this._currentImgInfo = img;
        this._doLoad(img);
        return;
      }
    }

    // use setTimeout to prevent queueing unnecessary requests
    clearTimeout(this._timeoutIdForLoading);
    this._timeoutIdForLoading = window.setTimeout(()=> {
      this._currentImgInfo = ImageDatabase.request(path!, (img) => {
        this._currentImgInfo = img;
        // set dummy size when it is failed to load
        if( !img.success ) {
          img.width = FailedBlankWidth;
          img.height = FailedBlankHeight;
          //img.path = FailedImgAlt;
          this._fireModelEvent('load-error', img);
        }
        this._doLoad(img);
      });
    }, 0);
  }
  private _doLoad(img: ImgInfo) {
    const size = this._calcSizeForFrameAndImage(img);
    //console.log(size.frame);
    this._fireModelEvent('before-load', img, size.frame, size.image);
    this.resizeFrame(size.frame.w, size.frame.h);
    this.moveFrame(size.frame.x, size.frame.y);
    this.moveImage(size.image.x, size.image.y);
    this.resizeImage(size.image.w, size.image.h);
    this._fireModelEvent('load', img, size.frame, size.image);
  }
  
  // SLIDE SHOW
  private _slideshowSettings: SlideshowSettings = {
    status: 'stop',
    delay: 10000,
    sync: false,//true,
    gap: 0,
    index: 0,
    removeOnError: true,
  };
  setSlideshowSettings(param: Partial<SlideshowSettings>, fireEvent = true) {
    // set values
    for( const prop in param ) {//@ts-ignore
      this._slideshowSettings[prop] = param[prop];
    }
    
    // do something for each changed parameter
    for( const prop in param ) {
      switch( prop as keyof SlideshowSettings ) {
        case 'delay':
          if( this._playingSlideShow )
            this._hookNextSlide();
          break;
      }
    }

    if( fireEvent )
      this._fireModelEvent(`change-slideshow-settings`, {...param});
  }
  getSlideshowSettings<T extends keyof SlideshowSettings>(prop: T) {
    return this._slideshowSettings[prop];
  }

  private _slideShowTimeoutId = -1;
  private _playingSlideShow = false;
  // if "pause" flag is true it starts only items with "pause" status
  startSlideShow(pause = false) {
    if (this._playingSlideShow || !this._list.getLength() )
      return;
    if( pause && this._slideshowSettings.status !== 'pause' )
      return;
    
    console.log(`${this.$L()}stratSlideShow`, 'olive');

    // display current image
    this.load(this.getList().get(0, true));
    this._slideshowSettings.status = 'play';
    this._playingSlideShow = true;
    
    this._hookNextSlide();
    this._fireModelEvent('slide-start');
  }
  stopSlideShow(pause = false) {
    console.log(`${this.$L()}stopSlideShow`, 'olive');
    if( this._playingSlideShow ) {
      clearTimeout(this._slideShowTimeoutId);
      this._slideshowSettings.status = pause ? 'pause' : 'stop';
      this._playingSlideShow = false;
      this._fireModelEvent('slide-stop');
    }
  }
  isPlayingSlideShow() {
    return this._playingSlideShow;//this._slideshowSettings.status === 'play';
  }

  nextSlide() {
    console.log(`${this.$L()}nextSlide`, 'olive');
    const path = this._list.next();
    this.load(path);
    
    if( this._playingSlideShow )
      this._hookNextSlide();
  }
  prevSlide() {
    console.log(`${this.$L()}prevSlide`, 'olive');
    const path = this.getList().prev();
    this.load(path);
    if( this._playingSlideShow )
      this._hookNextSlide();
  }
  homeSlide() {
    console.log(`${this.$L()}homeSlide`, 'olive');
    const path = this.getList().home();
    this.load(path);
    if( this._playingSlideShow )
      this._hookNextSlide();
  }
  lastSlide() {
    console.log(`${this.$L()}lastSlide`, 'olive');
    const path = this.getList().last();
    this.load(path);
    if( this._playingSlideShow )
      this._hookNextSlide();
  }

  private _hookNextSlide() {
    console.log(`${this.$L()}_hookNextSlide`, 'olive');
    clearTimeout(this._slideShowTimeoutId);
    
    let delay = this._slideshowSettings.delay;
    if( this._slideshowSettings.sync ) {
      delay = getTimeAdjustedDelay(delay, this._slideshowSettings.randomGap ? delay * Math.random() : (this._slideshowSettings.gap || 0));
      //console.log(delay);
    }
    
    this._slideShowTimeoutId = window.setTimeout(() => this.nextSlide(), delay);
    this._preloadNext();
  }
  private _firstFailedIndex = -1;
  private _preloadNext(offset = 1) {
    console.log(`${this.$L()}_preloadNext`, 'olive');
    if( this._disposed )
      return;
    
    // if the length is less than 2, stop slideshow
    if( this._list.getLength() <= 1 ) {
      this.stopSlideShow();
      return;
    }

    
    let targetIndex = this._list.getIndex() + offset;
    if( targetIndex > this._list.getLength() - 1 )
      targetIndex = this._list.getIndex() + offset - this._list.getLength();
    const path = this._list.get(targetIndex);

    // check whether failed preload is repeated
    if( this._firstFailedIndex === targetIndex ) {
      this.stopSlideShow();
      return;
    }
    
    // get image data 
    ImageDatabase.request(path, (dat: ImgInfo) => {
      //console.log(dat);
      // error
      if( !dat.success ) {
        this._fireModelEvent('slide-next-error', dat);
        if( this._firstFailedIndex < 0 )
          this._firstFailedIndex = targetIndex;

        let removed = 0;
        if( this._slideshowSettings.removeOnError ) { 
          if( this._list.get(targetIndex) === path ) {
            console.log(["REMOVE", targetIndex, path], 'red');
            this._list.remove(targetIndex);
            removed = 1;
            this._firstFailedIndex = -1;
            this._fireModelEvent('playlist-update', this._list.getLength());
          }
        }
        
        // resume next next
        setTimeout(() => this._preloadNext(offset + 1 - removed), 0);
        return;
      }
      
      // Success, (do nothing)
      this._firstFailedIndex = -1;
    });
  }



  protected _framePos: {updated?: boolean} & BoxPosition = {
    x: 0,
    y: 0,
    w: 320,
    h: 240,
  };
  protected _imagePos: {updated?: boolean} & BoxPosition = {
    x: 0,
    y: 0,
    w: 320,
    h: 240,
  };
  protected _prevFramePos = {
    x: NaN,
    y: NaN,
    w: NaN,
    h: NaN,
  };
  protected _prevImagePos = {
    x: NaN,
    y: NaN,
    w: NaN,
    h: NaN,
  };

  protected _frameSettings: FrameSettings = {
    adjust: 'left-top',
    offsetX: 0,
    offsetY: 0,
    
    sizing: 'fixed',
    width: 320,
    height: 240,
  };
  setFrameSettings(param: Partial<FrameSettings>, fireEvent = true) {
    for( const prop in param ) {//@ts-ignore
      this._frameSettings[prop] = param[prop];
    }
    if( fireEvent )
      this._fireModelEvent(`change-frame-settings`, {...param});
  }
  
  getSpecificSetting<T extends SettingType>(stype: T, prop: keyof FrameSettingsJSON[T]) {
    switch(stype) {
      case 'frame':
        return this._frameSettings[prop as keyof FrameSettings];
      case 'image':
        return this._imageSettings[prop as keyof ImageSettings];
      case 'filter':
        return this._filterSettings[prop as keyof FilterSettings];
      case 'misc':
        return this._miscSettings[prop as keyof MiscSettings];
      case 'slide':
        return this._slideshowSettings[prop as keyof SlideshowSettings];
    }
  }

  getFrameSettings(): FrameSettings;
  getFrameSettings<T extends keyof FrameSettings>(prop: T): FrameSettings[T];
  getFrameSettings(prop?: keyof FrameSettings) {
    return prop ? this._frameSettings[prop] : {...this._frameSettings};
  }

  private _imageSettings: ImageSettings = {
    scale: 1,
    quality: 'balanced',
    shrink: 'longer',
    expand: false,
    adjust: 'center-center',
  };
  setImageSettings(param: Partial<ImageSettings>, fireEvent = true) {
    for( const prop in param ) {//@ts-ignore
      this._imageSettings[prop] = param[prop];
    }
    if( fireEvent )
      this._fireModelEvent(`change-image-settings`, {...param});
  }
  getImageSettings(): ImageSettings;
  getImageSettings<T extends keyof ImageSettings>(prop: T): ImageSettings[T];
  getImageSettings(prop?: keyof ImageSettings) {
    return prop ? this._imageSettings[prop] : {...this._imageSettings};
  }

  protected _miscSettings: MiscSettings = {
    pinned: false,
    disableSnap: false,
    disableResizing: false,
  };
  setMiscSettings(param: Partial<MiscSettings>, fireEvent = true) {
    for( const prop in param ) {//@ts-ignore
      this._miscSettings[prop] = param[prop];
    }

    if( fireEvent )
      this._fireModelEvent(`change-misc-settings`, {...param});
  }
  getMiscSettings<T extends keyof MiscSettings>(prop: T) {
    return this._miscSettings[prop];
  }

  private _filterSettings: FilterSettings = {
    trans: 'fade',
    duration: 1000,
    
    shape: 'none',
  };
  setFilterSettings(param: Partial<FilterSettings>, fireEvent = true) {
    if( typeof param.shape !== 'undefined' ) {
      if( param.shape !== this._filterSettings.shape || param.shape === 'file' && param.shapeFilePath !== this._filterSettings.shapeFilePath ) {
        this._currentShapeData = null;
      }
    }
    
    // update parameter
    for( const prop in param ) {//@ts-ignore
      this._filterSettings[prop] = param[prop];
    }

    // prepare for shape
    if( param.shape ) {
      this.getShapeData(param.shape);
    }

    if( fireEvent )
      this._fireModelEvent(`change-filter-settings`, {...param}, {...this._filterSettings});
  }
  getShapeData(shape?: FilterSettings["shape"], callback?: (shape: ImgInfo) => any): ImgInfo | null {
    shape = shape || this._filterSettings.shape;
    if( !this._currentShapeData || callback ) {
      if( shape && shape !== 'none' ) {
        const path = shape === 'file' ? this._filterSettings.shapeFilePath :Shapes[shape as ShapeNames];
        if( path ) {
          ImageDatabase.request(path, (dat) => {
            if( dat.success ) {
              if( this.getFilterSettings('shape') === shape ) {
                this._currentShapeData = dat;
                callback?.(dat);
              }
            }
            this._fireModelEvent(`load-shape`, dat, shape);
          });
        }
      }
      return null;
    } else
      return this._currentShapeData;
  }

  getFilterSettings<T extends keyof FilterSettings>(prop: T) {
    return this._filterSettings[prop];
  }
  getAllFilterSettings() {
    return {...this._filterSettings};
  }

  private _pictureFrame: PictureFrameSettings | null = null;
  createPictureFrame(framedat: PictureFrameSettings) {
    this._pictureFrame = framedat;
    this._fireModelEvent('change-picture-frame', framedat);
  }
  getPictureFrame() {
    return this._pictureFrame;
  }
  deletePictureFrame() {
    this._pictureFrame = null;
    this._fireModelEvent('change-picture-frame', null);
  }



  addList(list: string | string[]) {
    if( this._slideshowSettings.randomizeOnAppend ) {
      if( list instanceof Array !== true ) {
        list = [list as string];
      }
      this._list.addRandomizedList(list as string[]);
    }
    else
      this._list.add(list);
    
    this._fireModelEvent('playlist-update', this._list.getLength());
  }
  createNewList(list?: string[]) {
    this._list = new ImgList(list);
    this._fireModelEvent('playlist-update', this._list.getLength());
    return this._list;
  }
  clearList() {
    this._list.clear();
    this._currentImgInfo = null;
    this._slideshowSettings.index = 0;
    this._fireModelEvent('playlist-update', this._list.getLength());
    this.load();
  }
  shuffleList() {
    this._list.shuffle();
  }
  getList() {
    return this._list;
  }
  getListLinked() {
    return this._listLinked;
  }
  
  getUniqueId() {
    return this._uid;
  }
  getType() {
    return this._type;
  }
  getImagePath() {
    return this._list.get();
  }
  getImageIndex() {
    return this._list.getIndex();
  }
  getImgInfo(altblank = false) {
    return this._currentImgInfo || altblank && this.getBlankImage() || null;
  }
  getBlankImage() {
    const idat = ImgInfoDatabase.createBlankImgInfo();
    idat.width = 180;
    idat.height = 120;
    idat.path = BlankGIFPath;
    return idat;
  }
  isBlank() {
    return !this._list.getLength();
  }


  protected _regulateFrameCoordinates(param?: BoxPosition): BoxPosition {
    //console.log(`${this.$L()}regulateFrameCoordinates`, 'olive');
    let {w, h, x, y} = param || this._framePos;
    const prev = [w, h, x, y].toString();
    
    // too small size
    if( w < MinimumFrameSize )
      w = MinimumFrameSize;
    if( h < MinimumFrameSize )
      h = MinimumFrameSize;
    
    const {w: parentWidth, h: parentHeight} = this._getParentSize();
    const {adjust} = this._frameSettings;
    const [xadjust, yadjust] = adjust.split('-');

    // too large size
    // TODO: 
    /*
    if( xadjust === 'left' ) {
      if( w > parentWidth * 1.3 ) {
        w = parentWidth * 1.3 |0;
      }
    }
    if( yadjust === 'top' ) {
      if( h > parentHeight * 1.3 ) {
        h = parentHeight * 1.3 |0;
      }
    }
    */

    // outside of the rectangle's border
    if( x + w < MinimumFrameSize )
      x = - w + MinimumFrameSize;
    if( y + h < MinimumFrameSize )
      y = - h + MinimumFrameSize;
    if( parentWidth - x < MinimumFrameSize )
      x = parentWidth - MinimumFrameSize;
    if( parentHeight - y < MinimumFrameSize )
      y = parentHeight - MinimumFrameSize;
    
    // set the position
    if( !param ) {
      if( prev !== [w, h, x, y].toString() ) {
        this.resizeFrame(w, h);
        this.moveFrame(x, y);
      }
    }

    return {
      x,
      y,
      w,
      h,
    };
  }
  protected _calcSizeForFrameAndImage(idat?: ImgInfo, pos?: BoxPosition) {
    //console.log(`${this.$L()}_calcSizeForFrameAndImage`, 'olive', true);
    idat = idat || this.getImgInfo(true)!;

    // frame
    let sizing;
    let frmWidth, frmHeight, frmX, frmY; // current frame size
    let frmCfgWidth, frmCfgHeight;
    //let frmCfgMarginX, frmCfgMarginY;
    let frmFitWidth, frmFitHeight, frmFitX, frmFitY; // fitted frame size

    const {scale} = this._imageSettings;
    let imgSrcWidth, imgSrcHeight; // original source image size
    let imgFitWidth, imgFitHeight, imgFitX, imgFitY; // fitted image size

    ({width: frmCfgWidth, height: frmCfgHeight, sizing} = this._frameSettings);
    if( pos )
      ({w: frmWidth, h: frmHeight, x:frmX, y:frmY} = pos);
    else {
      ({width:frmWidth, height:frmHeight} = this._frameSettings);
      ({x:frmX, y:frmY} = this._calcPosForFrameBySizeAndMargin());
    }

    // image
    ({ width: imgSrcWidth, height: imgSrcHeight } = idat);
    //const filterMargin = this._calculateFilterMargin();

    //console.log(['framesize', frmWidth, frmHeight]);
    //console.log(['frmCfgPos', frmCfgWidth, frmCfgHeight]);
    //console.log(['img', idat]);
    //console.log('sizing: ' + sizing);
    switch( sizing ) {
      case 'mix': {
        ({ w: imgFitWidth, h: imgFitHeight} = this._calcFittedImgSize(imgSrcWidth, imgSrcHeight, frmCfgWidth, frmCfgHeight));
        frmFitWidth = imgFitWidth;
        frmFitHeight = imgFitHeight;
        
        if( frmFitWidth > frmCfgWidth )
          frmFitWidth = frmCfgWidth;
        if( frmFitHeight > frmCfgHeight )
          frmFitHeight = frmCfgHeight;

        ({x:frmX, y:frmY} = this._calcPosForFrameBySizeAndMargin());
        
        ({ x: imgFitX, y: imgFitY } = this._calcAdjustedImgPos(imgFitWidth, imgFitHeight, frmCfgWidth, frmCfgHeight));
        frmFitX = frmX + imgFitX;
        frmFitY = frmY + imgFitY;
        if( imgFitX < 0 ) {
          frmFitX = frmX;
          imgFitX = 0;
        }
        if( imgFitY < 0 ) {
          frmFitY = frmY;
          imgFitY = 0;
        }

        break;
      }
      
      case 'stretch':
        imgFitWidth = imgSrcWidth * scale |0;
        imgFitHeight = imgSrcHeight * scale |0;
        frmFitWidth = imgFitWidth;
        frmFitHeight = imgFitHeight;
        
        ({x:frmX, y:frmY} = this._calcPosForFrameBySizeAndMargin({w: frmFitWidth, h: frmFitHeight}));
        frmFitX = frmX;
        frmFitY = frmY;
        
        ({ x: imgFitX, y: imgFitY } = this._calcAdjustedImgPos(imgFitWidth, imgFitHeight, frmFitWidth, frmFitHeight));
        break;
      
      case 'fixed':
      default:
        ({w:imgFitWidth, h:imgFitHeight} = this._calcFittedImgSize(imgSrcWidth, imgSrcHeight, frmWidth, frmHeight));
        frmFitWidth = frmWidth;
        frmFitHeight = frmHeight;
        frmFitX = frmX;
        frmFitY = frmY;

        ({ x: imgFitX, y: imgFitY } = this._calcAdjustedImgPos(imgFitWidth, imgFitHeight, frmFitWidth, frmFitHeight));
        break;
    }
    
    // create result
    let frame = {
      x: frmFitX,
      y: frmFitY,
      w: frmFitWidth,
      h: frmFitHeight,
    };

    /*let {x: framex, y: framey} = this.calculateFramePositionFromFrameSize(frame.w, frame.h, marginX, marginY); 
    frame.x = framex;
    frame.y = framey;*/
    
    const image = {
      x: imgFitX,
      y: imgFitY,
      w: imgFitWidth,
      h: imgFitHeight,
    };

    const result = { frame, image };
    //console.log(["frame", frame], 'olive');
    //console.log(["image", image], 'olive');
    //console.log(result, '', false);

    return result;
  }
  protected _getParentSize(): { x: number, y: number, w: number, h: number } {
    //console.log(`${this.$L()}_getParentSize`, 'olive', true);
    const parent = this._parent;
    const result = parent?.getFramePos() || {
      w: screen.availWidth,
      h: screen.availHeight,
      x: 0,
      y: 0,
    };
    //console.log(result, '', false);
    return result;
  }
  private _calcPosForFrameBySizeAndMargin(box?: Pick<BoxPosition, "w" | "h">): { x: number, y: number } {
    //console.log(`${this.$L()}calcPosForFrameBySizeAndMargin`, 'olive', true);
    let fwidth = box ? box.w : this._frameSettings.width;
    let fheight = box ? box.h : this._frameSettings.height;
    let marginX = this._frameSettings.offsetX;
    let marginY = this._frameSettings.offsetY;
    
    // calculate position
    const adjust = this.getFrameSettings('adjust');
    let x = 0;
    let y = 0;
    const { h: parentHeight, w: parentWidth } = this._getParentSize();
    switch (adjust) {
      case 'left-center':
        y = (parentHeight - fheight) / 2 | 0;
        break;
      case 'left-bottom':
        y = parentHeight - fheight;
        break;
      case 'center-top':
        x = (parentWidth - fwidth) / 2 | 0;
        break;
      case 'center-center':
        x = (parentWidth - fwidth) / 2 | 0;
        y = (parentHeight - fheight) / 2 | 0;
        break;
      case 'center-bottom':
        x = (parentWidth - fwidth) / 2 | 0;
        y = parentHeight - fheight;
        break;
      case 'right-top':
        x = parentWidth - fwidth | 0;
        break;
      case 'right-center':
        x = parentWidth - fwidth | 0;
        y = (parentHeight - fheight) / 2 | 0;
        break;
      case 'right-bottom':
        x = parentWidth - fwidth | 0;
        y = parentHeight - fheight;
        break;
      case 'left-top':
      default:
        break;
    }

    const result = {
      x: x + marginX,
      y: y + marginY,
    };
    //console.log(result,'', false);

    return result;
  }
  changeFramePosition(pos: BoxPosition) {
    console.log(`${this.$L()}changeFramePosition`, 'olive');
    //const margin = this._calculateFrameMargin(pos);
    //this._frameSettings.offsetX = margin.x;
    //this._frameSettings.offsetY = margin.y;
    //this._frameSettings.width = pos.w;
    //this._frameSettings.height = pos.h;
    this.resizeFrame(pos.w, pos.h);
    this.moveFrame(pos.x, pos.y);
  }
  updateSize(pos?: Pick<BoxPosition, "w" | "h">) {
    console.log(`${this.$L()}updateSize`, 'olive');
    pos ??= this._framePos;
    this._frameSettings.width = pos.w;
    this._frameSettings.height = pos.h;
  }
  updateMargin(pos?: BoxPosition) {
    console.log(`${this.$L()}updateMargin`, 'olive', true);
    //const { w, h } = pos || this._framePos;
    const { x, y } = this._calculateFrameMargin(pos);
    //this.setFrameSettings({'offsetX': x, 'offsetY': y/*, width:w, height: h*/});
    this._frameSettings.offsetX = x;
    this._frameSettings.offsetY = y;
    //console.log({x, y});
  }
  updateMarginBy(xdif:number, ydif:number) {
    console.log(`${this.$L()}updateMarginBy`, 'olive');
    this._frameSettings.offsetX += xdif;
    this._frameSettings.offsetY += ydif;
  }
  private _calculateFrameMargin(pos?: BoxPosition): XYPos {
    console.log(`${this.$L()}_calculateFrameMargin`, 'olive', true);
    const adjust = this.getFrameSettings('adjust');

    // calculate position
    const { h: parentHeight, w: parentWidth } = this._getParentSize();
    const {x, y, w, h} = pos || this._framePos;
    //console.log(adjust);
    let xMargin = x;
    let yMargin = y;

    switch (adjust) {
      case 'left-center':
        yMargin = y - Math.floor((parentHeight - h) / 2);
        break;
      case 'left-bottom':
        yMargin = y - (parentHeight - h);
        break;

      case 'center-top':
        xMargin = x - Math.floor((parentWidth - w) / 2);
        break;
      case 'center-center':
        xMargin = x - Math.floor((parentWidth - w) / 2);
        yMargin = y - Math.floor((parentHeight - h) / 2);
        break;
      case 'center-bottom':
        xMargin = x - Math.floor((parentWidth - w) / 2);
        yMargin = y - (parentHeight - h);
        break;

      case 'right-top':
        xMargin = x - (parentWidth - w)
        break;
      case 'right-center':
        xMargin = x - (parentWidth - w);
        yMargin = y - Math.floor((parentHeight - h) / 2);
        break;
      case 'right-bottom':
        xMargin = x - (parentWidth - w);
        yMargin = y - (parentHeight - h);
        break;

      case 'left-top':
      default:
        break;
    }

    const result = {
      x: xMargin,
      y: yMargin,
    };
    //console.log(result, "", false);
    return result;
  }

  _calcFittedImgSize(srcWidth: number, srcHeight: number, destWidth: number, destHeight: number) {
    //console.log(`${this.$L()}_calcFittedImgSize`, 'olive', true);
    const {shrink, expand, adjust, scale} = this._imageSettings;
    
    var wRatio = destWidth / srcWidth;
    var hRatio = destHeight / srcHeight;
    var w, h;
    let toScale = scale;
    //console.log(shrink)
    //console.log([srcWidth, srcHeight, destWidth, destHeight]);
    switch (shrink) {
      case 'shorter':
        toScale = Math.max(wRatio, hRatio);
        break;
      case 'width':
        toScale = wRatio;
        break;
      case 'height':
        toScale = hRatio;
        break;
      case 'none':
        // scaled size
        break;
      
      // fit the entire image into the frame by default 
      case 'longer':
      default:
        toScale = Math.min(wRatio, hRatio);
        break;
    }

    // do not expand the image if expand flag is false
    if( toScale > 1 && !expand && shrink !== 'none' )
      toScale = 1;

    w = srcWidth * toScale | 0;
    h = srcHeight * toScale | 0;
    const result = { w, h };
    //console.log(result, '', false);
    return result;
  }
  _calcAdjustedImgPos(w: number, h: number, destWidth: number, destHeight: number) {
    //console.log(`${this.$L()}_calcAdjustedImgPos`, 'olive');
    const {adjust} = this._imageSettings;
    const [xadjust, yadjust] = adjust.split('-');
    let x = 0, y = 0;
    switch (xadjust) {
      case 'center':
        x = (destWidth - w) / 2 | 0;
        break;
      case 'right':
        x = destWidth - w;
        break;
      case 'left':
        break;
    }
    switch (yadjust) {
      case 'center':
        y = (destHeight - h) / 2 | 0;
        break;
      case 'bottom':
        y = destHeight - h;
        break;
      case 'top':
        break;
    }

    const result = { x, y };
    //console.log(result);
    return result;
  }

  // some static filters affect element's offset size
  private _calculateFilterMargin() {
    const {glow, shadow, /*rotation,*/ matrix, border: dropshadow} = this._filterSettings;
    let left = 0, top = 0, bottom = 0, right = 0;
    
    if( glow ) {
      left = 2;
      right = 2;
      top = 2;
      bottom = 2;
    }

    return {
      left,
      top,
      bottom,
      right,
      
      width: left + right,
      height: top + bottom,
    };
  };

  updateCurrentPosition(forced = false) {
    //console.log(`${this.$L()}updateCurrentPosition ${forced}`, 'olive');

    const fpos = this._framePos;
    const fposp = this._prevFramePos;
    const ipos = this._imagePos;
    const iposp = this._prevImagePos;
    
    const frameUpdated = fpos.updated && ( fpos.x !== fposp.x || fpos.y !== fposp.y || fpos.w !== fposp.w || fpos.h !== fposp.h );
    const imageUpdated = ipos.updated && ( ipos.x !== iposp.x || ipos.y !== iposp.y || ipos.w !== iposp.w || ipos.h !== iposp.h );
    
    // calculate current frame and image position
    if ( forced || frameUpdated || imageUpdated ) {
      const size = this._calcSizeForFrameAndImage();
      this._imagePos = { ...size.image, updated: false }
      this._prevImagePos = { ...size.image };
      this._framePos = { ...size.frame, updated: false }
      this._prevFramePos = { ...size.frame };
    }

    fpos.updated = false;
    ipos.updated = false;
  }
  getFrameBoxFromSetting() {
    const pos = this._calcPosForFrameBySizeAndMargin();
    return {
      w: this._frameSettings.width,
      h: this._frameSettings.height,
      x: pos.x,
      y: pos.y,
    };
  }
  // OPTIMIZE:
  getFramePos(): BoxPosition {
    //this.updateCurrentPosition(true);
    //return this._framePos;
    const size = this._calcSizeForFrameAndImage();
    const regsize = this._regulateFrameCoordinates(size.frame);
    //const result = this._calculateFilteredFrameSize(regsize);
    return regsize;
  }
  // OPTIMIZE:
  getImagePos(): BoxPosition {
    //this.updateCurrentPosition(true);
    //return this._imagePos;
    const fpos = this.getFramePos();
    const size = this._calcSizeForFrameAndImage(undefined, fpos).image;
    const imgpos = this._calcAdjustedImgPos(size.w, size.h, fpos.w, fpos.h);
    return {
      x: imgpos.x,
      y: imgpos.y,
      w: size.w,
      h: size.h,
    };
  }
  resizeFrame(w: number, h: number, dummy = false, fireEv = true) {
    console.log(`${this.$L()}resizeFrame ${[w,h]}`, 'olive');
    if( this._framePos.w !== w || this._framePos.h !== h ) {
      if( w < MinimumFrameSize )
        w = MinimumFrameSize;
      if( h < MinimumFrameSize )
        h = MinimumFrameSize;
      this._framePos.w = w;
      this._framePos.h = h;
      this._framePos.updated = true;
      //this._frameSettings.width = w;
      //this._frameSettings.height = h;
      //const margin = this._calculateFrameMargin(this._framePos);
      //this._frameSettings.offsetX = margin.x;
      //this._frameSettings.offsetY = margin.y;
      //this._fireModelEvent('change-frame-settings', {width:w, height:h});
      if( fireEv )
        this._fireModelEvent('change-frame-size', w, h);
    }
  }
  moveFrame(x: number, y: number, diff = false, fireEv = true) {
    console.log(`${this.$L()}moveFrame ${[x,y]}`, 'olive');
    x = x |0;
    y = y |0;
    if( diff && (x||y) || !diff && (this._framePos.x !== x || this._framePos.y !== y) ) {
      this._framePos.x = diff ? this._framePos.x += x : x;
      this._framePos.y = diff ? this._framePos.y += y : y;
      this._framePos.updated = true;

      //const margin = this._calculateFrameMargin(this._framePos);
      //this._frameSettings.offsetX = margin.x;
      //this._frameSettings.offsetY = margin.y;
      //this._fireModelEvent('change-frame-settings', {offsetX: margin.x, offsetY: margin.y});
      if( fireEv )
        this._fireModelEvent('change-frame-position', this._framePos.x, this._framePos.y);
    }
  }
  resizeImage(w: number, h: number) {
    console.log(`${this.$L()}resizeImage ${[w,h]}`, 'olive');
    w = w |0;
    h = h |0;
    if( this._imagePos.w !== w || this._imagePos.h !== h ) {
      this._imagePos.w = w;
      this._imagePos.h = h;
      this._imagePos.updated = true;
      this._fireModelEvent('change-image-size', w, h);
    }
  }
  moveImage(x: number, y: number) {
    console.log(`${this.$L()}moveImage ${[x, y]}`, 'olive');
    if( this._imagePos.x !== x || this._imagePos.y !== y ) {
      this._imagePos.x = x;
      this._imagePos.y = y;
      this._imagePos.updated = true;
      this._fireModelEvent('change-image-position', x, y);
    }
  }
  getMatrixedImageSize(w: number, h: number, deg: number) {
    const deg2rad = Math.PI * 2 / 360;
    const rad = deg * deg2rad;
    const mw = w * Math.cos(rad) + h * Math.sin(rad) |0;
    const mh = h * Math.cos(rad) + w * Math.sin(rad) |0;

    console.log([w, h, "=>", mw, mh], "red");

    return {w: mw, h: mh};
  }

  isPinned() {
    return this._miscSettings.pinned || this._parent?.getMiscSettings('pinned');
  }

  protected _modelEventListeners: ModelEventListeners = {};
  /**
   * fire events
   * @param {string} handler
   */
  protected _fireModelEvent<T extends keyof ModelEventHandlers>(handler: T, ...args: Parameters<ModelEventHandlers[T]>) {
    console.log(`${this.$L()}fireModelEvent: ${handler} (${args})`, 'olive');
    for( const ename in this._modelEventListeners ) {
      if( ename !== handler )
        continue;
      const listeners = this._modelEventListeners[ename as T];
      for( const id in listeners ) {
        listeners[Number(id)](...args);
      }
    }

    // fire settings-changed event
    if( /^change-(frame|image|filter|slideshow|misc|picture|element|window|root)-settings|^change-frame-(position|size)/.test(handler) ) {
      this._fireModelEvent('settings-changed', handler);
    }
  }
  private _listenerIdCounter = 0;
  /**
   * set model event listeners
   */
  addModelEvent<T extends keyof ModelEventHandlers>(handler: T, listener: ModelEventHandlers[T]) {
    this._modelEventListeners[handler] = this._modelEventListeners[handler] || {};
    const listeners: ModelEventListeners[ModelEventNames] = this._modelEventListeners[handler]!;
    listeners[this._listenerIdCounter] = listener;
    return this._listenerIdCounter++;
  }
  removeModelEvent<T extends keyof ModelEventHandlers>(handler: T, listenerId: number) {
    const listeners = this._modelEventListeners[handler] = this._modelEventListeners[handler]!;
    if( listeners[listenerId] ) {
      delete listeners[listenerId];
      return true;
    }
    return false;
  }
  fireAllSettingEvents() {
    console.log(`${this.$L()}fireAllSettingEvents`, 'olive');
    this._fireModelEvent('change-frame-settings', this._frameSettings);
    this._fireModelEvent('change-image-settings', this._imageSettings);
    this._fireModelEvent('change-misc-settings', this._miscSettings);
    this._fireModelEvent('change-name', this._name);
  }
  
  getName(escape = false) {
    let name = this._name;
    if( escape ) {
      name = escapeHTML(name);
    }
    return name;
  }
  setName(name: string) {
    this._name = name;
    this._fireModelEvent('change-name', name);
  }
  getSettings(): FrameSettingsJSON {
    // update slideshow index setting
    this._slideshowSettings.index = this._list.getIndex();
    
    return {
      name: this._name,
      //box: this._framePos,
      frame: this._frameSettings,
      image: this._imageSettings,
      filter: this._filterSettings,
      slide: this._slideshowSettings,
      misc: this._miscSettings,
      ...this._pictureFrame ? {picframe: this._pictureFrame} : {},

      playlist: this._list.getArray(),
    };
  }
  toJsonText(): string {
    return JSON.stringify(this.getSettings(), null, 2);
  }

  private static _defaultSettings: DefaultFrameSettingsJSON | null = null;
  copyModelSettings(): FrameSettingsJSON {
    const model = this;
    return {
      name: '',
      frame: {...model._frameSettings},
      image: {...model._imageSettings},
      filter: {...model._filterSettings},
      slide: {...model._slideshowSettings},
      misc: {...model._miscSettings},
      playlist: [],
      picframe: model._pictureFrame? {...model._pictureFrame} : undefined,
    };
  }
  setDefaultSettingsByModel(model: _ModelBase) {
    _ModelBase._defaultSettings = model.copyModelSettings();
  }
  getDefaultSettings() {
    return _ModelBase._defaultSettings;
  }
  removeDefaultSettings() {
    _ModelBase._defaultSettings = null;
  }

  protected $L() {
    return `[${this.getUniqueId()}]ModelBase#`;
  }
  dispose() {
    if( this._disposed )
      return;
    this._disposed = true;
    // detach all model events
    // stop interval timers
    for( const ename in this._modelEventListeners ) {
      delete this._modelEventListeners[ename as ModelEventNames];
    }
    clearTimeout(this._slideShowTimeoutId);
    clearTimeout(this._timeoutIdForLoading);
  }
}




function getTimeAdjustedDelay(delay: number, gap: number = 0) {
  const time = new Date().getTime();
  let remain = time % delay;
  if( Math.abs(delay - remain) < 100 )
    remain = 0;

  delay = delay - remain + gap;
  return delay;
}



