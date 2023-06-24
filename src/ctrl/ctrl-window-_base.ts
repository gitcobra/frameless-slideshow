declare var Environment: any;

import { BoxPosition, ElementFrameSettingsJSON, ElementSettings, FLSSCopyList, FLSS_COPY_TEXT_ID, FrameSettings, FrameSettingsJSON, ImageSettings, SettingType, SlideshowSettings, WindowFrameSettingsJSON } from "src/model/data-types";
import { InfoTypes, _CtrlBase } from "./ctrl-_base";
import { CtrlRoot } from "./ctrl-window-root";
import { CtrlElement } from "./ctrl-element";
import { ModelWindow } from "src/model/model-window";
import { _ModelBase } from "src/model/model-base";
import { ViewRoot } from "../view/view-window-root";
import { ViewChild } from "src/view/view-window-child";

import { MovedCoordinates, ResizableBorder } from "src/utils/resizable-border";
import { OverlayControl } from "src/utils/overlay-control";
import {$t} from "../i18n/i18n";
import { EventAttacher, escapeHTML } from "../utils/utils";
import * as fs from "../utils/filesystem";

import HtaDropTarget from "hta-drop-target";
//import HtaDropTarget from "../../../hta-drop-target/dist/hta-drop-target.esm";
import HtaContextMenu from "hta-ctx-menu";

/**
 * window frame controller (HTA's window or dialogs which created from showModelessDialog)
 * @export
 * @abstract
 * @class _CtrlWindow
 * @extends {_CtrlBase}
 */
export abstract class _CtrlWindow extends _CtrlBase {
  protected abstract _view: ViewRoot | ViewChild;
  protected abstract _winEva: EventAttacher;
  protected abstract _docEva: EventAttacher;
  protected abstract _bodyEva: EventAttacher;
  protected _model!: ModelWindow;
  
  protected _ctxmenu!: HtaContextMenu;
  protected _dropTarget!: HtaDropTarget;
  protected _isOpeningCtxMenu = false;

  private _overlayCTRL?: OverlayControl;

  protected _childElements: CtrlElement[] = [];
  protected _childNameBank: { [name: string]: CtrlElement } = {};
  protected _resizableTargets: ResizableBorder[] = [];
  protected _selectedElements: CtrlElement[] = [];
  
  protected _lastOpenedFramePos: BoxPosition = { x:0, y:0, w:320, h:240 };
  /*
  constructor(model?: ModelWindow) {
    super();
  }
  */

  protected _initializeWindow() {
    this._model.addModelEvent('change-wallpaper', (data) => {
      this._setWallPaper();
    });
    this._model.addModelEvent('change-misc-settings', (param) => {
      if( 'pinned' in param ) {
        // *onkeypress doesnt work after window.blur() for some reason even if the window is active.
        //  focus() fixes that condition.
        if( !param.pinned )
          window.focus();
      }
    });
    
    // disable highlight filter effects
    this._model.addModelEvent('change-window-settings', (data) => {
      if( typeof data.disableHighlightEffects !== 'undefined' ) {
        const flag = !data.disableHighlightEffects;
        this._view.setHighlightEffects(flag);

        for( const item of this._childElements ) {
          item.getView().setHighlightEffects(flag);
          const fadjust = this._model.getFrameSettings('adjust');
          const iadjust = this._model.getImageSettings('adjust');
          item.getView().updateBasePositionArrowIcon(fadjust);
          item.getView().updateImagePositionArrowIcon(iadjust);
        };
      }
    });
    
    this._setWindowEvents();
    this._setDropTarget();
    this._setWallPaper();

    // create context menu
    this._ctxmenu = new HtaContextMenu({
      skin: 'win10',
      onbeforeload: (ev) => {
        this._isOpeningCtxMenu = true;
        //console.log("_isOpeningCtxMenu")
      },
      onload: () => {
        this._ctxmenu.focus();
        this.observeUserIdlingTimeAndRestart();
      },
      onunload: (ev) => {
        this._isOpeningCtxMenu = false;
        if( this.isPinned() || !this._isClickedJustAMomentAgo && ev.canceled ) {
          if( !this._disabledFocusout ) {
            this.clearSelectedElementList();
            this._view.showBorder(false);
          }
        }
        else {
          //this.deselectPinnedElements();
        }
        this.observeUserIdlingTimeAndRestart();
      },
      items: [{
        type: 'demand',
        ondemand(ev, ctx: _CtrlBase) {
          return ctx.getCtxMenuParameter(ctx);
        }
      }]
    });
    
    const elements = this._model.getChildElementModels();
    for( const model of elements ) {
      this.addChildElement( new CtrlElement(this, model) );
    }

    this._model.addModelEvent('settings-changed', () => this._onSettingsChanged());
  }
  observeUserIdlingTimeAndRestart() {}

  private _setDropTarget() {
    const targ = this._view.getDropTarget();
    let cx = -1, cy = -1;
    let currentDropTargetFrame: _CtrlBase | null = null;
    
    // contextmenu for when flss file is dropped
    const dropctxmenu = new HtaContextMenu({items:[
      {
        type: 'demand',
        ondemand(ev, path) {
          return {
            label: $t('savefile-dropped', path),
            unselectable: true,
          }
        },
      },
      { type: 'separator' },
      {
        label: $t('import-frames'),
        onactivate: (ev, path) => {
          this.importChildElementsFromFlss(path);
        }
      },
      {
        label: $t('openas-new-window'),
        onactivate: (ev, path) => {
          this.loadSaveFile(path);
        }
      },
      {
        label: $t('cancel'),
      },
    ]});

    const ondragover = (ev: MSEventObj) => {
      if( cx === ev.screenX && cy === ev.screenY )
        return;
      cx = ev.screenX;
      cy = ev.screenY;
      const {screenLeft:sx, screenTop:sy} = this._view.getWin();
      //let teargetDetected = false;

      // search all inner CtrlElements
      let highestZindex = -999999999;//Number.NEGATIVE_INFINITY;
      let prevTarget = currentDropTargetFrame;
      let overInnerFrame = false;
      if( !this._model.getWindowSettings('disableInnerDrop') ) {
        for( const item of this._childElements ) {
          if( item.isPinned() )
            continue;

          const pos = item.getView().getViewFramePos();
          if( cx < sx + pos.x || cx > sx + pos.x + pos.w )
            continue;
          if( cy < sy + pos.y || cy > sy + pos.y + pos.h )
            continue;
          
          const zindex = item.getModel().getElementSettings('zIndex');
          if( highestZindex >= zindex )
            continue;
          highestZindex = zindex;
          overInnerFrame = true;

          if( currentDropTargetFrame === item )
            continue;
          
          // update current drop target
          currentDropTargetFrame = item
        }
      }

      // show the drop target on the inner Element
      if( prevTarget !== currentDropTargetFrame ) {
        // set the element frame as a drop target 
        const pos = currentDropTargetFrame!.getView().getViewFramePos();
        targ.style.pixelWidth = pos.w;
        targ.style.pixelHeight = pos.h;
        targ.style.pixelLeft = pos.x;
        targ.style.pixelTop = pos.y;
        targ.style.display = 'inline-block';
        //teargetDetected = true;
      }
      // show the drop target on document
      else if( !this._childElements.length || !overInnerFrame && currentDropTargetFrame !== this) {
        console.log("dragover-observer")
        currentDropTargetFrame = this;
        cx = ev.screenX;
        cy = ev.screenY;
        targ.style.width = '100%';
        targ.style.height = '100%';
        targ.style.pixelLeft = 0;
        targ.style.pixelTop = 0;
      }
    };

    this._dropTarget = new HtaDropTarget(targ, {
      autoHide: true,
      htmlFile: 'html/drop-target.html',
      
      // detect dragging over inner element frames
      ondragover,
      ondrop: (path: string) => {
        // open contextmenu
        if( /\.flss$/i.test(path) ) {
          dropctxmenu.open(cx, cy, path);
          return;
        }

        const list = fs.parsePath(path, /\.(jpe?g|gif|png|bmp|ico)$/ig, /*() => {
          return this._view.getWin().confirm('extract the zip?');
        }*/);
        if( !list || !list.length ) {
          alert(`Could not find any images.\n\n"${path}"`);
          return;
        }

        if( currentDropTargetFrame instanceof _CtrlWindow) {
          const ccx = cx - this._view.getWin().screenLeft;
          const ccy = cy - this._view.getWin().screenTop;
          const size = currentDropTargetFrame._model.getFramePos();
          const w = Math.max(120, size.w / 3);
          const h = Math.max(90, size.h / 3);
          const child = currentDropTargetFrame.createNewChildElement(ccx - w/3, ccy - h/3, w, h);
          //child.__fitFrameToFirstImage = true;
          child.addList(list);
          currentDropTargetFrame.addToSelectedElementList(child);
        }
        else if( currentDropTargetFrame instanceof CtrlElement ) {
          currentDropTargetFrame!.addList(list);
        }
      }
    });

    document.body.attachEvent('ondragover', ondragover);
  }
  protected _createOverlayControls() {
    let target = this._view.getContainer() as HTMLElement;
    if (target.nodeType !== 1)// @ts-ignore
      target = target.body
    
    this._overlayCTRL = new OverlayControl(target, {
      zIndex: 89999,
      locked: true,
      controls: {
        status: {
          zIndex: 99,
          left: '0px',
          top: '0px',
          width: '100%',
          height: '100%',
          content: '',
        }
      }
    });
  }
  protected _updateOverlayCTRL(id?: string) {
    const fsize = Math.min(12, Math.max(8, this._view.getViewFramePos().w/25));

    // ignore if the info and fontSize are unchanged
    if( !this._infoUpdated && fsize === this._prevInfoFontSize )
      return;
    this._infoUpdated = false;
    this._prevInfoFontSize = fsize;
    
    // log
    const len = this._infolist.length;
    const html: string[] = [];
    const colors = {
      info: 'white',
      warn: 'yellow',
      alert: 'red',
    };
    for( let i = 0; i < len; i++ ) {
      const {message, type} = this._infolist[i];
      html.push(`<div style="color:${colors[type]}">${message}</div>`);
    }
    const content = `
      <div style="position:absolute; overflow-y:visible; overflow-x:hidden; text-overflow:ellipsis; padding:2px; width:100%; bottom:0px; color:white; background-color:black; font-size:${fsize}px; line-height:${fsize}px;">
        ${ html.join('') }
      </div>
    `;

    this._overlayCTRL?.updateControl('status', {content});
  }

  protected _infoUpdated = false;
  protected _prevInfoFontSize = -1;
  protected _infolist: {message:string, type: InfoTypes}[] = [];
  protected info(message: string, type: InfoTypes = 'info') {
    this._infoUpdated = true;
    message = escapeHTML(message);
    
    this._infolist.push({message, type});
    if( this._infolist.length > 100 )
      this._infolist.splice(0, this._infolist.length - 20);
    
    if( this._overlayCTRL )
      this._updateOverlayCTRL('status');
  }

  private _setWindowEvents() {
    this._viewEva.attach('oncontextmenu', (ev: MSEventObj) => {
      console.log(`${this.$L()}oncontextmenu`, 'green');
      if( !this._model.isPinned() )
        this._view.showBorder(true);
      
      this._ctxmenu.open(ev.screenX, ev.screenY, this/*, this._view.getTargetDocument().parentWindow as MSWindowModeless*/);
      this._ctxmenu.focus();
    });

    this._bodyEva.attach('ondblclick', (ev: MSEventObj) => {
      // cancel double click event from child element.
      // cancelBubble on child element doesn't work for some reason.
      for( const child of this._childElements ) {
        if( child.getView().getContainer().contains(ev.srcElement as any) ) {
          return;
        }
      }
      this.openImageDialogToCreateNewFrame(ev);
    });
    this._bodyEva.attach('onselectstart', (ev: MSEventObj) => {
      ev.returnValue = false;
      return false;
    });

    this._winEva.attach('onfocus', (ev: MSEventObj) => {
      console.log(`${this.$L()}onfocus`, 'green');
      // set always background when pinned
      if( this.isPinned() ) {
        //this._view.getWin().blur();
      }
      else {
        //this._view.getWin().focus();
      }

      if( !this._model.isPinned() ) {
        this._view.showBorder(true);
      }
    });
    /*
    this._winEva.attach('onblur', (ev: MSEventObj) => {
      console.log(`${this.$L()}onblur`, 'green');
      if( !this._isOpeningCtxMenu ) {
        this._view.showBorder(false);
      }
    });
    */
    this._viewEva.attach('onfocusout', (ev: MSEventObj) => {
      if( this._disabledFocusout || ev.toElement ) {
        // ignore focoutout between elements from the same window
        return;
      }
      
      console.log(`${this.$L()}focusout`, 'green');
      if( !this._isOpeningCtxMenu && !this._isClickedSelectedElementsJustAMomentAgo ) {
        this._view.showBorder(false);
        this.clearSelectedElementList();
      }
    });

    this._viewEva.attach('onmousedown', (ev: MSEventObj) => {
      this.setClickedDocumentJustAMomentAgo();

      this._onMouseDown(ev);
      if( !this._model.isPinned() ) {
        this._view.showBorder(true);
      }
    });
    this._viewEva.attach('onmouseup', (ev: MSEventObj) => {
    });

    // key bindings
    this._docEva.attach('onkeydown', (ev: MSEventObj) => this._onKeyPress(ev));
    this._docEva.attach('onkeyup', (ev: MSEventObj) => this._onKeyUp(ev));

    // prevent zoom
    this._viewEva.attach('onmousewheel', (ev) => {
      if (ev.wheelDelta && ev.ctrlKey) {
        ev.returnValue = false;
      }
    });
  }
  private _onMouseDown(ev: MSEventObj) {
    console.log(`${this.$L()}_onMouseDown`, 'green');
    this.observeUserIdlingTimeAndRestart();
    
    if( !this._model.isPinned() ) {
      this._view.showBorder(true);
    }

    // dont clear selections when srcElement is one of childElement
    for( const item of this._childElements ) {
      if( item.contains(ev.srcElement as HTMLElement) ) {
        return;
      }
    }
    
    this.clearSelectedElementList();
  }
  protected _onKeyPress(ev: MSEventObj) {
    console.log(`${this.$L()}_onKeyPress [${ev.keyCode}]`, 'green');
    switch( ev.keyCode ) {
      // prevent zoom
      case 107: //+
      case 109: //-
        if( ev.ctrlKey ) ev.returnValue = false;
        break;
      
      // prevent alt+F4
      case 115:
        //if( ev.altKey ) ev.returnValue = false;
        break;
      
      case 27: // ESC
        this.clearSelectedElementList();
        this._view.showBorder(false);
        break;
      
      case 46: // DEL
        this.removeSelectedChildElements();
        break;
      case 37: // left
        if( this.isSelectingElements() )
          this.moveChildElements(-1, 0, true, true);
        else
          this.moveWindowBy(-1, 0);
        break;
      case 39: // right
        if( this.isSelectingElements() )
          this.moveChildElements(1, 0, true, true);
        else
          this.moveWindowBy(1, 0);
        break;
      case 38: // up
        if( this.isSelectingElements() )
          this.moveChildElements(0, -1, true, true);
        else
          this.moveWindowBy(0, -1);
        break;
      case 40: // down
        if( this.isSelectingElements() )
          this.moveChildElements(0, 1, true, true);
        else
          this.moveWindowBy(0, 1);
        break;
      
      case 34: // Page Down
      case 32: // space
        //this._selectedElements[0]?.getModel().nextSlide();
        this.doSometingToAllSelectedElements((item) => item.getModel().nextSlide());
        break;
      case 33: // Page Up
      case 8: // back space
        //this._selectedElements[0]?.getModel().prevSlide();
        this.doSometingToAllSelectedElements((item) => item.getModel().prevSlide());
        break;
      
      case 36: // Home
        //this._selectedElements[0]?.getModel().homeSlide();
        this.doSometingToAllSelectedElements((item) => item.getModel().homeSlide());
        break;
      case 35: // End
        //this._selectedElements[0]?.getModel().lastSlide();
        this.doSometingToAllSelectedElements((item) => item.getModel().lastSlide());
        break;
      
      case 13: // Enter
        if( ev.ctrlKey ) {
          const slidestat = this.getSpecificSettingFromAllElements('slide', 'status');
          if( !slidestat || slidestat !== 'play' )
            this.startAllSlideshows();
          else
            this.stopAllSlideshows();
        }
        else {
          this.doSometingToAllSelectedElements((item) => {
            if( !item.getModel().isPlayingSlideShow() )
              item.getModel().startSlideShow();
            else
              item.getModel().stopSlideShow();
          });
        }
        break;

      case 65: // A: select all
        if( ev.ctrlKey ) {
          this.selectAllChildElements();
        }
        break;
      case 67: //C: copy
        if( ev.ctrlKey ) {
          this.copySelectedElementsToClipboard();
        }
        break;
      case 88: //X: cut
        if( ev.ctrlKey ) {
          this.copySelectedElementsToClipboard(true);
        }
        break;
      case 86: //V: paste
        if( ev.ctrlKey && !this.isPinned() ) {
          const cutlist = this.getElementsAsJSONFromClipboard();
          if( cutlist ) {
            const size = this._view.getViewFramePos();
            const x = ev.screenX - size.x;
            const y = ev.screenY - size.y;
            if( x >= 0 && y >= 0 && x <= size.w && y <= size.h ) {
              this.pasteElementsFromJSON(cutlist, x, y);
            }
            else {
              //this.pasteElementsFromJSON(cutlist);
            }
          }
        }
        break;
      
      case 80: //The P key: pin
        const pflag = !ev.ctrlKey;
        if( this.getSelectedElementList().length ) {
          this.doSometingToAllSelectedElements(item => {
            item.getModel().setMiscSettings({'pinned': pflag});
          });
        }
        else {
          this.getModel().setMiscSettings({'pinned': pflag});
        }
        ev.returnValue = false;
        break;
      
      case 83: // shift+S write source
        DEV: {
          if( ev.shiftKey ) {
            console.log(document.body.innerHTML);
          }
        }
        break;
    }
    this.observeUserIdlingTimeAndRestart();
  }
  private _onKeyUp(ev: MSEventObj) {
    this._setWallPaper();
  }

  public refreshAllSettings(): void {
    super.refreshAllSettings();
    this._startingOverlay.disable(!!this._childElements.length);
  }

  protected _DefaultCommands: any[] = [];

  private _isClickedJustAMomentAgo = false;
  private _isClickedSelectedElementsJustAMomentAgo = false;
  private _timeoutIdcheckClicked = -1;
  setClickedDocumentJustAMomentAgo(elementFlag?: boolean) {
    this._isClickedJustAMomentAgo = true;
    if( elementFlag )
      this._isClickedSelectedElementsJustAMomentAgo = elementFlag;
    clearTimeout(this._timeoutIdcheckClicked);
    this._timeoutIdcheckClicked = window.setTimeout(() => {
      this._isClickedJustAMomentAgo = false;
      this._isClickedSelectedElementsJustAMomentAgo = false;
    }, 150);
  }

  private _disabledFocusout = false;
  private _timeoutIdDisabledFocusout = -1;
  setDisableFocusout() {
    this._disabledFocusout = true;
  }
  clearDisableFocusout() {
    clearTimeout(this._timeoutIdDisabledFocusout);
    this._timeoutIdDisabledFocusout = window.setTimeout(() => this._disabledFocusout = false, 500);
  }

  prompt(message: string, value: string = '') {
    this._disabledFocusout = true;
    const result = this._view.getWin().prompt(message, value);
    this.clearDisableFocusout();
    return result;
  }
  colorPicker() {
    this._disabledFocusout = true;
    const color = fs.colorPicker();
    this.clearDisableFocusout();
    return color;
  }

  moveWindowBy(x: number, y:number) {
    this.getModel().moveFrame(x, y, true);
    this.getModel().updateMargin();
  }
  moveChildElements(x: number, y: number, diffFlag=false, selectedElement=false) {
    const targets = selectedElement ? this._selectedElements : this._childElements;
    for( const element of targets ) {
      if( element.isPinned() ) {
        continue;
      }

      /*// change current view frame size to setting size
      const size = element.getModel().getFrameBoxFromSetting();//model.getFrameSettings();
      const view = element.getView();
      const prev = view.getViewFramePos();
      view.resizeViewFrame(size.w, size.h);
      view.moveViewFrame(size.x, size.y);
      // adjust differed img position
      view.moveViewImage(prev.x - size.x, prev.y - size.y, true);*/

      //element.getModel().moveFrame(x, y, diffFlag);
      if( diffFlag )
        element.getModel().updateMarginBy(x, y);
      else
        element.getModel().updateMargin();
      element.updateFrame();
    }
  }
  calculateMovedMarginForChildElements(pos: Partial<MovedCoordinates>, forFittingWindow = false) {
    console.log(`${this.$L()}calculateMovedMarginForChildElements`, 'green');
    for( const element of this._childElements ) {
      /*
      if( element.isPinned() )
        continue;
      */
      const adjust = element.getModel().getFrameSettings('adjust');
      const [xadjust, yadjust] = adjust.split('-');
      let xdif = 0;
      let ydif = 0;
      switch( xadjust ) {
        case 'left':
          if( forFittingWindow && pos.resizedX)
            xdif = -pos.resizedX;
          break;
        case 'right':
          if( pos.resizedX )
            xdif = -pos.resizedX;
          else if( pos.resizedW )
            xdif = pos.resizedW;
          break;
        case 'center':
          if( pos.resizedX )
            xdif = -pos.resizedX / 2;
          if( (!pos.resizedX || forFittingWindow) && pos.resizedW )
            xdif += pos.resizedW / 2;
          break;
      }
      switch( yadjust ) {
        case 'top':
          if( forFittingWindow && pos.resizedY)
            ydif = -pos.resizedY;
          break;
        case 'bottom':
          if( pos.resizedY )
            ydif = -pos.resizedY;
          else if( pos.resizedH )
            ydif += pos.resizedH;
          break;
        case 'center':
          if( pos.resizedY )
            ydif = -pos.resizedY / 2;
          if( (!pos.resizedY || forFittingWindow) && pos.resizedH )
            ydif += pos.resizedH / 2;
          break;
      }

      if( xdif || ydif ) {
        element.getModel().moveFrame(xdif, ydif, true);

        //element.getModel().updateCoordinates()
        element.getModel().updateMargin();
      }
      element.updateFrame();
    }
  }
  removeSelectedChildElements() {
    for( const element of this._selectedElements ) {
      element.close();
    }
  }
  resizeSelectedFrames(child?: CtrlElement) {
    const pos = child ? child.getView().getViewFramePos() : { w: 320, h: 240 };
    const result = this.prompt(`${$t('message-resize-frame')}\nWidth,Height`, `${pos.w},${pos.h}`);
    
    const exec = /(\d+)(?:[\D]+(\d+))?/.exec(result);
    let w, h;
    if( exec ) {
      w = Number(exec[1]);
      h = Number(exec[2] || exec[1]);
    }
    else
      ({w, h} = pos);
    
    for( const element of this._selectedElements ) {
      element.getModel().resizeFrame(w, h);
      element.getModel().updateSize();
      element.updateFrame();
    }
  }
  inputDelayGaps(stepwise = false) {
    let gap = 0;
    let split = 1;
    
    let result = this.prompt(`${$t('message-input-gaps')}\n(ms)`, `100`);
    const exec = /(\d+)\s*(?:,\s*(\d+))?/.exec(result);
    if( exec ) {
      gap = Number(exec[1]);
      if( stepwise )
        split = Number(exec[2]) || split;
    }

    const len = this._selectedElements.length;
    let cgap = stepwise ? 0 : gap;
    for( let i = 0; i < len; i++ ) {
      if( stepwise ) {
        if( i % split === 0 ) {
          cgap += gap / len * split;
        }
      }
      
      const element = this._selectedElements[i];
      element.getModel().setSlideshowSettings({'gap': cgap});
    }
  }
  clearPlayListOfSelectedElements() {
    for( const element of this._selectedElements ) {
      element.getModel().stopSlideShow();
      element.getModel().clearList();
      element.updateFrame();
    }
  }
  updateFrame() {
    // disable slidshow feature from window controllers
    const fpos = this._model.getFramePos();
    this._view.moveViewFrame(fpos.x, fpos.y);
    this._view.resizeViewFrame(fpos.w, fpos.h);
  }

  addChildElement(child: CtrlElement) {
    this._childElements.push( child );
    this._childNameBank[child.getModel().getName()] = child;
    this._view.showTitle(false);
    if( this._childElements.length === 1 ) 
      this._startingOverlay?.disable(true);

    child.getModel().addModelEvent('settings-changed', () => this._onSettingsChanged());
  }
  createNewChildElement(cx?:number, cy?:number, w?:number, h?:number): CtrlElement {
    console.log(`${this.$L()}createNewChildElement [${[cx, cy]}]`, 'green');
    const child = new CtrlElement(this, this._model.createChildElement());
    this.addChildElement(child);

    if( !child.getModel().getDefaultSettings() ) {
      if( typeof w === 'number' && typeof h === 'number' ) {
        child.getModel().resizeFrame(w, h);
        child.getModel().updateSize({w, h});
      }
    }

    if( typeof cx !== 'number' || typeof cy !== 'number' ) {
      cx = this._lastOpenedFramePos.x + 16;
      cy = this._lastOpenedFramePos.y + 16;
    }

    child.getModel().moveFrame(cx, cy);
    child.getModel().updateMargin();

    this._lastOpenedFramePos = child.getView().getViewFramePos();

    return child;
  }
  createNewChildElementFromJSON(json: FrameSettingsJSON): CtrlElement {
    console.log(`${this.$L()}createNewChildElementFromJSON`, 'green');
    const child = new CtrlElement(this, this._model.createChildElement(json));
    this.addChildElement(child);
    return child;
  }
  removeChildElement(item: CtrlElement) {
    delete this._childNameBank[item.getModel().getName()];
    
    for( let i = this._childElements.length; i--; ) {
      if( this._childElements[i] === item ) {
        this._childElements.splice(i, 1);
        break;
      }
    }
     
    this._view.showTitle( !this._childElements.length );
    if( this._childElements.length === 0 ) 
      this._startingOverlay?.disable(false);
  }
  getChildElementCount() {
    return this._childElements.length;
  }

  startAllSlideshows(pause = false) {
    //for( const item of this._childDialogs )
    //  item.getModel().startSlideShow();
    for( const item of this._childElements )
      item.getModel().startSlideShow(pause);
    //this.getModel().startSlideShow();
  }
  stopAllSlideshows(pause = false) {
    //for( const item of this._childDialogs )
    //  item.getModel().stopSlideShow(pause);
    for( const item of this._childElements )
      item.getModel().stopSlideShow(pause);
    //this.getModel().stopSlideShow();
  }
  
  openDialogToLoadFlss() {
    const path = fs.openFileDialog('Slideshow Data (*.flss)|*.flss|all (*.*)|*.*|', 'Select flss file');
    return path;
  }
  openImageDialogToCreateNewFrame(ev: MSEventObj) {
    try {
      const list = fs.selectImageFile();
      if( list ) {
        const size = this._model.getFramePos();
        const x = ev.screenX - size.x;
        const y = ev.screenY - size.y;
        const w = Math.max(120, size.w / 4);
        const h = Math.max(90, size.h / 4);
        const item = this.createNewChildElement(x, y, w, h);
        item.addList(list);
      }
    } catch (e: any) {
      alert(e.message);
    }
  }
  importChildElementsFromFlss(path: string) {
    try {
      const fp = fs.fso.OpenTextFile(path, 1, false, -1);
      const txt = fp.ReadAll();
      const json = JSON.parse(txt) as WindowFrameSettingsJSON;
      
      const list: FLSSCopyList = {
        id: "FLSS_CUT_ELEMENT_LIST",
        cutlist: json.childElements,
      };

      if( list.cutlist.length ) {
        if( confirm($t('confirm-import-frames', list.cutlist.length)) ) {
          this.pasteElementsFromJSON(list);
          return true;
        }
      }
      else {
        alert($t('message-no-imported-frames'));
      }

    } catch(e: any) { 
      alert(e.message);
      return;
    }
  }

  sortChildElements() {
    if( !confirm($t('confirm-sort-frames')) )
      return;
    
    const elements = this._childElements; //this.isSelectingElements() ? this.getSelectedElementList() : this._childElements;
    const {w, h} = this._view.getViewFramePos();
    const len = elements.length;
    const count = Math.ceil(Math.sqrt(len));
    
    const width = Math.max(w / count, 32) |0;
    const height = Math.max(h / count, 32) |0;
    let index = 0;
    let cy = 0;
    for( let y = 0; y < count; y++ ) {
      let cx = 0;
      let maxHeight = 0;
      for( let x = 0; cx + width <= w; x++ ) {
        if( index > len - 1 )
          break;
        const item = elements[index++];
        const model = item.getModel();
        const vpos = item.getView().getViewFramePos();
        let {w, h} = vpos;
        if( w > width ) w = width;
        if( h > height ) h = height;
        if( w !== vpos.w || h !== vpos.h ) {
          model.setFrameSettings({sizing: 'fixed'});
          model.resizeFrame(w, h);
        }
        model.moveFrame(cx, cy);
        model.updateMargin({w,h,x:cx,y:cy});
        cx += w;
        if( h > maxHeight ) maxHeight = h;
      }
      cy += maxHeight;
    }
  }
  splitImagesFromChildElement(child: CtrlElement) {
    const array = child.getModel().getList().getArray();
    if( array.length > 10 ) {
      if( !confirm($t('confirm-split-image', array.length) + `${array.length > 20 ? '*not recommended' : ''}`) )
        return;
    }
    
    const list = array.splice(1, array.length);
    child.getModel().homeSlide();
    const parent = this;
    const {w: pw, h:ph} = parent.getView().getViewFramePos();
    let {x, y, w, h} = child.getView().getViewFramePos();

    (function split() {
      const path = list.shift();
      x += 16;
      y += 16;
      if( x + w / 2 > pw )
        x = 0;
      if( y + h / 2 > ph )
        y = 0;
      
      const json = child.getModel().copyModelSettings();
      json.playlist[0] = path;
      json.slide.index = 0;
      json.filter.trans = 'none';
      json.misc.pinned = false;
      json.frame.offsetX = x;
      json.frame.offsetY = y;
      json.frame.adjust = 'left-top';
      
      parent.createNewChildElementFromJSON(json);

      if( list.length )
        setTimeout(split, 0);
    })();
  }

  getCtxMenu() {
    return this._ctxmenu;
  }
  isOpeningCtxMenu() {
    return this._isOpeningCtxMenu;
  }

  openNewWindow() {
    fs.WshShell.Run('"' + CtrlRoot.fullPath + '" /new', 1);
  }

  putResizableTarget(targ: ResizableBorder) {
    this._resizableTargets.push(targ);
  }
  removeResizableTarget(targ: ResizableBorder) {
    for( let i = this._resizableTargets.length; i--; ) {
      if( this._resizableTargets[i] === targ ) {
        this._resizableTargets.splice(i, 1);
        break;
      }
    }
  }
  getResizableTargets() {
    const list = [];
    for( const element of this._childElements ) {
      if( !element.isSelected() )
        list.push(element.getResizableBorder());
    }
    return list;
  }

  addToSelectedElementList(item: CtrlElement) {
    item.getView().showBorder(true);
    if( this.checkIsSelectedItem(item) )
      return;
    
    this._selectedElements.push(item);
    this._view.showBorder(true);
    item.setSelected(true);

    return;
  }
  removeFromSelectedElementList(sitem: CtrlElement) {
    console.log(`${this.$L()}removeFromSelectedElementList`, 'green');
    for( let i = this._selectedElements.length; i--; ) {
      const item = this._selectedElements[i];
      if( item === sitem ) {
        item.getView().showBorder(false);
        this._selectedElements.splice(i, 1);
        item.setSelected(false);
        
        return true;
      }
    }
    return false;
  }
  checkIsSelectedItem(sitem: CtrlElement) {
    return sitem.isSelected();
    
    for( let i = this._selectedElements.length; i--; ) {
      const item = this._selectedElements[i];
      if( item === sitem ) {
        return true;
      }
    }
    return false;
  }
  switchSelectedItem(sitem: CtrlElement) {
    if( this.checkIsSelectedItem(sitem) )
      this.removeFromSelectedElementList(sitem);
    else
      this.addToSelectedElementList(sitem);
  }
  
  getElements(): CtrlElement[] {
    return this._childElements;
  }
  getLastElement(): CtrlElement | undefined {
    return this._childElements[this._childElements.length - 1];
  }
  getSelectedElementList() {
    return this._selectedElements.concat();
  }
  isSelectingElements() {
    return !!this._selectedElements.length;
  }
  selectAllChildElements(includesPinned = false) {
    let selected = false;
    for( const item of this._childElements ) {
      if( !item.getModel().getMiscSettings('pinned') || includesPinned ) {
        this.addToSelectedElementList(item);
        selected = true;
      }
    }
  }
  clearSelectedElementList() {
    console.log(`${this.$L()}clearSelectedElementList`, 'green');
    for( const item of this._selectedElements ) {
      item.getView().showBorder(false);
      item.setSelected(false);
    }
    this._selectedElements.length = 0;
  }
  deselectPinnedElements() {
    console.log(`${this.$L()}deselectPinnedElements`, 'green');
    for( let i = this._selectedElements.length; i--; ) {
      const item = this._selectedElements[i];
      if( item.getModel().getMiscSettings('pinned') ) {
        item.getView().showBorder(false);
        item.setSelected(false);
        this._selectedElements.splice(i, 1);
      }
    }
  }
  pinAllChildElements(flag = true) {
    for( const item of this._childElements ) {
      item.getModel().setMiscSettings({'pinned': flag});
    }
  }
  setAllOverlays(flag = true) {
    for( const item of this._childElements ) {
      item.getModel().setElementSettings({disableOverlay: !flag});
    }
  }
  setLockAllOverlays(flag = true) {
    for( const item of this._childElements ) {
      item.getModel().setElementSettings({overlayLocked: flag});
    }
  }
  doSometingToAllSelectedElements(callback: (child: CtrlElement) => any) {
    console.log(`${this.$L()}doSometingToAllSelectedElements length[${this._selectedElements.length}]`, 'green');
    const list = this._selectedElements.concat();
    for( const item of list ) {
      callback(item);
    }
  }
  shrinkWindowToChildrenSize() {
    if( !this._childElements.length )
      return;
    
    let pos = this._childElements[0].getView().getViewFramePos();
    let left = pos.x;
    let top = pos.y;
    let right = pos.x + pos.w;
    let bottom = pos.y + pos.h;
    for( let i = 1; i < this._childElements.length; i++ ) {
      const item = this._childElements[i];
      const pos = item.getView().getViewFramePos();
      if( pos.x < left )
        left = pos.x;
      if( pos.y < top )
        top = pos.y;
      if( pos.x + pos.w > right )
        right = pos.x + pos.w;
      if( pos.y + pos.h > bottom )
        bottom = pos.y + pos.h;
    }

    const cpos = this._view.getViewFramePos();
    this._model.moveFrame(cpos.x + left, cpos.y + top);
    this._model.resizeFrame(right - left, bottom - top);
    this._model.updateMargin();
    this.calculateMovedMarginForChildElements({
      resizedX: left,
      resizedY: top,
      resizedW: (right - left ) - cpos.w,
      resizedH: (bottom - top) - cpos.h,
    }, true);

    this._setWallPaper();
  }

  copySelectedElementsToClipboard(cut = false) {
    window.clipboardData.clearData();
    
    const list = [];
    for( const item of this._selectedElements ) {
      list.push(item.getModel().getSettings());
      if( cut ) {
        item.close();
      }
    }
    if( !list.length )
      return;
    
    const json: FLSSCopyList = {
      id: FLSS_COPY_TEXT_ID,
      cutlist: list,
    };
    const text = JSON.stringify(json, null, 2);
    window.clipboardData.setData('text', text);
  }
  getElementsAsJSONFromClipboard() {
    const text = window.clipboardData.getData('text') || '';
    
    let json: FLSSCopyList | null = null;
    if( text.indexOf(FLSS_COPY_TEXT_ID) !== -1 ) { // check id
      try {
        json = JSON.parse(text) || {};
      } catch(e) {}
    }
    
    if( !json || json.id !== FLSS_COPY_TEXT_ID || !json.cutlist )
      return null;
    
    return json;
  }
  pasteElementsFromJSON(json: FLSSCopyList, x?: number, y?: number) {
    console.log(`${this.$L()}pasteElementsFromJSON ${[json.cutlist.length, x, y]}`, 'green');
    const list = json.cutlist;
    if( list.length )
      this.clearSelectedElementList();

    for( const elmjson of list ) {
      const model = this._model.createChildElement(elmjson);
      if( list.length === 1 && typeof x === 'number' && typeof y === 'number' ) {
        const {w, h} = model.getFramePos();
        //console.log([x, y, w, h], 'red');
        model.updateMargin({x, y, w, h});
      }
      const child = new CtrlElement(this, model);
      this.addChildElement(child);
      child.getModel().setForegroundZIndex();
      this.addToSelectedElementList(child);
    }
  }
  pickSameSettingsFromSelectedElements() {
    let settingsResult: ElementFrameSettingsJSON | null = null;
    for( const child of this._selectedElements ) {
      const model = child.getModel();
      const childSettings = model.getSettings();
      
      // initialize result object at first
      if( !settingsResult ) {
        settingsResult = {} as ElementFrameSettingsJSON;
        for( const prop in childSettings ) {
          const obj = (childSettings as any)[prop];
          if( typeof obj !== 'object' || obj.constructor !== Object )
            continue;
          const settingObj = (settingsResult as any)[prop] = {};
          for( const prop2 in obj ) {
            (settingObj as any)[prop2] = obj[prop2]
          }
        }
        continue;
      }

      let settingKeys: keyof ElementFrameSettingsJSON;
      for( settingKeys in settingsResult ) {
        const dataResult = settingsResult[settingKeys];
        if( typeof dataResult !== 'object' )
          continue;
        if( dataResult instanceof Array )
          continue;
        //let key: keyof typeof data;
        
        const childData = childSettings[settingKeys];
        
        for( const key in dataResult ) {
          const val = (dataResult as any)[key];
          const childVal = (childData as any)[key];
          if( val !== childVal ) {
            // erase value if the two values are unequal
            (dataResult as any)[key] = undefined;
            continue;
          }
        }
      }
    }
    return settingsResult;
  }
  getSpecificSettingFromAllElements<T extends SettingType>(stype: T, prop: keyof FrameSettingsJSON[T]) {
    let result: any = undefined;
    for( const item of this._childElements ) {
      const val = item.getModel().getSpecificSetting(stype, prop);
      result ??= val;
      if( result !== val ) {
        result = undefined;
        break;
      }
    }
    return result;
  }
  
  seekOverlappedFrames(frame: _CtrlBase): CtrlElement[] {
    const {x:fx, y:fy, w:fw, h:fh} = frame.getView().getViewFramePos();

    let targets = [];
    let largestdim = 0;
    for(const item of this._childElements) {
      if( item !== frame ) {
        const {x, y, w, h} = item.getView().getViewFramePos();
        if( !(x >= fx && x <= fx+fw || fx >= x && fx <= x + w) )
          continue;
        if( !(y >= fy && y <= fy+fh || fy >= y && fy <= y + h) )
          continue;
        
        const startx = Math.max(x, fx);
        const endx = Math.min(x+w, fx+fw);
        const starty = Math.max(y, fy);
        const endy = Math.min(y+h, fy+fh);
        const dimension = (endx - startx) * (endy - starty);

        if( dimension > largestdim ) {
          targets.unshift(item);
          largestdim = dimension;
        }
        else {
          targets.push(item);
        }
        
      }
    }
    
    return targets;
  }

  // set pinned setting for child elements
  protected _setPinned(pinned: boolean): void {
    for( const child of this._childElements ) {
      if( pinned ) {
        child.disableMouseEvents();
        this._dropTarget.disable(true);
      }
      else {
        child.recoverMouseEvents();
        this._dropTarget.disable(false);
      }
    }
    //this._view.setContainerStyle('cursor', pinned ? 'no-drop' : '');

    super._setPinned(pinned);
  }

  // OPTIMIZE:
  getTotalHQImagePixel() {
    let size = 0;
    for( const item of this._childElements ) {
      if( item.getView().getViewImageQuality() === 'high' ) {
        const img = item.getModel().getImgInfo();
        if( img && img.success ) {
          const {width, height} = img;
          size += width * height;
        }
      }
    }
    return size;
  }
  getCtxMenuParameter(ctx: _CtrlBase): HtaContextMenu["Types"]["MenuItemParameterOrNull"][] {
    return [];
  }

  protected _setWallPaper() {
    const wpdat = this._model.getWallPaper();
    if ( wpdat ) {
      //console.log(wpdat)
      this._view.setWallpaper(wpdat);
    }
  }
  isHighlightEffectEnabled() {
    return !this._model.getWindowSettings('disableHighlightEffects');
  }
  
  /*
  getCtxMenuParameter() {
    return getCtxMenuWindowParameter(this);
  }
  */
  loadSaveFile(path: string) {
  }
  _onSettingsChanged() {
  }

  protected _getPositionInParent() {
    return {
      parentWidth: screen.availWidth,
      parentHeight: screen.availHeight,
      x: this._view.getWin().screenLeft,
      y: this._view.getWin().screenTop,
    };
  }
  
  close() {
    const list = this._childElements;
    for( const child of list ) {
      child.close();
    }
    
    super.close();
    this._docEva.detachAll();
    this._bodyEva.detachAll();
    this._winEva.detachAll();
    this._docEva.detachAll();
  }
}
