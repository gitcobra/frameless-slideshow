import { BoxPosition, ElementFrameSettingsJSON, FrameSettingsJSON, WindowFrameSettingsJSON, WindowSettings } from "./data-types";
import { ModelEventHandlers, _ModelBase } from "./model-base";
import { ModelElement } from "./model-element";

import WallpaperInfo from "../utils/wallpaper-info";
import { ImgInfoDatabase, ImgInfo } from "./img-database";



let counter = 0;
export class ModelWindow extends _ModelBase {
  protected _wallPaperData: any | null = null;
  protected _childElements: ModelElement[] = [];
  protected _childNameBank: { [name: string]: ModelElement } = {};
  protected _type: 'window' | 'root' = 'window';
  protected _parent: ModelWindow | null = null;
  private _initializedWindow = false;
  
  getParent() {
    return this._parent;
  }
  private _WindowSettings: WindowSettings = {
  };
  setWindowSettings(param: Partial<WindowSettings>, fireEvent = true) {
    for( const prop in param ) {//@ts-ignore
      this._WindowSettings[prop] = param[prop];
    }

    if( fireEvent )
      this._fireModelEvent(`change-window-settings`, {...param});
  }
  getWindowSettings(prop: keyof WindowSettings) {
    return this._WindowSettings[prop];
  }
  
  constructor(parent?:ModelWindow, json?: WindowFrameSettingsJSON) {
    super(json);
    this._name ??= '_window' + counter++;
    this._parent = parent!;

    if( json ) {
      this._WindowSettings = json.window || this._WindowSettings;

      // reproduce child elements from JSON
      const {childElements} = json;
      if( childElements instanceof Array ) {
        for( const json of childElements ) {
          this.createChildElement(json);
        }

        // reset children z-index
        const list = this._childElements.concat();
        list.sort((a, b) => a.getElementSettings('zIndex') > b.getElementSettings('zIndex') ? 1 : -1 );
        for( const item of list ) {
          item.setForegroundZIndex();
        }
      }
    }

    this.updateWallpaper();

    this._initializedWindow = true;
  }
  createChildElement(json?: FrameSettingsJSON) {
    const child = new ModelElement(this, json);
    this._childElements.push(child);
    this._childNameBank[child.getName()] = child;
    return child;
  }
  removeChild(item: ModelElement) {
    delete this._childNameBank[item.getName()];
    for( let i = this._childElements.length; i--; ) {
      if( this._childElements[i] === item ) {
        this._childElements.splice(i, 1);
        break;
      }
    }
  }
  nameExists(name: string ) {
    return !!this._childNameBank[name];
  }

  getChildElementModels() {
    return this._childElements;
  }
  resizeFrame(w: number, h: number) {
    super.resizeFrame(w, h);
    
    // why it needs this flag is because resizeFrame can be called from the super constructor before it finishes constructing this instance
    if( this._initializedWindow )
      this._resetChildElementPositions();
  }
  getFramePos(): BoxPosition {
    return this._regulateFrameCoordinates();//this._framePos;
  }
  private _resetChildElementPositions() {
    console.log(`${this.$L()}_resetChildElementPositions`, 'olive');
    for( const child of this._childElements ) {
      //child.regulateFrameCoordinates();
      //child.calculateFramePositionFromFrameSize();
      //child.load();
    }
  }
  getWallPaper() {
    return this._wallPaperData;
  }
  updateWallpaper() {
    // create wallpaper data
    const wp = WallpaperInfo.getWallpaperData();
    if( wp ) {
      this._wallPaperData = wp;
      if( wp.path ) {
        ImgInfoDatabase.request(wp?.path, (img) => {
          if( img.success ) {
            wp.width = img.width;
            wp.height = img.height;
            setTimeout( () => this._fireModelEvent('change-wallpaper', wp), 0 );
          }
        });
      }
      else {
        this._fireModelEvent('change-wallpaper', wp);
      }
    }
  }
  toJsonText(): string {
    return JSON.stringify(this.getSettingsForWindow(), null, 2);
  }
  protected getSettingsForWindow(): WindowFrameSettingsJSON {
    const base = super.getSettings();
    const json = {
      frame: base.frame,
      misc: base.misc,
      ...{
        childElements: this._getChildrenAsJSON(this._childElements) as ElementFrameSettingsJSON[],
        window: this._WindowSettings,
      }
    };
    return json;
  }
  protected _getChildrenAsJSON<T extends ModelWindow | ModelElement>(list: T[]): (WindowFrameSettingsJSON | FrameSettingsJSON)[] {
    const result: (WindowFrameSettingsJSON | FrameSettingsJSON)[] = [];
    for( let i=list.length; i--; ) {
      result[i] = list[i].getSettings()
    }
    return result;
  }

  protected $L() {
    return `[${this.getUniqueId()}]ModelWindow#`;
  }
}

