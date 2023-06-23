import { _ModelBase } from "src/model/model-base";
import { _ViewBase } from "src/view/view-_base";

import { ResizableBorder, MovedCoordinates, ResizableBorderTypes } from "../utils/resizable-border";
import * as FileSystem from "../utils/filesystem";

import WallpaperInfo from "../utils/wallpaper-info";
import { ViewRoot } from "src/view/view-window-root";
import { ViewChild } from "src/view/view-window-child";
import { ViewElement } from "src/view/view-element";

import { ImgInfo } from "src/model/img-database";
import { BoxPosition } from "src/model/data-types";

import { _CtrlWindow } from "./ctrl-window-_base";
import { ModelWindow } from "src/model/model-window";
import { ModelRoot } from "src/model/model-root";
import { ModelElement } from "src/model/model-element";
import { CtrlRoot } from "./ctrl-window-root";
import HtaContextMenu from "hta-ctx-menu";
import { OverlayControl } from "src/utils/overlay-control";
import { EventAttacher } from "src/utils/utils";








const TooLargeImagePixels = 4000 * 2000;
const TooLargeTotalHQImagePixels = 1024 * 768 * 20;

export type InfoTypes = 'info' | 'alert' | 'warn';

export abstract class _CtrlBase {
  protected abstract _model: ModelElement | ModelWindow | ModelRoot;
  protected abstract _view: ViewRoot | ViewChild | ViewElement;
  protected _resizableBorder!: ResizableBorder;
  protected _startingOverlay!: OverlayControl;
  protected _dragging = false;
  protected _preparedFramePos: BoxPosition | null = null;
  protected _pinned = false;
  
  // HACK: when this public flag is true, the frame size is set to the first loaded image's size. for drag & dropped images.
  __fitFrameToFirstImage = false;

  protected abstract _viewEva: EventAttacher;
  protected abstract _parentCtrl: _CtrlWindow | CtrlRoot | null;
  protected abstract $L(): string;

  protected _wallpaperData?: typeof WallpaperInfo.Types.WallPaperData | null;

  abstract getCtxMenuParameter(ctx: _CtrlBase): HtaContextMenu["Types"]["MenuItemParameterOrNull"][]
  abstract isHighlightEffectEnabled(): boolean;
  
  constructor() {
  }

  protected _initializeBase() {
    this._attachResizableBorder();
    
    this._setModelEvents();
    //this._createDefaultCommandElements();
    this._createStartingOverlay();
    
    // initialize frame view
    let pos;
    pos = this._model.getFramePos();
    this._view.resizeViewFrame(pos.w, pos.h);
    this._view.moveViewFrame(pos.x, pos.y);
    this._view.setHighlightEffects(this.isHighlightEffectEnabled());
  }

  private _setModelEvents() {
    this._model.addModelEvent(`before-load`, (imgInfo, fsize, isize) => {
      if( !this._dragging )
        this._prepareToLoadSlide(imgInfo, fsize, isize);
    });
    this._model.addModelEvent(`load`, (imgInfo, fsize, isize) => {
      this.info(`load: ${imgInfo.path}`);
      if( !this._dragging ) {
        //this.loadSlide(imgInfo, fsize, isize);
        this.updateFrame();
        this._view.play();
      }
      else {
        console.log('dragging', 'red');
      }
    });
    this._model.addModelEvent(`load-error`, (imgInfo) => {
      this.info(`load error: ${imgInfo.path}`, 'alert');
    });

    this._model.addModelEvent(`slide-start`, () => {
      this.info(`slideshow started`);
    });
    this._model.addModelEvent(`slide-stop`, () => {
      this.info(`slideshow stopped`);
    });


    this._model.addModelEvent(`change-image-settings`, (param) => {
      //this.updateFrame2();
      if( param.quality ) {
        this._setBalancedViewImageQuality();
        //this._view.setImageQuality(param.quality);
      }

      this._model.updateCurrentPosition(true);
      this.updateFrame();
    });
    this._model.addModelEvent('change-image-size', (w: number, h: number) => {
      if( !this._dragging )
        this._view.resizeViewImage(w, h);
    });
    this._model.addModelEvent('change-image-position', (x: number, y: number) => {
      if( !this._dragging )
        this._view.moveViewImage(x, y);
    });
    this._model.addModelEvent(`change-frame-settings`, (param) => {
      if( typeof param.adjust !== 'undefined' ) {
        this._view.updateBasePositionArrowIcon(param.adjust);
        this._model.updateCurrentPosition(true);
      }
      this.updateFrame();
    });
    this._model.addModelEvent(`change-misc-settings`, (param) => {
      if( typeof param.pinned === 'boolean' ) {
        if( this._pinned !== param.pinned ) {
          this._setPinned(param.pinned);
          if( this._model instanceof ModelElement ) {
            this._model.updateZIndex();
          }
        }
      }
    });

    this._model.addModelEvent('change-frame-size', (w: number, h: number) => {
      if( !this._dragging ) {
        this._view.resizeViewFrame(w, h);
      }
    });
    this._model.addModelEvent('change-frame-position', (x: number, y: number) => {
      if( !this._dragging )
        this._view.moveViewFrame(x, y);
    });
    this._model.addModelEvent('change-slideshow-settings', (param) => {
    });
    this._model.addModelEvent('change-filter-settings', (changed, all) => {
      this._view.setFilters(all);
      console.log(changed)
      this.updateFrame();
    });
    this._model.addModelEvent('load-shape', (img, shape) => {
      if( img.success ) {
        this._view.setFilters(this._model.getAllFilterSettings());
        this.updateFrame();
      }
      else
        this.info(`shape-load error: ${img.path}`, 'alert');
    });
    
    this._model.addModelEvent('change-name', (name: string) => {
      this._setName(name);
    });
  }

  start() {
    this.refreshAllSettings();
    
    if( this._model.getSlideshowSettings('status') !== 'stop' )
      this.getModel().startSlideShow();
  }
  public refreshAllSettings() {
    console.log(`${this.$L()}refreshAllSettings`, 'green');
    // filter
    const all = this._model.getAllFilterSettings();
    this._model.setFilterSettings(all);
    this._view.setFilters(all);
    
    this._model.fireAllSettingEvents();

    /*
    const shape = this._model.getFilterSettings('shape')
    this._model.getShapeData(shape, (img) => {
      if( img.success ) {
        const fpos = this._model.getFramePos();
        const ipos = this._model.getImagePos();
        this._view.applyShape(fpos, ipos, img);
      }
    });
    */

    this.updateFrame();
  }

  protected abstract _DefaultCommands:
    {
      label: string
      onclick?: (ev: MSEventObj) => any
      style?: string
    }[];
  protected _createStartingOverlay() {
    let target = this._view.getContainer() as HTMLElement;
    //if (target.nodeType !== 1)// @ts-ignore
    //  target = target.body
    
    const ul = this._view.getCommandElement();
    const doc = ul.ownerDocument;
    const commands = this._DefaultCommands;
    const html = [`<ul style="
      overflow: hidden;
      padding: 0px;
      margin: 0px 0px 10% 0px;
      line-height: 120%;
      LIST-STYLE-TYPE: none;
      color: white;
      font-weight: bolder;
      font-size: expression((this.parentNode.offsetWidth/15|0) + 'px');
    ">`, ];
    for( let i= 0; i < commands.length; i++ ) {
      const item = commands[i];
      if( !item )
        break;
      html.push(`<li id="startingcommands_${this._model.getUniqueId()}_${i}" style="display:inline; cursor:pointer; ${item.style || ''}">${item.label}</li><br>`);
    }
    html.push('</ul>');
    
    this._startingOverlay = new OverlayControl(target, {
      zIndex: 1000,
      delay: 5000,
      locked: true,
      alpha: 90,
      filter: 'Glow(Strength=3, color=black)',
      controls: {
        init: {
          width: '100%',
          height: '100%',
          left: '0px',
          top: '0px',
          content: `<table style="width:100%; height: 100%;"><tr><td style="text-align:center; vertical-align:bottom;">${html.join('')}</td></tr></table>`,
          onclick: (ev: MSEventObj) => {
            const node = ev.srcElement as HTMLElement;
            if( node.nodeName !== 'LI' )
              return;
            for( let i= 0; i < commands.length; i++ ) {
              if( node.id === `startingcommands_${this._model.getUniqueId()}_${i}` ) {
                commands[i]?.onclick?.(ev);
              }
            }
          }
        }
      }
    });
  }

  private _attachResizableBorder() {
    let resizeTarg = this._view.getContainer() as HTMLElement;
    if (resizeTarg.nodeType !== 1)// @ts-ignore
      resizeTarg = resizeTarg.body

    this._resizableBorder = new ResizableBorder(resizeTarg, {
      snap: 10,
      zIndex: 100000,
      //snapTargets: this.getResizableTargets(),
      ondragstart: (ev: MSEventObj, pos: MovedCoordinates, type: ResizableBorderTypes) => this._onDragStart(ev, pos, type),
      ondragmove: (ev: MSEventObj, pos: MovedCoordinates, type: ResizableBorderTypes) => this._onDragMove(ev, pos, type),
      ondragend: (ev?: MSEventObj, pos?: MovedCoordinates, type?: ResizableBorderTypes) => {
        console.log(`${this.$L()}ondragend`, 'green');
        return this._onDragEnd(ev, pos, type);
      }
    });

    this.putResizableTarget(this._resizableBorder);
  }
  protected _onDragStart(ev: MSEventObj, pos: MovedCoordinates, type: ResizableBorderTypes): boolean | undefined {
    console.log(`${this.$L()}_onDragStart`, 'green');
    if( ev.ctrlKey && this instanceof CtrlRoot !== true || this._model.isPinned() ) {
      return false;
    }
    
    this._prepareForDragging();
    this._prepareForSnapTargets(type !== 'move');
    //this._view.getFramePos();
    this._dragging = true;
  }
  protected _onDragMove(ev: MSEventObj, pos: MovedCoordinates, type: ResizableBorderTypes) {
    this.resizeAndMoveViewFrameByMovedCoordinates(pos);
    this._setWallPaper();
  }
  protected _onDragEnd(ev?: MSEventObj, pos?: MovedCoordinates, type?: ResizableBorderTypes) {
    console.log(`${this.$L()}_onDragEnd`, 'green');
    if( pos ) {
      this.resizeAndMoveViewFrameByMovedCoordinates(pos);
    }
    this._setWallPaper();
    
    // get final coordinates from current view
    const viewpos = this._view.getViewFramePos();
    let { w, h, x, y } = viewpos;

    const { w:prepw, h:preph, x:prepx, y: prepy } = this._preparedFramePos!;
    const resized = prepw !== w || preph !== h;
    const moved = x !== prepx || y !== prepy;

    // changed width or height
    if( resized ) {
      const sizing = this._model.getFrameSettings('sizing');
      //this._model.setFrameSettings({'width': w, 'height':h, sizing: sizing === 'stretch' ? 'fixed' : sizing}, false);
      if( sizing === 'stretch' ) 
        this._model.setFrameSettings({sizing: 'fixed'}, false);

      // decide model frame coordinates
      this._model.resizeFrame(w, h);
      this._model.updateSize(viewpos);
      this._model.updateMargin(viewpos);
    }


    if( moved ) {
      this._model.moveFrame(x, y);
      this._model.updateMargin(viewpos);
      //this._model.updateMarginBy(x - prepx, y - prepy);
    }
    //this._model.changeFramePosition(viewpos);

    if( this instanceof _CtrlWindow ) {
      // change children's position
      if( resized && pos ) {
        //alert([pos.resizedX, pos.resizedY]), true, true
        //this.moveChildElements(-pos.resizedX, -pos.resizedY, true);
        this.calculateMovedMarginForChildElements(pos);
      }
    }

    this._dragging = false;
    //if( this._draggingImgInfo === this._model.getImgInfo() && )
    //this._model.updateCurrentFrameMargin();

    this.updateFrame();
  }

  protected _prepareForDragging() {
    this._preparedFramePos = this._view.getViewFramePos();
  }
  protected _prepareForSnapTargets(resizingFlag = false) {
    this._resizableBorder.setSnapTarget(this.getResizableTargets(resizingFlag));
  }

  // NOTE: change only view frame.
  resizeAndMoveViewFrameByMovedCoordinates(pos: MovedCoordinates, startpos?: BoxPosition) {
    let { resizedX, resizedY, resizedW, resizedH, movedX, movedY, snappedX, snappedY, startH, startW, startX, startY } = pos;
    let {w, h, x, y} = this._view.getViewFramePos();
    const start = startpos || this._preparedFramePos!;

    //console.log(pos, "red");
    try {
      if( resizedW )
        w = Math.max(32, start.w + (resizedX ? resizedW + snappedX * -1 : resizedW + snappedX));
      if( resizedH )
        h = Math.max(32, start.h + (resizedY ? resizedH + snappedY * -1 : resizedH + snappedY));
      this._view.resizeViewFrame(w, h);
    
      if(resizedX)
        x = Math.min(start.x+start.w - 32, start.x + resizedX + snappedX);
      if(resizedY)
        y = Math.min(start.y+start.h - 32, start.y + resizedY + snappedY);
      this._view.moveViewFrame(x, y);

      //console.log({x, y, w, h}, "lime");
    } catch (e: any) {
      console.log(e.message, 'red');
    }

    try {
      if (movedX)
        x = start.x + movedX + snappedX;
      if (movedY)
        y = start.y + movedY + snappedY;
      this._view.moveViewFrame(x, y);
    } catch (e: any) {
      console.log(e.message, 'red');
    }

    return {
      w,
      h,
      x,
      y,
    };
  }
  protected _setPinned(pinned: boolean) {
    this._pinned = pinned;
    if( pinned ) {
      this._resizableBorder.setDraggable(false);
      this._resizableBorder.setResizable(false);
      this._view.showBorder(false);
    }
    else {
      this._resizableBorder.setDraggable(true);
      this._resizableBorder.setResizable(true);
    }
  }
  disableMouseEvents() {
    this._resizableBorder.setDraggable(false);
    this._resizableBorder.setResizable(false);
  }
  recoverMouseEvents() {
    const flag = this._model.getMiscSettings('pinned');
    const stopResizing = this._model.getMiscSettings('disableResizing');
    this._resizableBorder.setDraggable(!flag);
    this._resizableBorder.setResizable(!flag && !stopResizing);
  }
  public isPinned() {
    return this._model.isPinned();
  }




  private _prepareToLoadSlide(idat: ImgInfo, frame:BoxPosition, image:BoxPosition) {
    if( this._model.getFilterSettings('trans') === 'RevealTrans' ) {
      const all = this._model.getAllFilterSettings();
      this._view.setFilters(all);
    }
    this._view.applyTrans(frame);

    this._setBalancedViewImageQuality(idat);
  }
  /*
  loadSlide(idat: ImgInfo, frame:BoxPosition, image:BoxPosition) {
    console.log(`${this.$L()}loadSlide`, 'green');
    const model = this._model;

    //let { path, width: w, height: h } = idat;
    console.log([image.w, image.h, image.x, image.y], 'purple');
    //console.log([idat.width, idat.height]);
    if( model instanceof ModelElement ) {
      this.getView().showTitle( !idat.success );
    }

    this._view.load(idat.path);
    if( this.__fitFrameToFirstImage ) {
      this.__fitFrameToFirstImage = false;
      this._model.resizeFrame(image.w, image.h);
      this._model.moveImage(0, 0);
    }
    this._view.play();

    this._setWallPaper();
  }
  */
  updateFrame() {
    console.log(`${this.$L()}updateFrame`, 'green');
    const idat = this._model.getImgInfo(true)!;
    const fpos = this._model.getFramePos();
    const ipos = this._model.getImagePos();
    //console.log(ipos)
    
    this._view.applyShape(fpos, ipos, this._model.getShapeData(), this._model.getPictureFrame());
    
    this._view.moveViewFrame(fpos.x, fpos.y);
    this._view.resizeViewFrame(fpos.w, fpos.h);

    if( idat.success ) {
      this._view.load(idat.path);
      this._view.showTitle(false);
      this._view.showError(false);

      this._parentCtrl?.checkLeakedMemoryLimit(this, idat);
    }
    else {
      this._view.load(idat.path);
      if( this._model.isBlank() ) {
        this._view.showTitle(true);
        this._view.showError(false);
      }
      else {
        if( idat.status !== 'UNINITIALIZED' ) {
          this._view.showError(true, idat.path);
          console.log(idat.path, "red");
        }
        this._view.showTitle(false);
      }
    }
    //console.log(idat);
    this._view.moveViewImage(ipos.x, ipos.y);
    this._view.resizeViewImage(ipos.w, ipos.h);
  }

  protected _setBalancedViewImageQuality(idat?: ImgInfo) {
    console.log(`${this.$L()}_setBalancedViewImageQuality`, 'green');
    let q = this._model.getImageSettings('quality');
    
    if( !idat ) {
      idat = this._model.getImgInfo() || undefined;
    }
    
    // decide image quality by scale
    if( q === 'balanced' ) {
      if( !idat )
        q = 'medium';
      else {
        const {path, width, height} = idat;
        const {w:destW, h:destH} = this._view.getViewFramePos();
        const rate = Math.min(destW / width, destH / height);

        const size = width * height;
        const totalHQSize = this._parentCtrl?.getTotalHQImagePixel() || 0; // OPTIMIZE: should cache the size
        // frame is larger than image
        if( rate >= 1 ) {
          if( /\.gif(\?[^/]*)?$/i.test(path) ) // always use low for GIFs
            q = 'low';
          else
            q = 'medium';
        }
        // frame is smaller than image
        else if( rate >= 0.65 || /\.gif(\?[^/]*)?$/i.test(path) || size > TooLargeImagePixels || totalHQSize > TooLargeTotalHQImagePixels ) {// use ms-interpolation
          q = 'medium';
        }
        else {
          q = 'high';
        }
      }
    }

    //const useAIL = this._model.getImageSettings('alphaimage') && /\.png$/i.test(idat.path);
    this._view.setImageQuality(q);
  }

  //protected abstract stopSlideShow(): void;
  getModel() {
    return this._model;
  }
  getView() {
    return this._view;
  }

  updateView() {
  }



  protected _setName(name?: string) {
    this._view.setName(name || '');
  }

  protected _setWallPaper() {
    // only works on CtrlWindow
  }
  putResizableTarget(targ: ResizableBorder) {
  }
  getResizableTargets(resizingFlag?: boolean): ResizableBorder[] {
    return [];
  }
  getResizableBorder() {
    return this._resizableBorder;
  }

  openPlaylistEditor() {
    const args = {
      list: this._model.getList().getArray(),
      index: this._model.getList().getIndex(),
      fs: FileSystem,
    };
    const result = window.showModalDialog('html/playlist-editor.hta', args, `resizable:1; center:0; status:0; scroll:0;`);
    if( result ) {
      this._model.createNewList(result);
      this._model.load();
      this.updateFrame();
    }
  }

  
  protected info(message: string, type?: InfoTypes) {
  }
  checkLeakedMemoryLimit(item:_CtrlBase, idat:ImgInfo) {}
  
  //TODO
  close() {
    this._startingOverlay.dispose();
    this.getModel().stopSlideShow();
    this._parentCtrl?.removeResizableTarget(this._resizableBorder);
    this._viewEva.dispose();
    this._view.dispose();
    this._model.dispose();
  }
}
