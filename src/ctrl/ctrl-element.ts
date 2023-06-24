import { _ModelBase } from "../model/model-base";
import { InfoTypes, _CtrlBase } from "./ctrl-_base";

import { EventAttacher, escapeHTML } from "../utils/utils";
import { ViewElement } from "src/view/view-element";
import { _CtrlWindow } from "./ctrl-window-_base";
import { ModelElement } from "src/model/model-element";
import { ModelWindow } from "src/model/model-window";
import { OverlayControl } from "src/utils/overlay-control";

import { MovedCoordinates, ResizableBorder, ResizableBorderTypes } from "src/utils/resizable-border";
import { ImgInfo } from "src/model/img-database";
import HtaContextMenu from "hta-ctx-menu";
import { getElementCtxMenuParameter } from "./context-menu";
import { $t } from "../i18n/i18n";
import * as fs from "../utils/filesystem";


/**
 * element type frame is a DOM element
 * @export
 * @class CtrlElement
 * @extends {_CtrlBase}
 */
export class CtrlElement extends _CtrlBase {
  protected _model: ModelElement;
  protected _view: ViewElement;
  protected _parentCtrl: _CtrlWindow;

  protected _viewEva: EventAttacher;

  private _overlayCTRL!: OverlayControl;
  private _overlayEnabled = true;
  private _selected = false;
  private _isPlaylistEmpty = true;

  constructor(parentCtrl: _CtrlWindow, model?: ModelElement) {
    super();
    this._model = model || new ModelElement(parentCtrl.getModel() as ModelWindow);
    this._view = new ViewElement(this._model.getUniqueId(), parentCtrl.getView().getDoc());
    this._parentCtrl = parentCtrl;
    
    const doc = this._view.getTargetDocument();
    const element = this._view.getContainer();
    this._viewEva = new EventAttacher(element, this);

    this._initializeBase();
    this._setElementEvents();
    
    this._createOverlayControls();

    // initialize image view
    //this._view.setImageQuality(this._model.getImageSettings('quality'));
    let pos;
    pos = this._model.getImagePos();
    this._view.resizeViewImage(pos.w, pos.h);
    this._view.moveViewImage(pos.x, pos.y);
    //this._view.setZIndex(this._model.getZIndex());

    this.start();
  }

  private _setElementEvents() {
    // contextmenu
    this._viewEva.attach('oncontextmenu', (ev: MSEventObj) => {
      //if( this._model.getParent().getMiscSettings('pinned') ) {
      if( !this._parentCtrl.isSelectingElements() ) {
        return;
      }
      console.log(`${this.$L()}oncontextmenu`, 'green');
      this._parentCtrl.getCtxMenu().open(ev.screenX, ev.screenY, this, this._view.getTargetDocument().parentWindow as MSWindowModeless);
      ev.cancelBubble = true;
    });

    
    this._model.addModelEvent(`change-element-settings`, (param) => {
      // set z-index
      if( typeof param.zIndex === 'number' ) { 
        this._view.setZIndex(param.zIndex, this._model.getMiscSettings('pinned'));
      }
      // overlay disabled
      if( typeof param.disableOverlay !== 'undefined' ) {
        this._setOverlayCTRLVisibility();
      }
      // overlay locked
      if( typeof param.overlayLocked !== 'undefined' ) {
        this._overlayCTRL.lock(param.overlayLocked);
        this._setOverlayCTRLVisibility();
      }
      //console.log([this._overlayCTRL.isLocked(), this._overlayCTRL.isDisabled()]);
    });

    this._model.addModelEvent(`slide-start`, () => {
      this._updateOverlayCTRL();
      //this._overlayCTRL.showBriefly();
    });
    this._model.addModelEvent(`slide-stop`, () => {
      this._updateOverlayCTRL();
      this._overlayCTRL.showBriefly();
    });

    this._model.addModelEvent('playlist-update', (length) => {
      if( length === 0 ) {
        // empty
        if( !this._isPlaylistEmpty ) {
          this._isPlaylistEmpty = true;
          this._startingOverlay.disable(false);
        }
        this._view.bringBGElementToFront(true);
      }
      else {
        if( this._isPlaylistEmpty ) {
          this._isPlaylistEmpty = false;
          this._startingOverlay.disable(true);
          this._view.bringBGElementToFront(false);
        }
      }
      this._setOverlayCTRLVisibility();
      this.updateHighlightVisibility();
    });


    this._viewEva.attach('onmousedown', (ev) => {
      console.log(`${this.$L()}onmousedown button:${ev.button}`, 'green');
      DEV:
      if( ev.button === 4 ) {
        if( ev.ctrlKey ) {
          console.log(this._view.getContainer().outerHTML);
        }
      }

      // NOTE: _onMouseDown with button=1 is fired from _onDragStart
      if( ev.button === 2 ) {
        if( !this._parentCtrl.isPinned() ) {
          this._parentCtrl.setDisableFocusout();
          this._onMouseDown(ev);
          this._parentCtrl.clearDisableFocusout();
        }
      }

      this._parentCtrl.observeUserIdlingTimeAndRestart();
    });
    this._viewEva.attach('onmouseup', (ev) => {
      // *when button === 1, this is fired from _onDragEnd so commentted it out
      if( ev.button === 2 )
        this._onMouseUp(ev);
    });
    
    /*
    this._viewEva.attach('ondblclick', (ev) => {
      ev.cancelBubble = false;
      ev.returnValue = false;
      return false;
    });
    */

    this._model.addModelEvent(`change-frame-size`, () => {
      this._updateOverlayCTRL('label');
      this._view.updateImagePositionArrowIcon(this._model.getImageSettings('adjust'));
    });
    this._model.addModelEvent(`change-image-settings`, (param) => {
      if( typeof param.adjust !== 'undefined' ) {
        this._view.updateImagePositionArrowIcon(param.adjust);
      }
    });

    this._model.addModelEvent(`change-picture-frame`, () => {
      this.updateFrame();
    });

    this._model.addModelEvent(`change-misc-settings`, (param) => {
      if( typeof param.disableResizing === 'boolean' ) {
        if( !this._parentCtrl.isPinned() ) {
          this._resizableBorder.setResizable(!param.disableResizing);
        }
      }
    });
  }
  private _onMouseDown(ev: MSEventObj) {
    console.log(`${this.$L()}_onMouseDown(element)`, 'green');

    const parent = this._parentCtrl;
    if( this._model.isPinned() ) {
      if( !ev.ctrlKey )
        parent.clearSelectedElementList();
      
      if( ev.button !== 2 )
        return;
    }
    if( !this._model.isPinned() ) {
      this._model.setForegroundZIndex();
    }

    if( ev.ctrlKey ) {
      parent.switchSelectedItem(this);
    }
    else {
      if( !parent.getSelectedElementList().length ) {
        parent.addToSelectedElementList(this);
      }
      else if( ev.button === 1 ) {
        if( !parent.checkIsSelectedItem(this) ) {
          parent.clearSelectedElementList();
        }
        else {
          parent.setClickedDocumentJustAMomentAgo(true);
        }
        parent.addToSelectedElementList(this);
      }
    }
  }
  private _onMouseUp(ev: MSEventObj) {
    if( ev.ctrlKey )
      return;
    
    if( !(ev.button === 2 || this._parentCtrl.checkIsSelectedItem(this)) ) {
      this._parentCtrl.clearSelectedElementList();
    }

    if( this.isPinned() )
      return;
    
    this._parentCtrl.addToSelectedElementList(this);
  }

  // these are callbacks for ResizableBorder
  private _firstMoveFlag = false;
  protected _onDragStart(ev: MSEventObj, pos: MovedCoordinates, type: ResizableBorderTypes): any {
    this._onMouseDown(ev);
    
    const list = this._parentCtrl.getSelectedElementList();
    if( type !== 'move' ) {
      const flag = super._onDragStart(ev, pos, type);
      if( list.length === 1 ) {
        // update view image
        this.updateHighlightVisibility();
      }
      return flag;
    }

    if( ev.ctrlKey || this._model.isPinned() || this._dragging ) {
      return false;
    }
    if( type === 'move' ) {
      const psize = this._parentCtrl.getView().getViewFramePos();
      const size = this._view.getViewFramePos();
      if( psize.w === size.w && psize.h === size.h )
        return false;
    }

    // prepare all selected items
    this._firstMoveFlag = false;
    for( const item of list ) {
      this._dragging = true;
      item._prepareForDragging();
    }
    this._resizableBorder.setSnappable(!this.getModel().getMiscSettings('disableSnap'));
    this._prepareForSnapTargets();
  }
  // move all sibling elements
  protected _onDragMove(ev: MSEventObj, pos: MovedCoordinates, type: ResizableBorderTypes) {
    if( type !== 'move' ) {
      // resize frame
      return super._onDragMove(ev, pos, type);
    }

    const list = this._parentCtrl.getSelectedElementList();
    
    // initialize for first moving
    if( !this._firstMoveFlag ) {
      this._firstMoveFlag = true;
      
      for( const item of list ) {
        const model = item._model;
        if( model.getFrameSettings('sizing') === 'mix' ) {
          // change current view frame size to setting size
          const size = model.getFrameBoxFromSetting();//model.getFrameSettings();
          const prev = item._view.getViewFramePos();
          item._view.resizeViewFrame(size.w, size.h);
          item._view.moveViewFrame(size.x, size.y);
          // adjust differed img position
          item._view.moveViewImage(prev.x - size.x, prev.y - size.y, true);
          
          item._resizableBorder.setStartedBoxPosition(size); // reset started box for ResizableBorder
          item._prepareForDragging();
        }
        item._model.stopSlideShow(true);
      }
    }

    for( const item of list ) {
      // update view
      const movedpos = item.resizeAndMoveViewFrameByMovedCoordinates(pos);
      if( !item._model.getMiscSettings('allowMovingOutsideFrame') ) {
        const {w:parentW, h:parentH} = this._parentCtrl?.getView().getViewFramePos();
        const rightX = movedpos.x + movedpos.w;
        const bottomY = movedpos.y + movedpos.h;
        
        let difx = 0, dify = 0;
        if( parentW >= movedpos.w ) {
          if( movedpos.x < 0 )
            difx = -movedpos.x;
          else if( rightX > parentW )
            difx = parentW - rightX;
        }
        
        if( parentH >= movedpos.h ) {
          if( movedpos.y < 0 )
            dify = -movedpos.y;
          else if( bottomY > parentH )
            dify = parentH - bottomY;
        }
        
        if( difx || dify ) {
          item.getView().moveViewFrame(difx, dify, true);
        }
      }
    }
  }
  protected _onDragEnd(ev?: MSEventObj, pos?: MovedCoordinates) {
    console.log(`${this.$L()}_onDragEnd(element)`, 'green');
    

    const { w:prepw, h:preph, x:prepx, y: prepy } = this._preparedFramePos!;
    const list = this._parentCtrl.getSelectedElementList();

    this._dragging = false;
    this._firstMoveFlag = false;
    
    // get final coordinates from current view
    const viewpos = this._view.getViewFramePos();
    let { w, h, x, y } = viewpos;
    const moved = x !== prepx || y !== prepy;
    const resized = prepw !== w || preph !== h;
    
    // if size was changed do super method
    if( resized ) {
      super._onDragEnd(ev, pos);

      // disable dragging flag for siblings
      for( const item of list ) {
        item._dragging = false;
        item._preparedFramePos = null;
        item._firstMoveFlag = false;
        item._model.startSlideShow(true);
      }

      this.updateOverlayPadding();
      this.updateHighlightVisibility();
      return;
    }

    this.updateHighlightVisibility();

    // do nothing if it is not moved
    if( ev && prepx === x && prepy === y ) {
      this._onMouseUp(ev);
      // disable dragging flag for siblings
      for( const item of list ) {
        item._dragging = false;
        item._preparedFramePos = null;
        item._firstMoveFlag = false;
        item._model.startSlideShow(true);
      }
      return;
    }

    // move all sibling elements
    for( const item of list ) {  
      if( !item._preparedFramePos ) {
        continue;
      }
      
      if( moved ) {
        // get final coordinates from current view
        const viewpos = item._view.getViewFramePos();
        let { w, h, x, y } = viewpos;
        //item._model.changeFramePosition(viewpos);
        //item._model.updateMarginBy(x - prepx, y - prepy);
        item._model.updateSize(viewpos);
        item._model.updateMargin(viewpos);
        item._model.moveFrame(x, y, false, false);
        item._model.resizeFrame(w, h, false, false);
      }

      item._firstMoveFlag = false;
      item._dragging = false;
      item._preparedFramePos = null;
      item.updateFrame();

      item.updateOverlayPadding();
      item._model.startSlideShow(true);
    }
    
    this._parentCtrl.setClickedDocumentJustAMomentAgo(true);
  }

  private _createOverlayControls() {
    let target = this._view.getContainer() as HTMLElement;
    if (target.nodeType !== 1)// @ts-ignore
      target = target.body
    
    this._overlayCTRL = new OverlayControl(target, {
      zIndex: 100,
      delay: 5000,
      onmouseover: () => {
        /*
        // cancel mouseover
        if( this._model.isPinned() || this._model.getElementSettings('disableOverlay')) {
          if( !this._model.getElementSettings('overlayLocked') )
            return false;
        }
        */

        this._updateOverlayCTRL('play');
        this._updateOverlayCTRL('status');
        this._updateOverlayCTRL('label');
      },
      onclick: (ev) => {
        if( ev.ctrlKey || (ev.srcElement as any).className !== 'overlay-button' )
          return false;
      },
      controls: {
        play: {
          left: '30%',
          top: '0px',
          width: '40%',
          height: '100%',
          content: '',
          zIndex: 100,
          onclick: (ev) => {
            this._model.isPlayingSlideShow() ? this._model.stopSlideShow() : this._model.startSlideShow();
            this._updateOverlayCTRL('play');
          },
        },
        next: {
          left: '70%',
          top: '0px',
          width: '30%',
          height: '100%',
          content: '',
          zIndex: 100,
          onclick: (ev) => {
            //this._model.stopSlideShow();
            this._model.nextSlide();
          }
        },
        prev: {
          left: '0%',
          top: '0px',
          width: '30%',
          height: '100%',
          content: '',
          zIndex: 100,
          onclick: (ev) => {
            //this._model.stopSlideShow();
            this._model.prevSlide();
          }
        },
        status: {
          zIndex: 99,
          left: '0%',
          top: '80%',
          width: '100%',
          height: '20%',
          content: '',
        },
        label: {
          zIndex: 99,
          left: '0%',
          top: '0%',
          width: '100%',
          height: '10%',
        }
      }
    });
    this._updateOverlayCTRL('play');
    this._updateOverlayCTRL('next');
    this._updateOverlayCTRL('prev');
  }
  private _updateOverlayCTRL(id?: string) {
    const ids = id ? [id] : this._overlayCTRL.getControlIds();
    for( const id of ids ) {
      let content = '';
      switch( id ) {
        case 'play':
          content = `
            <table style="
              text-align: center;
              position: absolute;
              padding: 0px; margin: 0px;
              display: inline-block;
              width: 100%;
              height: 100%;
              font-size: expression(Number(this.parentNode.offsetWidth*0.2)+'px');
            "><tr><td>
              <span class="overlay-button" style="
                font-family: Webdings;
                position: relative;
                color: black;
                z-index: 1;
                left: 0px;
                top: 0px;
                cursor: pointer;
              ">
                &#x6e;
                <span class="overlay-button" style="
                  position:absolute;
                  font-family: Webdings;
                  color: white;
                  z-index: 2;
                  left: 0px;
                  top: 0px;
                  cursor: pointer;
                ">${this._model.isPlayingSlideShow() ? '&#x3b;' : '&#x34;'}</span>
              </span>
            </td></tr></table>
          `;
          break;
        case 'next':
          content = `
            <table style="
              text-align: center;
              position: absolute;
              padding: 0px; margin: 0px;
              display: inline-block;
              width: 100%;
              height: 100%;
              font-size: expression(Number(this.parentNode.offsetWidth*0.2)+'px');
            "><tr><td>
              <span class="overlay-button" style="
                font-family: Webdings;
                position: relative;
                color: black;
                z-index: 1;
                left: 0px;
                top: 0px;
                cursor: pointer;
              ">
                &#x6e;
                <span class="overlay-button" style="
                  position:absolute;
                  font-family: Webdings;
                  color: white;
                  z-index: 2;
                  left: 0px;
                  top: 0px;
                  cursor: pointer;
                ">&#x38;</span>
              </span>
            </td></tr></table>
          `;
          break;
        case 'prev':
          content = `
            <table style="
              text-align: center;
              position: absolute;
              padding: 0px; margin: 0px;
              display: inline-block;
              width: 100%;
              height: 100%;
              font-size: expression(Number(this.parentNode.offsetWidth*0.2)+'px');
            "><tr><td>
              <span class="overlay-button" style="
                font-family: Webdings;
                position: relative;
                color: black;
                z-index: 1;
                left: 0px;
                top: 0px;
                cursor: pointer;
              ">
                &#x6e;
                <span class="overlay-button" style="
                  position:absolute;
                  font-family: Webdings;
                  color: white;
                  z-index: 2;
                  left: 0px;
                  top: 0px;
                  cursor: pointer;
                ">&#x37;</span>
              </span>
            </td></tr></table>
          `;
          break;
        case 'status': {
          const fsize = Math.min(12, Math.max(8, this._view.getViewFramePos().w/25));

          // ignore if the info and fontSize are unchanged
          if( !this._infoUpdated && fsize === this._prevInfoFontSize )
            return;
          this._infoUpdated = false;
          this._prevInfoFontSize = fsize;
          
          // log
          const len = this._infolist.length;
          let i = len - 2;
          const html: string[] = [];
          const colors = {
            info: 'white',
            warn: 'yellow',
            alert: 'red',
          };
          for( ; i < len; i++ ) {
            if( i < 0 ) continue;
            const {message, type} = this._infolist[i];
            html.push(`<div style="color:${colors[type]}">${message}</div>`);
          }
          // current status
          const list = this._model.getList();
          const listlen = list.getLength();
          const listidx = list.getIndex() + (listlen > 0 ? 1 : 0);
          const img = this._model.getImgInfo();
          let imgdat = '-';
          if( img ) {
            const {w, h} = this._model.getImagePos();
            const resolution = `[${img.width}×${img.height}(${w/img.width*100|0}%)]`;
            const size = `[${img.size/1024|0}KB]`;
            const path = escapeHTML(img.path);
            imgdat = `<font color="yellow">${resolution}</font><font color="orange">${size}</font> <font color="${!img.success ? 'red' : 'lime'}">${path.replace(/^.+[\\/](?=[^\\/]+$)/, '')}</font>`;
          }

          content = `
            <div style="position:absolute; overflow-y:visible; overflow-x:hidden; white-space:nowrap; text-overflow:ellipsis; padding:2px; width:100%; bottom:0px; color:white; background-color:black; font-size:${fsize}px; line-height:${fsize}px;">
              ${ html.join('') }
              <div>(${listidx}/${listlen}) ${imgdat}</div>
            </div>
          `;
          break;
        }
        case 'label':
          const vpos = this._view.getViewFramePos();
          const fsize = Math.min(14, Math.max(8, vpos.w/25));
          const {w, h} = this._model.getFramePos();
          content = `
            <span style="position:absolute; padding:2px; white-space:nowrap; left:0px; top:0px; color:white; background-color:black; font-size:${fsize}px; line-height:${fsize}px;">
              <span style="color:lime;">[${w|0}×${h|0}]</span> <span>(${this._view.getViewImageQuality()})</span> <span>${this._model.getName(true)}</span>
            </span>
          `;
          break; 

        default:
          throw new Error(`unexpected OverlayControl id "${id}"`);
      }

      this._overlayCTRL.updateControl(id, {content});
    }
  }
  private _setOverlayCTRLVisibility() {
    const locked = this._model.getElementSettings('overlayLocked');
    const disabled = this._model.getElementSettings('disableOverlay');
    
    if( locked ) {
      this._overlayCTRL.disable(this._isPlaylistEmpty);
    }
    else {
      this._overlayCTRL.disable(disabled || this.isPinned() || this._isPlaylistEmpty);
    }
    this._updateOverlayCTRL();
  }

  // resize overlay (using padding) when it overflows from window
  private updateOverlayPadding() {
    const ppos = this._parentCtrl.getView().getViewFramePos();
    const pos = this._view.getViewFramePos();

    const {w:pw, h:ph, x:px, y:py } = ppos;
    const {w, h, x, y} = pos;
    
    // always set left and right padding 1 to prevent flickering its container element
    let left = x < 0 ? Math.min(-x, w) : 1;
    let right = x + w > pw ? Math.min(x + w - pw, w) : 1;
    let top = y < 0 ? Math.min(-y, h) : 0;
    let bottom = y + h > ph ? Math.min(y + h - ph, h) : 0;
    this._overlayCTRL.addContainerCss(`padding: ${top}px ${right}px ${bottom}px ${left}px`);
  }

  protected _infoUpdated = false;
  protected _prevInfoFontSize = -1;
  protected _infolist: {message:string, type: InfoTypes}[] = [];
  protected info(message: string, type: InfoTypes = 'info') {
    this._infoUpdated = true;
    message = escapeHTML(message);
    
    this._infolist.push({message, type});
    if( this._infolist.length > 30 )
      this._infolist.splice(0, this._infolist.length - 20);
    
    if( this._overlayCTRL.getStatus('status', 'display') || this._overlayCTRL.isLocked() )
      this._updateOverlayCTRL('status');
  }


  
  protected _DefaultCommands = [
    {
      label: $t('startmenu-element-open-image'),
      onclick: () => {
        this.addImage();
      },
    },
    {
      label: $t('startmenu-element-open-folder'),
      onclick: () => {
        this.addFolder();
      },
    },
    /*
    {
      label: 'Import from flss file',
      onclick: () => {
        if( this._parentCtrl.openDialogToLoadFlss() ) {
          this.close();
        }
      },
    },
    */
    {
      label: $t('startmenu-create-frame'),
      onclick: (ev: MSEventObj) => {
        const parent = this._parentCtrl;
        const size = parent.getView().getViewFramePos();
        const item = parent.createNewChildElement(undefined, undefined, size.w / 2, size.h/2);
        
        setTimeout(() => {
          try {
          parent.clearSelectedElementList();
          parent.addToSelectedElementList(item);
          } catch(e) {}
        }, 0);
      },
    },
    {
      label: $t('startmenu-element-remove'),
      onclick: (ev: MSEventObj) => {
        this.close();
        setTimeout(() => {
          try {
          const parent = this._parentCtrl;
          const item = parent.getLastElement();
          item && parent.addToSelectedElementList(item);
          } catch(e) {}
        }, 0);
      }
    }
  ];

  getCtxMenuParameter(ctx: _CtrlBase): HtaContextMenu["Types"]["MenuItemParameterOrNull"][] {
    const rootparam = this._parentCtrl.getCtxMenuParameter(ctx);
    const selection = this._parentCtrl.getSelectedElementList();
    return [
      ...getElementCtxMenuParameter(this, selection),
      { type: 'separator' },
      ...rootparam,
    ];
  }

  protected _setPinned(pinned: boolean) {
    super._setPinned(pinned);
    if( typeof pinned === 'boolean' ) {
      const overlayLocked = this._model.getElementSettings('overlayLocked');
      if( pinned ) {
        //this._model.setBackground();
        this.disableMouseEvents();
        this._parentCtrl.removeFromSelectedElementList(this);
        this._view.setContainerStyle('cursor', 'no-drop');
      }
      else {
        //this._model.setForeground();
        //this._overlayCTRL.disable(false);
        this.recoverMouseEvents();
        this._view.setContainerStyle('cursor', '');
      }
    }
  }
  
  
  protected _setBalancedViewImageQuality(idat: ImgInfo) {
    const prevQuality = this._model.getImageSettings('quality');
    
    super._setBalancedViewImageQuality(idat);
    
    // update "label" overlay for image quality
    if( prevQuality !== this._model.getImageSettings('quality') )
      this._updateOverlayCTRL('label');
  }

  protected _getPositionInParent() {
    const parent = this._view.getDoc().body;//this._view.getContainer();
    const {offsetWidth: pwidth, offsetHeight: pheight} = parent;

    return {
      parentWidth: pwidth,
      parentHeight: pheight,
      x: this._view.getContainer().offsetLeft,
      y: this._view.getContainer().offsetTop,
    };
  }
  putResizableTarget(targ: ResizableBorder) {
    this._parentCtrl.putResizableTarget(targ);
  }
  getResizableTargets(resizingFlag = false) {
    const list = this._parentCtrl.getResizableTargets();
    if( resizingFlag || this._model.getMiscSettings('allowMovingOutsideFrame') )
      list.push( this._parentCtrl.getResizableBorder() );
    return list;
  }

  disableOverlay(flag = true) {
    this._overlayEnabled = flag;
    this._overlayCTRL.disable(!flag);
  }
  isOverlayDisabled() {
    return !this._overlayEnabled;
  }
  lockOverlay(flag = true) {
    this._overlayCTRL.lock(flag);
  }

  contains(node: HTMLElement) {
    const container = this._view.getContainer();
    return container === node || container.contains(node);
  }

  getModel() {
    return this._model;
  }
  getParentCtrl() {
    return this._parentCtrl;
  }
  fitFrameToParentWindow() {
    const psize = this._parentCtrl.getView().getViewFramePos();
    this._model.resizeFrame(psize.w, psize.h);
    this._model.moveFrame(0, 0);
    this._model.updateSize();
    this._model.updateMargin();
    this.updateFrame();
  }
  disableMouseEvents(): void {
    const overlayLocked = this._model.getElementSettings('overlayLocked');

    this._overlayCTRL.disable(!overlayLocked);
    super.disableMouseEvents();
  }
  recoverMouseEvents(): void {
    const parentPinned = this._parentCtrl.isPinned();
    const pinned = this._model.getMiscSettings('pinned');
    const disableOverlay = this._model.getElementSettings('disableOverlay');
    const overlayLocked = this._model.getElementSettings('overlayLocked');
    this._overlayCTRL.disable(!overlayLocked && (parentPinned || pinned || disableOverlay));

    super.recoverMouseEvents();
  }
  setSelected(flag = true) {
    this._selected = flag;
  }
  isSelected() {
    return this._selected;
  }
  openRenameDialog() {
    const name = this._parentCtrl.prompt('Input Name for the Frame', this._model.getName());
    if( name ) {
      this._model.setName(name);
    }
  }

  addAllImagesIncludingSubfolders(folder: string) {
    var list = fs.getFileAndFolderList(folder, { include: /\.(jpe?g|gif|png|bmp|ico)$/i, dig: true }).files;
    this.addList(list);
  }
  addList(list: any) {
    this._model.addList(list);
    this.getModel().startSlideShow();
  }
  shuffleList() {
    this._model.shuffleList();
  }
  
  addImage() {
    try {
      var list = fs.selectImageFile();
    } catch (e: any) {
      alert(e.message);
    }
    if (!list)
      return;
    
    this.addList(list);
  }
  addFolder() {
    var folder = fs.openFolderDialog({ edit: true });
    if (!folder)
      return;
    this.addAllImagesIncludingSubfolders(folder);
  }

  setThisAsPictureFrameForTarget() {
    const targets = this._parentCtrl?.seekOverlappedFrames(this);
    if( !targets.length ) {
      return;
    }
    
    const targ = targets[0];
    let x, y, w, h;
    
    let fx, fy, fw, fh;
    ({x, y, w, h} = this.getView().getViewFramePos());
    fx = x; fy = y;
    ({x, y, w, h} = this.getView().getViewImagePos());
    fx += x; fy += y; fw = w; fh = h;

    const shape = targ.getModel().getFilterSettings('shape') !== 'none' && targ.getView().getShape();
    let wratio = 1, hratio = 1, xratio = 1, yratio = 1;
    let scx, scy, scw, sch;
    let xdif = 0, ydif = 0;
    let width, height;
    if( !shape ) {
      let tx, ty, tw, th;
      ({x, y, w, h} = targ.getView().getViewFramePos());
      tx = x; ty = y; tw = w; th = h;
      scx = tx;
      scy = ty;
      scw = tw;
      sch = th;
      width = w;
      height = h;
    }
    else {
      const sx = shape.offsetLeft;
      const sy = shape.offsetTop;
      ({x, y, w, h} = targ.getView().getViewFramePos());
      
      scx = x + sx;
      scy = y + sy;
      scw = shape.offsetWidth;
      sch = shape.offsetHeight;
    }
    wratio = fw / scw;
    hratio = fh / sch;

    xdif = scx - fx;
    ydif = scy - fy;
    xratio = xdif / scw;
    yratio = ydif / sch;

    targ._model.createPictureFrame({
      enabled: true,
      framePath: this.getModel().getImagePath(),
      quality: this.getView().getViewImageQuality(),
      wratio,
      hratio,
      xratio,
      yratio,
      
      width,
      height,
    });
    this.close();
  }

  getView() {
    return this._view;
  }
  updateHighlightVisibility() {
    this._view.updateBorder2HighlightVisibility(!this._dragging && !this._isPlaylistEmpty);
  }
  isHighlightEffectEnabled() {
    return this._parentCtrl.isHighlightEffectEnabled();
  }
  
  close() {
    this._overlayCTRL.dispose();
    super.close();
    this._parentCtrl?.removeChildElement(this);
    this._parentCtrl?.removeFromSelectedElementList(this, false);
  }

  protected $L() {
    return `[${this._model.getUniqueId()}]CtrlElement#`;
  }
}
