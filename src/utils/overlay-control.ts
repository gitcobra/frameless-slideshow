import { createUID, ViewNode, ViewUpdater } from "src/view/view-updater";

type OverlayControlArguments = {
  zIndex?: number
  alpha?: number
  filter?: string
  delay?: number
  locked?: boolean
  disabled?: boolean
  ignoreMouseOut?: boolean
  controls?: {
    [id: string]: ControlContentOption
  }

  // base event handlers
  onclick?: (ev: MSEventObj) => any
  onmouseover?: (ev: MSEventObj) => any
  onmousemove?: (ev: MSEventObj) => any
  onmouseout?: (ev: MSEventObj) => any
};
type ControlContentOption = {
  width: string
  height: string
  left: string
  top: string
  display?: boolean
  delay?: number
  zIndex?: number
  alpha?: number
  filter?: string
  content?: string
  addStyle?: string
  onmouseover?: (ev: MSEventObj) => any
  onmouseout?: (ev: MSEventObj) => any
  onclick?: (ev: MSEventObj) => any
  //onmousedown?: (ev: MSEventObj) => any
  //onmouseup?: (ev: MSEventObj) => any
  initialize?: boolean
};

const OverlayDisappearingTime = 2000;
const MouseDownDelay = 800;

export class OverlayControl implements ViewNode {
  private _UID: string;
  private _zIndex = 100;
  private _alpha = 60;
  private _filter = '';
  private _delay = OverlayDisappearingTime;
  private _ignoreMouseOut = false;
  private _ids: string[] = []; // control ids
  //private _baseModel: ControlContentOption = {width:"",height:"",left:"",top:""};
  private _baseModelId = '_baseModel';

  private _model: {
    [id: string]: ControlContentOption
  } = {};
  private _model_prev: {
    [id: string]: Partial<ControlContentOption>
  } = {};

  private _updated: {
    [id: string]: {
      [key in keyof ControlContentOption]?: boolean
    }
  } = {};
  private _view: {
    doc: Document
    target: HTMLElement
    baseBaseContainer: HTMLElement
    baseContainer: HTMLElement
    controls: {
      [id: string]: {
        container: HTMLElement
        content: HTMLElement
        _initialized: boolean
        _onmousedown?: EventListener
        _onmouseup?: EventListener
        _onmouseover?: EventListener
        _onmouseout?: EventListener
      }
    }
  };
  private _baseEvents: {
    onclick?: Function
    onmouseover?: Function
    onmousemove?: Function
    onmouseout?: Function
  };
  
  private _disabled = false;
  private _locked = false;
  private _disposed = false;


  constructor(target: HTMLElement, opt?: OverlayControlArguments) {
    this._UID = createUID();
    
    // get document
    const doc = target.ownerDocument;
    if( !doc )
      throw new Error('could not get a Document object from the target');

    // get parameter
    const { zIndex, delay, ignoreMouseOut, locked, disabled, alpha, filter } = opt || {};
    this._zIndex = zIndex ?? this._zIndex; 
    this._delay = delay || this._delay;
    this._ignoreMouseOut = !!ignoreMouseOut;
    this._locked = !!locked;
    this._disabled = !!disabled;
    this._alpha = alpha || this._alpha;
    this._filter = filter || this._filter;
    
    // set the target hasLayout
    if( !/relative|absolute/i.test(target.currentStyle.position) ) {
      target.style.position = 'relative';
    }
    
    const baseBaseContainer = doc.createElement('div');
    baseBaseContainer.style.cssText = 'width:100%; height:100%; position: absolute; left:0px; top:0px;';
    baseBaseContainer.style.zoom = '1';
    baseBaseContainer.style.zIndex = String(zIndex);
    baseBaseContainer.id = 'OverlayControl_' + baseBaseContainer.uniqueID;
    target.appendChild(baseBaseContainer);
    

    const baseContainer = doc.createElement('div');
    baseContainer.style.cssText = 'width:100%; height:100%; position: relative;';
    baseContainer.style.zoom = '1';
    baseContainer.style.zIndex = String(zIndex);
    baseBaseContainer.appendChild(baseContainer);

    this._view = {
      doc,
      target,
      baseBaseContainer,
      baseContainer,
      controls: {
      },
    };

    // HACK: init model for baseContainer
    const id = this._baseModelId;
    this._model[id] = {
      width: '100%',
      height: '100%',
      left: '0px',
      top: '0px',
    };
    this._model_prev[id] = {};
    this._updated[id] = {};
    this._view.controls[id] = {
      container: baseBaseContainer,
      content: baseContainer,
      _initialized: false,
    };

    // create controls
    const controls = opt?.controls || {};
    for( const id in controls ) {
      this.createControl(id, controls[id]);
    }
    
    const {onclick, onmouseover, onmousemove, onmouseout} = opt || {};
    this._baseEvents = {
      onclick, 
      onmouseout,
      onmousemove,
      onmouseover,
    };

    if( this._locked && !this._disabled )
      this._showOverlay();
    
    this._setEvents();
  }
  getUID() {
    return this._UID;
  }
  private _setEvents() {
    this._view.target.attachEvent('onmouseover', this.__mouseOverContainer);
    this._view.target.attachEvent('onmouseout', this.__mouseOutContainer);
    //this._view.target.attachEvent('onclick', this.__mouseClickContainer);
    this._view.target.attachEvent('onmousemove', this.__mouseMoveContainer);
  }

  createControl(id: string, opt: ControlContentOption) {
    if( id in this._model === true )
      throw new Error(`The OberlayControl id "${id}" already exists.`);
    this._ids.push(id);
    
    const {left, top, width, height, display = false, delay = OverlayDisappearingTime, content = '', zIndex = 0, alpha, filter, onclick, onmouseout, onmouseover, /*onmousedown, onmouseup*/} = opt;
    this._model[id] = {
      width,
      height,
      left,
      top,
      zIndex,
      delay,
      content,
      display,
      alpha: alpha || this._alpha,
      filter: filter || this._filter,
      onclick,
      onmouseout,
      onmouseover,
      //onmousedown,
      //onmouseup,
    };
    this._updated[id] = {};
    this._model_prev[id] = {};
    this.updateControl(id, {initialize:true});
  }
  private _initializeControlView(id: string) {
    if( this._disposed )
      return;
    
    const {left, top, width, height, display, content, zIndex = 0, alpha, filter, onclick, onmouseout, onmouseover/*, onmousedown, onmouseup*/} = this._model[id];
    
    const view = this._view.controls[id] = {
      container: this._view.doc.createElement('div'),
      content: this._view.doc.createElement('div'),
      _initialized: true,
    } as OverlayControl["_view"]["controls"][string];
    view.container.style.cssText = `
      display: ${display ? 'inline-block' : 'none'};
      background-image:url(blank);
      z-index:${this._zIndex + zIndex};
      position:absolute;
      left:${left};
      top:${top};
      width:${width};
      height:${height};
      zoom: 1;
      overflow: hidden;
      filter: Alpha(opacity=${alpha}) progid:DXImageTransform.Microsoft.Fade(duration=0.3) ${filter};
    `;
    //view.content.style.cssText = `width:100%; height:100%; display: ${display ? 'inline-block':'none'};`;
    view.content.style.cssText = `position:absolute; overflow: hidden; width:100%; height:100%; display: ${display ? 'inline-block' : 'none'};`;

    
    
    //onclick && view.container.attachEvent('onclick', onclick);
    // *onclick doesn't seem to be working when the srcElement is disappear before firing mouseup.
    //  so observe clicking action on manual.
    let clickTime = 0;
    let clickMovedX = 0;
    let clickMovedY = 0;
    
    const onmousedown = (ev: MSEventObj) => {
      this._hookDisappearing();
      
      if( ev.button !== 1 )
        return;
      clickTime = new Date().getTime();
      clickMovedX = ev.screenX;
      clickMovedY = ev.screenY;
    };

    const onmouseup = (ev: MSEventObj) => {
      this._hookDisappearing();
      if( ev.button === 1 && new Date().getTime() - clickTime < MouseDownDelay && Math.abs(ev.screenX - clickMovedX) < 4 && Math.abs(ev.screenY - clickMovedY) < 4 ) {
        if( !this._baseEvents.onclick || this._baseEvents.onclick(ev) !== false )
          onclick?.(ev);
      }
    };
    
    view.container.attachEvent('onmousedown', onmousedown);
    view.container.attachEvent('onmouseup', onmouseup);
    onmouseout && view.container.attachEvent('onmouseout', onmouseout);
    onmouseover && view.container.attachEvent('onmouseover', onmouseover);
    
    view._onmouseout = onmouseout;
    view._onmouseover = onmouseover;
    view._onmousedown = onmousedown;
    view._onmouseup = onmouseup;
    
    view.content.innerHTML = content || '';
    view.container.appendChild(view.content);
    this._view.baseContainer.appendChild(view.container);

    //this._setEvents();
  }

  updateControl(id:string, newDat: Partial<ControlContentOption>) {
    if( this._disposed )
      return;
    //const _base = id === '_baseContainer';
    const model = this._model[id]; //!_base ? this._model[id] : this._baseModel;
    const model_prev = this._model_prev[id]; //!_base ? this._model_prev[id] : this._baseModel;

    let p: keyof ControlContentOption;
    for( p in newDat ) {
      if( model[p] === newDat[p] )
        continue;
      //@ts-ignore
      model[p] = newDat[p]!;
      switch( p ) {
        case 'onclick':
        case 'onmouseout':
        case 'onmouseover':
        //case 'onmousedown':
        //case 'onmouseup':
          break;
        default:
          // prevent updating the same data
          //if( p === 'content' ) {
            if( model[p] === model_prev[p] )
              continue; // @ts-ignore
            model_prev[p] = model[p];
          //}
          
          this._updated[id][p] = true;
          
          if( p === 'content' && !model.display )
            continue;
          
          ViewUpdater.add(this);
      }
    }
  }
  // invoke from ViewUpdater
  updateView(): void {
    for( const id in this._updated ) {
      //const _base = id === '_baseContainer';
      const model = this._model[id]; //!_base ? this._model[id] : this._baseModel;
      const model_prev = this._model_prev[id]; // !_base ? this._model_prev[id] : this._baseModel;
      if( !model )
        continue;

      const view = this._view.controls[id];
      
      const updated = this._updated[id];
      let p: keyof typeof updated;
      
      let updatedCssText = [];
      for( p in updated ) {
        if( p !== 'initialize' && (!view || !view._initialized) )
          continue;

        switch(p) {
          case 'width':
          case 'height':
          case 'left':
          case 'top':
            //this._view.controls[id].style[p] = this._model[id][p];
            updatedCssText.push(`${p}: ${model[p]}`);
            break;
          case 'display':
            const disp = model[p];
            if( disp )
              updatedCssText.push(`display: inline-block;`);
            if( id !== this._baseModelId ) {
              try {
                view.container.filters.item('DXImageTransform.Microsoft.Fade').apply();
                view.content.style.display = model['display'] ? 'inline-block' : 'none';
                view.container.filters.item('DXImageTransform.Microsoft.Fade').play();
              } catch(e) {}
            }
            //if( !disp )
            //  updatedCssText.push(`display: none;`);
            break;
          case 'addStyle':
            updatedCssText.push(model[p]);
            break;
          case 'content':
            view.content.innerHTML = model[p] || '';
            break;
          case 'initialize':
            this._initializeControlView(id);
            break;
          default:
            throw new Error(`unexpected updated flag ${p}`);
        }
        delete this._updated[id][p];
      }

      if( updatedCssText.length ) {
        if( id === this._baseModelId ) {
          if( /display/.test(updatedCssText.toString()) ) {
            //console.log(updatedCssText, 'red');
            continue;
          }
        }
        view.container.style.cssText += ';' + updatedCssText.join(';');
      }
    }
  }
  getStatus(id: string, attr: keyof ControlContentOption): ControlContentOption[keyof ControlContentOption] {
    return this._model[id]?.[attr];
  }

  addContainerCss(css: string) {
    this.updateControl(this._baseModelId, {
      addStyle: css,
    });
  }
  private _setPartsStyle(attr: keyof MSStyleCSSProperties, val: string | number | boolean) {
    type Keys = keyof typeof this._view.controls;
    for( const p in this._view.controls ) {
      // @ts-ignore
      this._model[p as Keys].runtimeStyle[attr] = val;
    }
  }


  private _showOverlay(flag: boolean = true) {
    if( flag && this._disabled )
      return;
    if( !flag && this._locked )
      return;
    
    //console.log('_showOverlay'+this._UID, 'green');
    for( const p in this._model ) {
      this.updateControl(p, {display: flag});
    }
  }
  showBriefly() {
    this._showOverlay(true);
    if( !this._locked ) {
      this._hookDisappearing();
    }
  }


  // event handlers
  private __mouseOverContainer = (ev: MSEventObj) => {
    //console.log(`OverlayControl#__mouseOver`, 'green');
    if( this._disabled )
      return;
    if( this._baseEvents.onmouseover?.(ev) === false )
      return;
    if( ev.fromElement && this._view.target.contains(ev.fromElement as HTMLElement) )
      return;
    
    ev.cancelBubble = true;
    this._showOverlay(true);
  }
  private __mouseOutContainer = (ev: MSEventObj) => {
    //console.log(`OverlayControl#__mouseOut` + this._UID, 'green');
    if( this._baseEvents.onmouseout?.(ev) === false || this._ignoreMouseOut )
      return;
    if( ev.toElement && this._view.target.contains(ev.toElement as HTMLElement) )
      return;

    this._showOverlay(false);
  }
  /*
  private __mouseClickContainer = (ev: MSEventObj) => {
    //console.log(`OverlayControl#__mouseClick`, 'green');
    if( this._disabled || this._baseEvents.onclick?.(ev) === false )
      return;
    /*
    for( const p in this._model ) {
      const item = this._model[p];
      if( item.onclick?.(ev, this) === false )
        continue;
    }
    */
  //}
  private __mousemoveTimeoutId: number = 0;
  private __mouseMoveContainer = (ev: MSEventObj) => {
    
    if( this._disabled || this._baseEvents.onmousemove?.(ev) === false )
      return;
    this._showOverlay(true);
    
    this._hookDisappearing();
  }
  private _hookDisappearing() {
    clearTimeout(this.__mousemoveTimeoutId);
    if( this._delay > 0 ) {
      this.__mousemoveTimeoutId = window.setTimeout(() => {
        this._showOverlay(false);
      }, this._delay);
    }
  }


  disable(flag = true) {
    this._disabled = flag;
    //this._view.baseContainer.style.display = flag ? 'none' : '';
    this._view.baseBaseContainer.style.display = flag ? 'none' : '';
  }
  isDisabled() {
    return this._disabled;
  }
  lock(flag = true) {
    this._locked = flag;
    this._showOverlay(flag);
  }
  isLocked() {
    return this._locked;
  }
  getControlIds() {
    return this._ids.concat();
  }


  dispose() {
    if( this._disposed )
      return;
    this._disposed = true;

    for( const id in this._model ) {
      delete this._model[id];
      delete this._updated[id];
      const view = this._view.controls[id];
      if( !view )
        continue;
      delete this._view.controls[id];
      
      view.container.style.filter = '';
      view.content.innerHTML = '';

      view._onmousedown && view.container.detachEvent('onmousedown', view._onmousedown);
      view._onmouseup && view.container.detachEvent('onmouseup', view._onmouseup);
      view._onmouseover && view.container.detachEvent('onmouseover', view._onmouseover);
      view._onmouseout && view.container.detachEvent('onmouseout', view._onmouseout);
    }

    this._view.target.detachEvent('onmouseover', this.__mouseOverContainer);
    this._view.target.detachEvent('onmouseout', this.__mouseOutContainer);
    this._view.target.detachEvent('onmousemove', this.__mouseMoveContainer);
    this.__mouseOverContainer = this.__mouseOutContainer = this.__mouseMoveContainer = null as any;

    this._view.target.removeChild(this._view.baseBaseContainer);
    this._view = null as any;
  }

}
