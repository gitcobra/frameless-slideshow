// ResizableBorder
// this is a utility to make a HTMLElement or window(also dialog) resizable and draggable
//

export type MovedCoordinates = {
  resizedX: number // resizedX, resizedY mean whether the target position was changed while it was resizing.
  resizedY: number // practically it happens when you drag its left or top border.
  resizedW: number
  resizedH: number
  
  movedX: number
  movedY: number

  snappedX: number
  snappedY: number

  startX: number
  startY: number
  startH: number
  startW: number
  endX: number
  endY: number
  endH: number
  endW: number
};
type ResizableBorderEventListener = (ev: MSEventObj, pos: MovedCoordinates, type: ResizableBorderTypes) => any;

const ResizableBorderTypeList = ['left', 'right', 'top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
export type ResizableBorderTypes = typeof ResizableBorderTypeList[number] | 'move';


export type ResizableBorderOpt = {
  borderWidth?: number
  zIndex?: number
  autoEndDelay?: number
  resizable?: boolean
  draggable?: boolean
  dragTarget?: HTMLElement
  ondragstart?: ResizableBorderEventListener
  ondragmove?: ResizableBorderEventListener
  ondragend?: ((ev?: MSEventObj, pos?: MovedCoordinates, type?: ResizableBorderTypes) => any) | null

  snap?: number
  snapTargets?: ResizableBorder[]
  cancelBubble?: boolean
};


let counter = 0;

export class ResizableBorder {
  static dragging = false;
  private _dragging = false;
  private _draggingType: ResizableBorderTypes = 'move';

  private _capturedElement: HTMLElement | null = null;
  private _target: HTMLElement;
  private _parts: {
    right: HTMLElement
    left: HTMLElement
    top: HTMLElement
    bottom: HTMLElement
    bottomRight: HTMLElement
    bottomLeft: HTMLElement
    topRight: HTMLElement
    topLeft: HTMLElement
  };
  

  private _isWindow = false;
  private _resizable = true;
  private _draggable = true;
  private _snappable = true;
  
  private _startX: number = 0;
  private _startY: number = 0;
  private _startWidth: number = 0;
  private _startHeight: number = 0;
  private _startLeft: number = 0;
  private _startTop: number = 0;
  
  private _autoEndDelay: number = 1400;
  private _autoEndDelayTimeoutId: number = -1;
  
  private _cancelBubble = false;
  private _firstMoving = false;
  
  private _snap = 0;
  private _snapTargets: null | ResizableBorder[] = null;

  
  private _disposed = false;
  ondragstart: ResizableBorderEventListener | null;
  ondragmove: ResizableBorderEventListener | null;
  ondragend: ((ev?: MSEventObj, pos?: MovedCoordinates) => any) | null;

  constructor(target: HTMLElement, opt?: ResizableBorderOpt) {
    // get document
    const doc = target.ownerDocument;
    if( !doc )
      throw new Error('could not get a Document object from the target');
    if( target === doc.body ) {
      this._isWindow = true;
    }

    // get parameter
    const { resizable, draggable, zIndex=100000, borderWidth=6, ondragstart, ondragmove, ondragend, autoEndDelay, snap=0, snapTargets, cancelBubble } = opt || {};
    this._resizable = resizable ?? true;
    this._draggable = draggable ?? true;
    this.ondragstart = ondragstart || null;
    this.ondragmove = ondragmove || null;
    this.ondragend = ondragend || null;
    this._autoEndDelay = autoEndDelay ?? this._autoEndDelay;
    this._cancelBubble = !!cancelBubble;
    this._snap = snap || this._snap;
    this._snapTargets = snapTargets || this._snapTargets;
    
    // create parts
    this._parts = {
      right: doc.createElement('span'),
      left: doc.createElement('span'),
      top: doc.createElement('span'),
      bottom: doc.createElement('span'),
      bottomRight: doc.createElement('span'),
      bottomLeft: doc.createElement('span'),
      topRight: doc.createElement('span'),
      topLeft: doc.createElement('span'),
    };
    // set id for readability
    counter++
    for( const p in this._parts ) {
      this._parts[p as keyof typeof this._parts].id = 'ResizableBorder_' + p + '_' + counter;
    }

    
    // set CSS
    this._parts.right.style.cssText = `background-image:url(blank); right:0px; top:0px; cursor:col-resize; z-index:${zIndex}; position:absolute; width:${borderWidth}px; height:100%; font-size:1px;`;
    this._parts.left.style.cssText = `background-image:url(blank); left:0px; top:0px; cursor:col-resize; z-index:${zIndex}; position:absolute; width:${borderWidth}px; height:100%; font-size:1px;`;
    this._parts.top.style.cssText = `background-image:url(blank); left:0px; top:0px; cursor:row-resize; z-index:${zIndex}; position:absolute; width:100%; height:${borderWidth}px; font-size:1px;`;
    this._parts.bottom.style.cssText = `background-image:url(blank); left:0px; bottom:0px; cursor:row-resize; z-index:${zIndex}; position:absolute; width:100%; height:${borderWidth}px; font-size:1px;`;
    this._parts.bottomLeft.style.cssText = `background-image:url(blank); left:0px; bottom:0px; cursor:SW-resize; z-index:${zIndex+2}; position:absolute; width:${borderWidth*2}px; height:${borderWidth*2}px; font-size:1px;`;
    this._parts.topLeft.style.cssText = `background-image:url(blank); left:0px; top:0px; cursor:NW-resize; z-index:${zIndex+3}; position:absolute; width:${borderWidth*2}px; height:${borderWidth*2}px; font-size:1px;`;
    this._parts.topRight.style.cssText = `background-image:url(blank); right:0px; top:0px; cursor:NE-resize; z-index:${zIndex+1}; position:absolute; width:${borderWidth*2}px; height:${borderWidth*2}px; font-size:1px;`;
    this._parts.bottomRight.style.cssText = `background-image:url(blank); right:0px; bottom:0px; cursor:SE-resize; z-index:${zIndex+4}; position:absolute; width:${borderWidth*2}px; height:${borderWidth*2}px; font-size:1px;`;
    // append
    const container = this._isWindow ? doc.body : target as HTMLElement;
    this._target = container;
    try {
      container.appendChild(this._parts.right);
      container.appendChild(this._parts.left);
      container.appendChild(this._parts.top);
      container.appendChild(this._parts.bottom);
      container.appendChild(this._parts.bottomRight);
      container.appendChild(this._parts.bottomLeft);
      container.appendChild(this._parts.topLeft);
      container.appendChild(this._parts.topRight);
    } catch(e) {
      throw new Error(`failed to appendChild. ResizableBox required a container type element. passed a "${container.nodeName}"`);
    }
    
    // set hasLayout
    if( !container.currentStyle.hasLayout ) {
      if( container.currentStyle.position !== 'absolute' ) {
        container.style.position = 'absolute';
        container.style.pixelLeft = container.offsetLeft;
        container.style.pixelTop = container.offsetTop;
        container.style.width = container.offsetWidth + 'px';
        container.style.pixelHeight = container.offsetHeight;
      }
      container.style.zoom = '1';
    }




    this._setEvents();
  }
  setDraggable(flag = true) {
    this._draggable = flag;
  }
  setResizable(flag = true) {
    this._resizable = flag;
    for( const p in this._parts ) {
      const node = this._parts[p as keyof typeof this._parts];
      node.style.display = flag ? 'inline-block' : 'none';
    }
  }
  setSnapTarget(list: ResizableBorder[]) {
    this._snapTargets = list;
  }
  setSnappable(flag = true) {
    this._snappable = flag;
  }
  setStartedBoxPosition(pos: {w?: number, h?: number, x?: number, y?: number}) {
    this._startWidth = pos.w ?? this._startWidth;
    this._startHeight = pos.h ?? this._startHeight;
    this._startLeft = pos.x ?? this._startLeft;
    this._startTop = pos.y ?? this._startTop;
  }

  private _setPartsStyle(attr: keyof MSStyleCSSProperties, val: string | number | boolean) {
    type Keys = keyof typeof this._parts;
    for( const p in this._parts ) {
      // @ts-ignore
      this._parts[p as Keys].runtimeStyle[attr] = val;
    }
  }

  private _setEvents() {
    this.__dragStart__binded = (ev) => this.__dragStart(ev);
    this.__dragMove__binded = (ev) => this.__dragMove(ev);
    this.__dragEnd__binded = (ev?) => this.__dragEnd(ev);
    this._target.attachEvent('onmousedown', this.__dragStart__binded);
  }
  // event handlers
  private __dragStart(ev: MSEventObj) {
    console.log(`#__dragStart(before)`);
    
    // decide drag type
    let type: ResizableBorderTypes;
    switch( ev.srcElement ) {
      case this._parts.left:
        type = 'left';
        break;
      case this._parts.right:
        type = 'right';
        break;
      case this._parts.top:
        type = 'top';
        break;
      case this._parts.bottom:
        type = 'bottom';
        break;
      case this._parts.topLeft:
        type = 'top-left';
        break;
      case this._parts.topRight:
        type = 'top-right';
        break;
      case this._parts.bottomRight:
        type = 'bottom-right';
        break;
      case this._parts.bottomLeft:
        type = 'bottom-left';
        break;
      default:
        type = 'move';
        break;
    }
    this._draggingType = type;

    if( !this._draggable && !this._resizable || ResizableBorder.dragging )
      return;
    if( this._capturedElement || ev.button !== 1 )
      return;
    if( this.ondragstart?.(ev, this._calculateMovedCoordinates(ev), type) === false )
      return;
    
    console.log(`#__dragStart(start)`);
    ResizableBorder.dragging = true;
    this._dragging = true;
    
    if( this._cancelBubble )
      ev.cancelBubble = true;
    

    this._startX = ev.screenX;
    this._startY = ev.screenY;
    this._startWidth = this._isWindow ? document.body.offsetWidth : this._target.offsetWidth;
    this._startHeight = this._isWindow ? document.body.offsetHeight : this._target.offsetHeight;
    this._startLeft = this._isWindow ? window.screenLeft : this._target.offsetLeft;
    this._startTop = this._isWindow ? window.screenTop : this._target.offsetTop;
    
    
    this._firstMoving = false;
    //const element = type === 'move' ? this._target : ev.srcElement as HTMLElement;
    this._capturedElement = type === 'move' ? this._target : ev.srcElement as HTMLElement;
    //this._capturedElement.setCapture(true);

    this._target.attachEvent('onmousemove', this.__dragMove__binded);
    this._target.attachEvent('onmouseup', this.__dragEnd__binded);
    //this._draggingElement.attachEvent('onclick', this.__dragEnd__binded);

    if( !this._resizable ) {
      this._setPartsStyle('cursor', 'not-allowed');
    }

    this._setAutoEnd();
  }
  private _setAutoEnd() {
    if( this._autoEndDelay ) {
      clearTimeout(this._autoEndDelayTimeoutId);
      this._autoEndDelayTimeoutId = window.setTimeout(() => {
        this.__dragEnd__binded();
      }, this._autoEndDelay);
    }
  }
  private __dragMove(ev: MSEventObj) {
    //console.log('#__dragMove', 'green');

    // initialize when first moving
    if( !this._firstMoving ) {
      this._firstMoving = true;
      this._capturedElement?.setCapture(true);
    }

    const movedCoordinates = this._calculateMovedCoordinates(ev);
    this.ondragmove?.(ev, movedCoordinates, this._draggingType);
    this._setAutoEnd();
  }
  private __dragEnd(ev?: MSEventObj) {
    console.log('#__dragEnd');
    this.ondragend?.(ev, ev && this._calculateMovedCoordinates(ev));
    this._target?.detachEvent('onmousemove', this.__dragMove__binded);
    this._target?.detachEvent('onmouseup', this.__dragEnd__binded);
    //this._draggingElement?.detachEvent('onclick', this.__dragEnd__binded);
    this._capturedElement?.releaseCapture();
    this._capturedElement = null;
    ResizableBorder.dragging = false;
    this._dragging = false;

    if( !this._resizable ) {
      this._setPartsStyle('cursor', '');
    }

    clearTimeout(this._autoEndDelayTimeoutId);
  }
  private __dragStart__binded!: (ev: MSEventObj) => void;
  private __dragMove__binded!: (ev: MSEventObj) => void;
  private __dragEnd__binded!: (ev?: MSEventObj) => void;

  private _calculateMovedCoordinates(ev: MSEventObj): MovedCoordinates {
    // diff for resize
    let xdif = 0;
    let ydif = 0;
    let wdif = 0;
    let hdif = 0;
    // diff for container position
    let containerXdif = 0;
    let containerYdif = 0;

    // resizable parts 
    switch(this._draggingType) {
      // 4 lines
      case 'right':
        wdif = (ev.screenX - this._startX);
        break;
      case 'bottom':
        hdif = (ev.screenY - this._startY);
        break;
      case 'top':
        hdif = - (ev.screenY - this._startY);
        ydif = ev.screenY - this._startY;
        break;
      case 'left':
        wdif = - (ev.screenX - this._startX);
        xdif = ev.screenX - this._startX;
        break;
      
      // 4 corners
      case 'bottom-right':
        wdif = (ev.screenX - this._startX);
        hdif = (ev.screenY - this._startY);
        break;
      case 'bottom-left':
        wdif = - (ev.screenX - this._startX);
        xdif = ev.screenX - this._startX;
        hdif = (ev.screenY - this._startY);
        break;
      case 'top-left':
        wdif = - (ev.screenX - this._startX);
        xdif = ev.screenX - this._startX;
        hdif = - (ev.screenY - this._startY);
        ydif = ev.screenY - this._startY;
        break;
      case 'top-right':
        hdif = - (ev.screenY - this._startY);
        ydif = ev.screenY - this._startY;
        wdif = (ev.screenX - this._startX);
        break;

      // dragging the container
      default:
        containerXdif = (ev.screenX - this._startX);
        containerYdif = (ev.screenY - this._startY);
        break;
    }

    if( !this._draggable ) {
      containerXdif = 0;
      containerYdif = 0;
    }
    if( !this._resizable ) {
      xdif = 0;
      ydif = 0;
      wdif = 0;
      hdif = 0;
    }

    const pos = {
      resizedX: xdif,
      resizedY: ydif,
      resizedW: wdif,
      resizedH: hdif,
      movedX: containerXdif,
      movedY: containerYdif,

      snappedX: 0,
      snappedY: 0,
      
      startX: this._startX,
      startY: this._startY,
      startW: this._startWidth,
      startH: this._startHeight,
      endX: this._startX + xdif,
      endY: this._startY + ydif,
      endW: this._startWidth + wdif,
      endH: this._startHeight + hdif,
    };
    
    if( this._snap > 0 && this._snappable ) {
      this._calculateSnappedCoordinates(pos);
    }

    return pos;
  }
  private _calculateSnappedCoordinates(pos: MovedCoordinates) {
    const leftBorder = this._startLeft + pos.movedX + pos.resizedX;
    const topBorder = this._startTop + pos.movedY + pos.resizedY;
    const rightBorder = leftBorder + this._startWidth + pos.resizedW;
    const bottomBorder = topBorder + this._startHeight + pos.resizedH;
    
    let snappedXdif = this._snap * 2;
    let snappedYdif = this._snap * 2;
    let targets = this._snapTargets || [];
    if( this._isWindow ) { // if current dragging target is window, set the screen as a snap target 
      const win = this._target.ownerDocument!.parentWindow || {};
      const targ = {
        _target: {
          offsetLeft: 0,
          offsetTop: 0,
          offsetWidth: screen.availWidth,
          offsetHeight: screen.availHeight,
        }
      };
      targets = [targ as any];
    }
    
    for( const targ of targets ) {
      if( targ === this || targ._disposed )
        continue;
      
      const telm = targ._target;
      const tleft = telm.offsetLeft;
      const ttop = telm.offsetTop;
      const tright = tleft + telm.offsetWidth;
      const tbottom = ttop + telm.offsetHeight;

      //console.log([tleft, ttop, tright, tbottom]);
      //console.log([leftBorder, topBorder, rightBorder, bottomBorder]);

      if( Math.abs(leftBorder - tleft) <= this._snap )
        if( Math.abs(snappedXdif) > Math.abs(tleft - leftBorder) )
          snappedXdif = tleft - leftBorder || snappedXdif;
      if( Math.abs(leftBorder - tright) <= this._snap )
        if( Math.abs(snappedXdif) > Math.abs(tright - leftBorder) )
          snappedXdif = tright - leftBorder || snappedXdif;
      if( Math.abs(rightBorder - tleft) <= this._snap )
        if( Math.abs(snappedXdif) > Math.abs(tleft - rightBorder) )
          snappedXdif = tleft - rightBorder || snappedXdif;
      if( Math.abs(rightBorder - tright) <= this._snap )
        if( Math.abs(snappedXdif) > Math.abs(tright - rightBorder) )
          snappedXdif = tright - rightBorder || snappedXdif;

      if( Math.abs(topBorder - ttop) <= this._snap )
        if( Math.abs(snappedYdif) > Math.abs(ttop - topBorder) )
          snappedYdif = ttop - topBorder || snappedYdif;
      if( Math.abs(topBorder - tbottom) <= this._snap )
        if( Math.abs(snappedYdif) > Math.abs(tbottom - topBorder) )
          snappedYdif = tbottom - topBorder || snappedYdif;
      if( Math.abs(bottomBorder - ttop) <= this._snap )
        if( Math.abs(snappedYdif) > Math.abs(ttop - bottomBorder) )
          snappedYdif = ttop - bottomBorder || snappedYdif;
      if( Math.abs(bottomBorder - tbottom) <= this._snap )
        if( Math.abs(snappedYdif) > Math.abs(tbottom - bottomBorder) )
          snappedYdif = tbottom - bottomBorder || snappedYdif;
    }

    //console.log([snappedYdif]);
    pos.snappedX = Math.abs(snappedXdif) <= this._snap ? snappedXdif : 0;
    pos.snappedY = Math.abs(snappedYdif) <= this._snap ? snappedYdif : 0;
    //console.log([pos.snappedX, pos.snappedY]);
  }

  dispose() {
    console.log('ResizableBox#dispose');
    if( this._disposed )
      return;
    this._disposed = true;

    this.ondragstart = null as any;
    this.ondragmove = null as any;
    this.ondragend = null as any;
    
    this._target.detachEvent('onmousedown', this.__dragStart__binded);
    this._target.detachEvent('onmousemove', this.__dragMove__binded);
    this._target.detachEvent('onmouseup', this.__dragEnd__binded);
    
    if( this._dragging ) {
      this.__dragEnd__binded();
    }
    this.__dragStart__binded = null as any;
    this.__dragMove__binded = null as any;
    this.__dragEnd__binded = null as any;
    this.ondragstart = this.ondragmove = this.ondragend = null as any;
    clearTimeout(this._autoEndDelayTimeoutId);

    const target = this._target;
    type Keys = keyof typeof this._parts;
    for( const p in this._parts ) {
      target.removeChild(this._parts[p as Keys] as HTMLElement);
      this._parts[p as Keys] = null as any;
    }

    this._target = null as any;
    this._capturedElement = null as any;
  }
}
