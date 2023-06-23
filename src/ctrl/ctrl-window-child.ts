// this subclass is currently unused

import { _ModelBase } from "../model/model-base";
import { _CtrlWindow } from "./ctrl-window-_base";
import { ViewChild } from "../view/view-window-child";
import { EventAttacher } from "../utils/utils";
import { ModelWindow } from "src/model/model-window";
import { CtrlRoot } from "./ctrl-window-root";
import { ModelRoot } from "src/model/model-root";
import { _CtrlBase } from "./ctrl-_base";


/**
 * it controls a "dialog type" child (ModelessDialog)
 */
export class CtrlChild extends _CtrlWindow {
  protected _model!: ModelWindow;
  protected _view!: ViewChild;
  protected _parentCtrl: CtrlRoot;

  protected _winEva!: EventAttacher;
  protected _docEva!: EventAttacher;
  protected _bodyEva!: EventAttacher;
  protected _viewEva!: EventAttacher;
  

  constructor(parent: CtrlRoot, model?: ModelWindow) {
    super();
    this._model = model || new ModelWindow(parent.getModel() as ModelRoot);
    
    this._view = new ViewChild(this._model.getUniqueId());
    this._parentCtrl = parent;

    const doc = this._view.getTargetDocument();
    this._docEva = new EventAttacher(doc, this);
    this._bodyEva = new EventAttacher(doc.body, this);
    this._winEva = new EventAttacher(doc.parentWindow, this);
    this._viewEva = this._docEva;
    
    this._docEva.attach('onclick', () => {
      this._view.showBorder(false);
    });

    this._initializeWindow();
    this._initializeBase();

    this.start();
  }

  close() {
    super.close();
    //this._parentCtrl?.removeChildDialog(this);
  }


  protected $L() {
    return `[${this._model.getUniqueId()}]CtrlChild#`;
  }
}


