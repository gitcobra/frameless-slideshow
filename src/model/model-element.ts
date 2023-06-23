import { ElementFrameSettingsJSON, ElementSettings, FrameSettingsJSON } from "./data-types";
import { ModelEventHandlers, _ModelBase } from "./model-base";
import { ModelRoot } from "./model-root";
import { ModelWindow } from "./model-window";


let counter = 0;
let zIndexMax = 1;
let zIndexMin = 0;

export class ModelElement extends _ModelBase {
  protected _type = 'element' as const;
  protected _parent: ModelWindow | ModelRoot;
  constructor(parent: ModelWindow | ModelRoot, json?: FrameSettingsJSON | ElementFrameSettingsJSON ) {
    super(json);
    if( json ) {
      if( 'element' in json )
        this._ElementSettings = json.element;
      
      // check values
      if( typeof this._ElementSettings.zIndex !== 'number' ) {
        this.setForegroundZIndex();
      }
    }

    counter++;
    this._parent = parent;
    this._name = this._name || 'Frame' + counter;
    
    while( this._parent.nameExists(this._name) ) {
      this._name = this._name + '_';
    }
  }

  private _ElementSettings: ElementSettings = {
    zIndex: zIndexMax,
    disableOverlay: false,
    overlayLocked: false,
  };
  setElementSettings(param: Partial<ElementSettings>, fireEvent = true) {
    for( const prop in param ) {//@ts-ignore
      this._ElementSettings[prop] = param[prop];
    }

    if( fireEvent )
      this._fireModelEvent(`change-element-settings`, {...param});
  }
  getElementSettings<T extends keyof ElementSettings>(prop: T) {
    return this._ElementSettings[prop];
  }
  getSettings(): ElementFrameSettingsJSON {
    const json = {
      ...super.getSettings(),
      element: this._ElementSettings,
    };
    return json;
  }
  fireAllSettingEvents() {
    super.fireAllSettingEvents();
    console.log(`${this.$L()}fireAllSettingEvents(element)`, 'olive');
    this._fireModelEvent('change-element-settings', this._ElementSettings);
    this._fireModelEvent('playlist-update', this._list.getLength());
  }


  getParent() {
    return this._parent;
  }
  updateZIndex() {
    this._fireModelEvent('change-element-settings', {zIndex: this._ElementSettings.zIndex});
  }
  setForegroundZIndex() {
    this._ElementSettings.zIndex = zIndexMax++;
    this._fireModelEvent('change-element-settings', {zIndex: this._ElementSettings.zIndex});
  }
  setBackgroundZIndex() {
    this._ElementSettings.zIndex = zIndexMin--;
    this._fireModelEvent('change-element-settings', {zIndex: this._ElementSettings.zIndex});
  }

  copyModelSettings(): ElementFrameSettingsJSON {
    const model = this;
    return {
      ...super.copyModelSettings(),
      element: {...this._ElementSettings},
    };
  }


  protected $L() {
    return `[${this.getUniqueId()}]ModelElement#`;
  }
  dispose() {
    if( this._parent ) {
      this._parent.removeChild(this);
    }
    super.dispose();
  }
}
