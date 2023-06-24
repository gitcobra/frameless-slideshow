/**
 * Root Controller. 
 * it controls HTA document itself. it must be created only one instance.
 */

import { _ModelBase } from "../model/model-base";
import { _CtrlWindow } from "./ctrl-window-_base";
import { CtrlChild } from "./ctrl-window-child";
import { ViewRoot } from "../view/view-window-root";

import { EventAttacher } from "../utils/utils";
import { ModelRoot } from "src/model/model-root";
import * as fs from "../utils/filesystem";
import { XYPos } from "src/model/data-types";
import HtaContextMenu from "hta-ctx-menu";
import {getRootCtxMenuParameter} from "./context-menu";
import { $t, i18n } from "../i18n/i18n";
import { ImgInfo } from "src/model/img-database";
import { _CtrlBase } from "./ctrl-_base";
import WallpaperInfo from "src/utils/wallpaper-info";

import AboutHTML from "../../res/about.html";
import Version from "../../script/version.json";

const AppTitle = 'Frameless Slideshow';
const AuthorName = 'github.com/gitcobra';
const GithubUrl = 'https://github.com/gitcobra/frameless-slideshow';

const AutosaveFileName = 'autosave.flss';
const AssociatedFileExt = 'flss';
const AutoSaveDelay = 16000;


let _leakedMemory = 1024 * 1024 * 80; // HTA base memory size
let LeakedMemoryLimit = 1024 * 1024 * 600; // maximum leaked memory limit
const _leakedMemoryLoadedPathFlags: { [path: string]: boolean } = {};
const UserIdlingTimeForAutoRefresh = 1000 * 10;

export class CtrlRoot extends _CtrlWindow {
  //protected _menu = ctxmenu;
  protected _model!: ModelRoot;
  protected _view!: ViewRoot;
  protected _winEva!: EventAttacher;
  protected _docEva!: EventAttacher;
  protected _bodyEva!: EventAttacher;
  protected _viewEva!: EventAttacher;

  private _childDialogs: CtrlChild[] = [];
  protected _parentCtrl = null;
  private _brandNewPos: null | XYPos = null;
  protected _savePath = '';
  private _manuallySaved = false;

  constructor(model?: ModelRoot, filePath?: string) {
    super();
    
    let name = 'noname';
    if( model instanceof ModelRoot ) {
      this._model = model;
      this._savePath = filePath || '';
      this.changeNameByPath(this._savePath);
    }
    else {
      this._model = new ModelRoot();
      this._brandNewPos = {x: window.screenLeft, y: window.screenTop};
      this._model.setName(name);
    }
    
    
    /*
    const dialogs = this._model.getChildDialogModels();
    for( const model of dialogs ) {
      this._childDialogs.push( new CtrlChild(this, model) );
    }
    */

    this._initialize();
  }
  
  // must call this at the start
  private _initialize() {
    this._view = new ViewRoot(this._model.getUniqueId());
    this._viewEva = new EventAttacher(document, this);
    this._winEva = new EventAttacher(window, this);
    this._docEva = new EventAttacher(document, this);
    this._bodyEva = new EventAttacher(document.body, this);

    this._initializeWindow();
    this._initializeBase();
    this._setRootEvents();

    // initialize starting window position
    if( this._brandNewPos ) {
      this._model.setFrameSettings({
        'offsetX': this._brandNewPos.x,
        'offsetY': this._brandNewPos.y,
      });
      this._model.moveFrame(this._brandNewPos.x, this._brandNewPos.y);
    }
  }

  private _setRootEvents() {
    this._winEva.attach('onbeforeunload', (ev) => this._onUnload(ev) );
    this._model.addModelEvent('change-root-settings', (param) => {
      if( param.lang ) {
        i18n.change(param.lang);
      }
    });
  }
  
  // HTA can't prevent closing window when onunload event fired.
  // So it just saves flss file.
  private _onUnload(ev: MSEventObj) {
    if( !this._savePath )
      return;
    
    if( this._manuallySaved )
      return;
    
    if( this._lastAutosavedTime ) {
      if( new Date().getTime() - this._lastAutosavedTime < 10000 )
        return;
    }
    
    this.save(this._savePath);
    //ev.returnValue = false;
  }
  protected _onKeyPress(ev: MSEventObj) {
    console.log(`${this.$L()}_onKeyPress(root)`, 'green');
    switch( ev.keyCode ) {
      case 115: // F4
        // +CTRL close frame
        if( ev.ctrlKey ) {
          this.removeSelectedChildElements();
          if( this._childElements.length ) {
            this.addToSelectedElementList(this._childElements[this._childElements.length - 1]);
          }
        }

        // +ALT close window
        if( ev.altKey ) {
          ev.cancelBubble = true;
          ev.returnValue = false;
          if( this.confirmSaveBeforeExit() ) {
            this.close();
          }
        }
        return;
      case 116: // F5 RELOAD
        /*
        if( !this.confirmSaveBeforeExit() ) {
          // cancel realod
          ev.cancelBubble = true;
          ev.returnValue = false;
        }
        this.loadSaveFile(this._savePath);
        this.close();
        */
        DEV: {
          return;
        }
        this._model.updateWallpaper();

        // cancel realod
        ev.cancelBubble = true;
        ev.returnValue = false;
        return;
    }
    
    super._onKeyPress(ev);
  }


  confirmSaveBeforeExit() {
    if( this._savePath ) {
      this.save(this._savePath);
    }
    else {
      if( !this._savePath && this._childElements.length ) {
        if( confirm($t('confirm-save-beforeclose')) ) {
          if( !this.saveAs() )
            return false;
        }
      }
      if( !this._savePath && this._childElements.length && !confirm($t('confirm-nosave-exiting')) )
        return false;
    }
    this._manuallySaved = true;
    return true;
  }
  confirmToExitWithoutSaving() {
    const result = !this._childElements.length || confirm($t('confirm-exit-without-saving'));
    if( result ) {
      this._manuallySaved = true;
    }
    return result;
  }

  openSaveAsDialog(param: {
    path?: string
    message?: string
    title?: string
    target?: "desktop" | "documents" | "folder"
    extension?: string
  } = {}): string {
    
    const args = {...param, fs};
    let result = '';
    do {
      result = window.showModalDialog('html/save-as.hta', args, `resizable:1; center:1; status:0; scroll:0;`);
      if( !result || !/[^\\]+$/.test(result) )
        break;
      
      // add file extension
      const ext = param.extension;
      if( ext ) {
        result = result.replace(RegExp(`\\.${ext.replace(/(?=[$\\.*+?()\[\]{}|^])/g, '\\')}$`, 'i'), '') + '.' + ext;
      }

      if( fs.fso.FolderExists(result) ) {
        alert( $t('alert-same-folder-name') );
      }
      else if( !fs.fso.FileExists(result) )
        break;
      else {
        const fname = fs.fso.GetFileName(result);
        if( confirm($t('confirm-file-overwrite', fname)) )
          break;
      }
      args.path = result;
    } while(true)
    
    return result || '';
  }
  saveAs(apath?: string) {
    const savepath = apath || this._savePath || 'slideshow.flss';
    const path = this.openSaveAsDialog({path: savepath, extension:'flss'});
    if( !path ) {
      return false;
    }
    if( !this.save(path) ) {
      return false;
    }
    this._savePath = path;
    this.changeNameByPath(path);
    return true;
  }
  save(path: string) {
    const savedata = this.getModel().toJsonText();
    try {
      const fp = fs.fso.CreateTextFile(path, true , true);
      fp.WriteLine(savedata);
      fp.Close();
      return true;
    } catch(e: any) {
      alert(e.message);
      return false;
    }
  }

  changeNameByPath(path: string) {
    const name = path.replace(/^.+[\\/](?=[^\\/]+$)|\.flss$/ig, '') || '';
    if( name ) {
      this._model.setName(name);
      document.title = name + ' - FLSS';
    }
  }
  createAppShortcut() {
    try {
      const desktop = fs.WshShell.SpecialFolders('Desktop');
      //fs.createShortcut(desktop + '\\' + AppTitle, `"${CtrlRoot.fullPath}"`, ``, CtrlRoot.parentDirectory, CtrlRoot.parentDirectory + `slideshow.ico`);
      fs.createShortcut(desktop + '\\' + AppTitle, `"${CtrlRoot.wsfPath}"`, ``, CtrlRoot.parentDirectory, CtrlRoot.appRoot + `img/slideshow.ico`);
      alert('the shortcut has been created on Desktop.');
    } catch(e: any) {
      alert(e.message);
    }
  }
  createShortcut(scutpath: string = '') {
    if( !this._savePath ) {
      if( !confirm($t('confirm-save-before-createshortcut')) ) {
        return;
      }
      if( !this.saveAs() )
        return;
    }
    
    if( !scutpath ) {
      scutpath = this.openSaveAsDialog({
        //name: 'shortcut',
        message: $t('saveas-message-shortcut'),
        title: $t('saveas-title-shortcut'),
      });
      if( !scutpath )
        return;
    }
    
    fs.createShortcut(scutpath, `"${CtrlRoot.fullPath}"`, `"${this._savePath}"`, CtrlRoot.parentDirectory, CtrlRoot.appRoot + `img/slideshow.ico`);
  }
  setAssociation() {
    try {
      fs.setAssociation({
        name: AppTitle,
        path: `mshta.exe "${CtrlRoot.fullPath}" "%1"`,
        extensions: [AssociatedFileExt],
        description: '',
        icon: CtrlRoot.appRoot + `img/slideshow.ico`,
      });
      alert($t('message-done-association'));
    } catch(e: any) {
      alert(e.message);
    }
  }
  removeAssociation() {
    try {
      fs.removeAssociation({
        name: AppTitle,
        extensions: [AssociatedFileExt],
      });
      alert($t('message-removed-association'));
    } catch(e: any) {
      alert(e.message);
    }
  }
  createStartup() {
    const startup = fs.getStartupPath() + '\\FramelessSlideshow-test';// + this._model.getName();
    this.createShortcut(startup);
  }
  openStartupFolder() {
    const startup = fs.getStartupPath();
    fs.shellExecute(startup);
  }
  openSendToFolder() {
    const startup = fs.getSendToPath();
    fs.shellExecute(startup);
  }
  openZipFolder() {
    const tmp = fs.getTempPath();
    fs.shellExecute(tmp);
  }
  openWebSite() {
    fs.shellExecute(GithubUrl);
  }

  // monitor test
  getMonitors() {
    var ps = fs.WshShell.Exec("powershell -Command Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::AllScreens");
    ps.StdIn.Close();
    var monitor_info = "monitors " + ps.StdOut.ReadAll();
    alert(monitor_info);
  }

  activeSlideshowsExist(): boolean {
    /*
    for( const item of this._childDialogs )
      if( item.getModel().isPlayingSlideShow() )
        return true;
    */
    for( const item of this._childElements )
      if( item.getModel().isPlayingSlideShow() )
        return true;
    return false;
  }
  
  // for contextmenu
  getCtxMenuParameter(): HtaContextMenu["Types"]["MenuItemParameterOrNull"][] {
    return getRootCtxMenuParameter(this);
  }
  getModel() {
    return this._model;
  }

  // auto reload the application when the leaked memory exceeded the limit
  checkLeakedMemoryLimit(item:_CtrlBase, idat: ImgInfo) {
    const{path, width, height} = idat;
    if( item.getView().getViewImageQuality() !== 'high' )
      return;
    
    if( !_leakedMemoryLoadedPathFlags[path] ) { // leak is occurred only once each path
      _leakedMemoryLoadedPathFlags[path] = true;
      _leakedMemory += width * height / 4; // *the calculation has no basis
      
      console.log(`leaked: ${_leakedMemory/1024/1024} MB`, 'lime');
      if( _leakedMemory > LeakedMemoryLimit ) {
        this._hookAutoRefresh();
      }
    }
  }
  getAboutHTML() {
    const V = Version;
    const html = AboutHTML
      .replace('${Title}', AppTitle)
      .replace('${Icon}', 'img/slideshow.ico')
      .replace('${Version}', `${V.major}.${V.minor}.${V.build}${V.tag}`)
      .replace('${Author}', AuthorName);
      ;
    return html;
  }

  private _hookedAutoReresh = false;
  private _timeoutIdForAutoRefresh = -1;
  private _autoRefreshSeconds = -1;
  private _hookAutoRefresh() {
    if( this._hookedAutoReresh )
      return;
    this._hookedAutoReresh = true;
    
    this._createOverlayControls();
    this.info($t('message-leaked-memory-exceeded', LeakedMemoryLimit / 1024 / 1024|0), 'alert');
    this.stopAllSlideshows(true);
    if( this._savePath )
      this.observeUserIdlingTimeAndRestart();
    else {
      this.info($t('message-ask-save-and-restart'), 'alert');
    }
  }
  observeUserIdlingTimeAndRestart() {
    if( !this._hookedAutoReresh || !this._savePath )
      return;
    
    this._autoRefreshSeconds = UserIdlingTimeForAutoRefresh / 1000;
    clearTimeout(this._timeoutIdForAutoRefresh);
    this._timeoutIdForAutoRefresh = window.setInterval(() => {
      if( this._isOpeningCtxMenu ) {
        this.observeUserIdlingTimeAndRestart();
        return;
      }
      
      if( this._autoRefreshSeconds-- <= 0 ) {
        clearTimeout(this._timeoutIdForAutoRefresh);
        this.info(`execute restarting...`);
        if( this.save(this._savePath) ) {
          this._manuallySaved = true;
          this.restart();
        }
        else {
          alert('failed to save data.');
        }
      }
      else
        this.info($t('message-restarting', this._autoRefreshSeconds), 'warn');
    }, 1000);
  }

  /*
  createChildDialog() {
    this._childDialogs.push( new CtrlChild(this, this._model.createChildDialog()) );
  }
  removeChildDialog(item: CtrlChild) {
    for( let i = this._childDialogs.length; i--; ) {
      if( this._childDialogs[i] === item ) {
        this._childDialogs.splice(i, 1);
        break;
      }
    }
  }
  addList(list: any) {
    this._model.addList(list);
    for( const child of this._childDialogs ) {
      child.addList(list);
    }
    for( const child of this._childElements ) {
      child.addList(list);
    }
  }
  */
  loadSaveFile(path: string) {
    if( path === this._savePath ) {
      alert(`The save file is currently opened.\n"${path}"`);
      return;
    }
    fs.WshShell.Run(CtrlRoot.fullPath + ' "' + path + '"', 1);
    if( this._childElements.length === 0 ) {
      this.close();
    }
  }
  restart() {
    fs.WshShell.Run('"' + CtrlRoot.fullPath + '" "' + this._savePath + '"', 1);
    this.close();
  }

  refreshStartingMenu() {
    const disabled = this._startingOverlay.isDisabled();
    this._DefaultCommands = this._DefaultCommands_refresh();
    this._startingOverlay.dispose();
    this._createStartingOverlay();
    this._startingOverlay.disable(disabled);
  }
  protected _DefaultCommands_refresh = () => [
    {
      label: $t('startmenu-create-frame'),
      onclick: () => {
        this._createNewFrame();
      },
    },
    {
      label: $t('startmenu-load-data'),
      onclick: () => {
        const path = this.openDialogToLoadFlss();
        if( path ) {
          this._savePath = path;
          this.restart(); 
        }
      },
    },
    
    {
      label: $t('startmenu-create-window'),
      onclick: () => {
        this.openNewWindow();
      },
    },
    {
      label: $t('startmenu-quit'),
      onclick: () => {
        this.close();
      }
    }
  ];
  protected _DefaultCommands = this._DefaultCommands_refresh();

  private _createNewFrame(margin=0.1) {
    const size = this.getModel().getFramePos();
    const w = size.w * (1 - margin) |0;
    const h = size.h * (1 - margin) |0;
    const x = size.w * (margin / 2) |0;
    const y = size.h * (margin / 2) |0;
    const child = this.createNewChildElement(x, y, w, h);
    this.addToSelectedElementList(child);
    return child;
  }

  // It seems that there is no way to save data when the OS is shutting down.
  // So it saves data each time the settings are changed.
  private _settingChangedTimeoutId = -1;
  private _lastAutosavedTime = 0;
  _onSettingsChanged() {
    if( !this._savePath || this._model.getRootWindowSettings('disableAutoSave') )
      return;
    
    clearTimeout(this._settingChangedTimeoutId);
    this._settingChangedTimeoutId = window.setTimeout(() => {
      if( this._savePath ) {
        this.save(this._savePath);
        //alert("autosaved");
        this._lastAutosavedTime = new Date().getTime();
        console.log('autosaved');
      }
    }, AutoSaveDelay);

    //console.log('hooked autosave');
    
  }






  static fullPath: string = '';
  static parentDirectory: string = '';
  static appRoot: string = '';
  static wsfPath: string = '';
  
  // initialize root controller
  static create(commandline: string) {
    const {htaPath, paths, options} = getCommandLine(commandline);
    const path = paths[0];
    const fso = fs.fso;
    
    console.log(options);
    
    CtrlRoot.fullPath = htaPath.replace(/^file:\/+/i, '');
    CtrlRoot.parentDirectory = htaPath.replace(/[^\\]+$/, '');
    CtrlRoot.appRoot = CtrlRoot.parentDirectory; //fso.GetParentFolderName(CtrlRoot.parentDirectory) + '\\';
    CtrlRoot.wsfPath = CtrlRoot.appRoot + 'script\\bridge.wsf';

    // load .flss file
    if( fso.FileExists(path) && /\.flss$/i.test(path) ) {
      let json;
      try {
        const fp = fso.OpenTextFile(path, 1, false, -1);
        const txt = fp.ReadAll();
        json = JSON.parse(txt);
      } catch(e: any) { 
        alert(e.message);
        window.close();
      }

      if( json ) {
        const model = new ModelRoot(json);
        return new CtrlRoot(model, path);
      }
    }
    
    const ctrl = new CtrlRoot();
    ctrl.getModel().resizeFrame(640, 480);
    ctrl.getModel().updateSize({w:640, h:480});
    // load dropped folder
    if( fso.FolderExists(path) ) {
      const element = ctrl._createNewFrame(0);
      element.addAllImagesIncludingSubfolders(path);
    }
    // parse dropped images
    else {
      const list = [];
      for( const path of paths ) {
        if( /\.(jpe?g|gif|png|bmp|ico|tif)$/i.test(path) ) {
          list.push(path);
        }
      }
      if( list.length ) {
        const element = ctrl._createNewFrame(0);
        element.addList(list);
      }
    }

    return ctrl;
  }

  protected $L() {
    return `[${this._model.getUniqueId()}]CtrlRoot#`;
  }

  close() {
    super.close();
    WallpaperInfo.dispose();
    window.close();
  }
}



function getCommandLine(commands: string = '') {
  console.log('commandLine: ' + commands);

  const paths: string[] = [];
  const options: { [name: string]: string | boolean | number } = {};
  commands.replace(/(?:^|\s)"([^"]*)"(?=\s|$)|\s(?:\/([a-z\d]+)(?::(?:("[^"]+"|[^\s]*)))?)(?=\s|$)/gi, function(m: string, path: string, option: string, val: string) {
    if (path) {
      paths.push(path);
    }
    else {
      options[option.toLowerCase()] = val || true;
    }

    return '';
  });
  
  const fullPath = paths.shift();

  return {
    htaPath: fullPath,
    paths,
    options,
  };
}


