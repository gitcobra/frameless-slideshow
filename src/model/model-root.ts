import { i18n } from "src/i18n/i18n";
import { RootFrameSettingsJSON, RootWindowSettings, WindowFrameSettingsJSON } from "./data-types";
import { ModelWindow } from "./model-window";
import { LangTypes } from "src/i18n/i18n";


export class ModelRoot extends ModelWindow {
  protected _childDialogs: ModelWindow[] = [];
  protected _type = 'root' as const;
  
  constructor(scrX: number, scrY: number)
  constructor(json?: RootFrameSettingsJSON)
  constructor(...args: any[]) {
    let scrX: number|undefined, scrY: number|undefined;
    let json;
    if( typeof args[0] === 'number' ) {
      scrX = args[0];
      scrY = args[1];
    }
    else if( typeof args[0] === 'object' ) {
      json = args[0];
    }

    super(undefined, json);
    if( json ) {
      this._RootWindowSettings = json.root || this._RootWindowSettings;
    }
    
    // set current window position
    if( scrX !== undefined && scrY !== undefined ) {
      this.moveFrame(scrX, scrY);
    }
    
    this._name ??= 'root';
    // reproduce child dialogs from JSON
    /*
    if( json ) {
      const {childDialogs} = json;
      if( childDialogs instanceof Array ) {
        for( const json of childDialogs ) {
          this.createChildDialog(json);
        }
      }
    }
    */
  }
  /*
  createChildDialog(json?: WindowFrameSettingsJSON) {
    const child = new ModelWindow(this, json);
    this._childDialogs.push(child);
    return child;
  }
  getChildDialogModels() {
    return this._childDialogs;
  }
  */
  fireAllSettingEvents() {
    this._fireModelEvent('change-root-settings', this._RootWindowSettings);
    super.fireAllSettingEvents();
  }

  private _RootWindowSettings: RootWindowSettings = {
  };
  setRootWindowSettings(param: Partial<RootWindowSettings>, fireEvent = true) {
    for( const prop in param ) {//@ts-ignore
      this._RootWindowSettings[prop] = param[prop];
    }

    if( fireEvent )
      this._fireModelEvent(`change-root-settings`, {...param});
  }
  getRootWindowSettings<T extends keyof RootWindowSettings>(prop: T) {
    return this._RootWindowSettings[prop];
  }
  getSettingsForWindow(): RootFrameSettingsJSON {
    const json = {
      ...super.getSettingsForWindow(),
      root: this._RootWindowSettings,
      /*
      ...{
        childDialogs: this._getChildrenAsJSON(this._childDialogs) as WindowFrameSettingsJSON[]
      }
      */
    };
    return json;
  }
  protected $L() {
    return `[${this.getUniqueId()}]ModelRoot#`;
  }
}
