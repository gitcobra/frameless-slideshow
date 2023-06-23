export declare class Enumerator<T> {
  constructor(collection?: any);
  atEnd(): boolean
  item(): T | undefined
  moveFirst(): void
  moveNext(): void
}

export const fso = new ActiveXObject("Scripting.FileSystemObject");
export const Shell = new ActiveXObject("Shell.Application");
export const WshShell = new ActiveXObject('WScript.Shell');

export let HtmlDlgHelper = createHtmlDlgHelper();
function createHtmlDlgHelper() {
  var dlgHelper = document.createElement('object');
  dlgHelper.classid = "clsid:3050f4e1-98b5-11cf-bb82-00aa00bdce0b";
  window.attachEvent('onload', function () {
    document.body.appendChild(dlgHelper);
  });
  return dlgHelper;
}


export function openFileDialog(ext?: string, message?: string, initFile?: string) {
  ext = ext || 'all(*.*)|*.*|';
  message = message || 'Please select a file.';
  initFile = initFile || '';
  var path = HtmlDlgHelper.object.openfiledlg(initFile, '', ext, message) || '';
  //ref: http://scripting.cocolog-nifty.com/blog/2007/02/windows2000wsh5_ee23.html
  path = path.substring(0, path.indexOf('\u0000'));
  return path || '';
}

export function saveFileDialog(fileName: string = '', message = '', folderOption: any={}) {
  const folder = openFolderDialog({newfolder: true, ...folderOption});
  if( !folder )
    return;
  
  message ??= 'FileName:';
  fileName = prompt(message, fileName);
  if( !fileName )
    return;
  
  return `${folder}\\${fileName}`;
}

export function colorPicker() {
  return HtmlDlgHelper.object.ChooseColorDlg();
}



export function openFolderDialog(args: any): string { // *return selected folder as FileSystemObject
  args = args || {};
  var defargs = {
    message: 'Choose a folder',
    fs: true, //BIF_RETURNONLYFSDIRS (0x00000001)
    edit: true, // BIF_EDITBOX (0x00000010)
    newfolder: false, // BIF_NONEWFOLDERBUTTON (0x00000200)
    root: 0x00 //root folder (string)
  };
  for (var p in defargs) {
    if (!args.hasOwnProperty(p)) // @ts-ignore
      args[p] = defargs[p];
  }// @ts-ignore
  args.ulFlags = (args.fs && 0x1) | (args.edit && 0x10) | (!args.newfolder && 0x200);
  var targetWindow = args.window || window;

  var result, isWSH;// @ts-ignore
  var openFolderRoutine = function (isWSH) { /*convert to Strings*/
    /*@ts-ignore*/
    var folder = new ActiveXObject("Shell.Application").BrowseForFolder(0, '$message', $ulFlags, '$vRootFolder');
    if (isWSH)
      return folder;
    /*@ts-ignore*/
    returnValue = folder || null;
    window.close();
  };
  
  // HTA: use a modalDialog to make the window exclusive
  if (targetWindow && targetWindow.showModalDialog) {
    // *seems it cannot read "window.dialogArguments" property when the script is running on "javascript:" scheme.
    result = targetWindow.showModalDialog('javascript: !' + (openFolderRoutine + '(false);').replace(/\$message/, args.message.replace(/(?=[\'\\])/g, '\\')).replace(/\$ulFlags/, args.ulFlags).replace(/\$vRootFolder/, args.root), args);
  }
  // WSH
  else {
    result = openFolderRoutine(true);
  }


  if (result) {
    try {
      result = result.Self.Path;
    } catch (e) { // Win98
      result = result.ParentFolder.ParseName(result.Title).Path;
    }
    result = fso.GetFolder(result);
  }
  return result;
}


export function folder(pathOrFolderObject: any, { text = false, nameOnly = false } = {}): { files: string[], folders: string[] } {
  const Folder = typeof pathOrFolderObject === 'string' ? fso.GetFolder(pathOrFolderObject) : pathOrFolderObject;
  
  const folders = [];
  let enm = new Enumerator<any>(Folder.SubFolders);
  for (; !enm.atEnd(); enm.moveNext()) {
    const item = enm.item();
    const value = text ? nameOnly ? item.Name : item.Path : item;
    folders.push(value);
  }

  const files = [];
  enm = new Enumerator<any>(Folder.Files);
  for (; !enm.atEnd(); enm.moveNext()) {
    const item = enm.item();
    const value = text ? nameOnly ? item.Name : item.Path : item;
    files.push(value);
  }

  return {
    files,
    folders,
  };
}

export function getFileAndFolderList(folder: any, args: any): { files: any[], folders: any[] } {
  if (typeof (folder) === 'string')
    folder = fso.GetFolder(folder);

  args = args || {
    getAsObject: false,
    dig: false,
    include: null, // RegExp
    exclude: null // RegExp
  };
  var include = args.include, exclude = args.exclude;

  var flist = [];
  try {
    var files = new Enumerator<any>(folder.Files);
  } catch (e) {
    throw new Error('[#getFileAndFolderList] could not enumerate "folder.Files"');
  }
  for (; !files.atEnd(); files.moveNext()) {
    var f = files.item();
    if (args.getAsObject) {
      if (include && !include.test(f.Path))
        continue;
      if (exclude && exclude.test(f.Path))
        continue;
    }
    flist.push(args.getAsObject ? f : f.Path);
  }

  var dlist = [];
  var folders = new Enumerator<any>(folder.SubFolders);
  for (; !folders.atEnd(); folders.moveNext()) {
    var d = folders.item();
    /*
    if( include && !include.test(d.Path) )
      continue;
    if( exclude && exclude.test(d.Path) )
      continue;
    */
    dlist.push(args.getAsObject ? d : d.Path);

    if (args.dig) {
      const obj = getFileAndFolderList(d, args);
      flist = flist.concat(obj.files);
      dlist = dlist.concat(obj.folders);
    }
  }

  // do including and excluding RegExp on only final recursive process for performance reasons
  if (!args.getAsObject && arguments.callee.caller != arguments.callee) {
    if (include || exclude) {
      var str: string = flist.join('\n');

      if (include) {
        var reg = new RegExp('^(?!.*(' + include.source + ')).*$', 'gm' + (include.ignoreCase ? 'i' : ''));
        str = str.replace(reg, '');
      }
      if (exclude) {
        reg = new RegExp('^(?=.*(' + exclude.source + ')).*$', 'gm' + (exclude.ignoreCase ? 'i' : ''));
        str = str.replace(reg, '');
      }
      str = str.replace(/\n{2,}/g, '\n').replace(/^\s+|\s+$/g, '');
      flist = str ? str.split('\n') : [];

    }
  }

  return {
    files: flist,
    folders: dlist
  };
}
export function parsePath(path: string, include?: RegExp | null, zipConfirmation?: boolean | ((path: string) => boolean)) {
  let list: string[] = [];
  path = fso.GetAbsolutePathName(path);
  if (fso.FileExists(path)) {
    if (zipConfirmation && /\.(zip|lzh)$/i.test(path)) {
      if (typeof zipConfirmation !== 'function' || zipConfirmation(path)) {
        const folder = extractZip(path);
        if (!folder)
          return;
        list = getFileAndFolderList(fso.GetFolder(folder), { include, dig: true }).files
      }
    }
    else {
      if (!include || include.test(path))
        list = [path];
    }
  }
  else if (fso.FolderExists(path)) {
    list = getFileAndFolderList(fso.GetFolder(path), { include, dig: true }).files
  }

  return list;
}

export function run(strCommand: string, intWindowStyle?: number, bWaitOnReturn?: boolean) {
  return WshShell.Run(strCommand, intWindowStyle || 1, bWaitOnReturn);
}

export function shellExecute(path: string) {
  try {
    return Shell.ShellExecute(path);
  } catch (e) {
    return run(path);
  }
}
export function explorer(path: string) {
  run('explorer.exe /select,"' + path + '"');
  //return objShell.Explore('"'+path+'"');
}



export function selectImageFile() {
  //var path = openFileDialog('images or zips (jpg,gif,png,bmp,zip,lzh)|*.jpg;*.jpeg;*.gif;*.png;*.bmp;*.ico;*.zip;*.lzh|images (jpeg,gif,png,bmp)|*.jpg;*.jpeg;*.gif;*.png;*.bmp;*.ico|compressed files (zip, lzh)|*.zip;*.lzh|all (*.*)|*.*|', 'Please select a zip file');
  var path = openFileDialog('images (jpg,gif,png,bmp)|*.jpg;*.jpeg;*.gif;*.png;*.bmp;*.ico;*.tif|all (*.*)|*.*|', 'Please select a zip file');
  if (!path)
    return;

  var list: string[];
  if (/\.(zip|lzh)$/.test(path)) {
    var folder = unpackZipFile(path);
    if (!folder)
      return;
    list = getFileAndFolderList(folder, { include: /\.(jpe?g|gif|png|bmp|ico|tif)$/i, dig: true }).files;
  }
  else if (confirm('Include all image files in the folder?')) {
    path = fso.GetParentFolderName(path);
    list = getFileAndFolderList(path, { include: /\.(jpe?g|gif|png|bmp|ico|tif)$/i, dig: false }).files;
  }
  else
    list = [path];

  return list;
}

const TEMP_ZIP_FOLDER_PREFIX = '_fs_unpacked_zip_';
export function unpackZipFile(path: string): string {
  var TemporaryFolder = 2;
  var FOF_SILENT = 0x04;
  var FOF_NOCONFIRMATION = 0x10;

  var zip = fso.GetFile(path);
  var tmpFolder = fso.GetSpecialFolder(TemporaryFolder);
  const zpath = tmpFolder.Path + '\\' + TEMP_ZIP_FOLDER_PREFIX + '~' + zip.Name + '~' + zip.ShortName;
  if (!fso.FolderExists(zpath)) {
    fso.CreateFolder(zpath);
    var files = Shell.NameSpace(path).Items();
    Shell.NameSpace(zpath).CopyHere(files, FOF_NOCONFIRMATION | FOF_SILENT);
    //console.log('Extraction Completed');
  }
  else {
    // should check the already unpacked files?
  }

  return zpath;
}
export function extractZip(path: string, output: string = '', overwrite = false): string {
  const TemporaryFolder = 2;
  const FOF_SILENT = 0x04;
  const FOF_NOCONFIRMATION = 0x10;

  const zip = fso.GetFile(path);
  if( !output ) {
    const tmpFolder = fso.GetSpecialFolder(TemporaryFolder);
    output = tmpFolder.Path + '\\' + TEMP_ZIP_FOLDER_PREFIX + '~' + zip.Name + '~' + zip.ShortName;
  }

  if( !fso.FolderExists(output) || overwrite ) {
    fso.CreateFolder(output);
    const files = Shell.NameSpace(path).Items();
    Shell.NameSpace(output).CopyHere(files, FOF_NOCONFIRMATION | FOF_SILENT);
  }

  return output;
}


export function deleteExtractedZips(tfolderlist: string[]) {
  for (var i = tfolderlist.length; i--;) {
    try {
      fso.GetFolder(tfolderlist[i]).Delete();
    } catch (e: any) {
      alert('failed to delete an unziped folder: ' + tfolderlist[i] + '\n' + e.description);
    }
  }
}

export function createShortcut(lnkfile:string, target:string, args:string = '', workdir:string = '', icon:string = '') {
  lnkfile = lnkfile.replace(/(\.(url|lnk))?$/i, '.lnk');
  
  var shortcut = WshShell.CreateShortcut(lnkfile);
  shortcut.TargetPath = target;
  shortcut.Arguments = args;
  shortcut.WorkingDirectory = workdir;
  shortcut.IconLocation = icon;
  shortcut.Save();
}
export function getSendToPath() {
  return WshShell.SpecialFolders('SendTo');
}
export function getStartupPath() {
  const ssfSTARTUP = 0x7;
  const startupFolder = Shell.NameSpace(ssfSTARTUP);
  return startupFolder && startupFolder.Self.Path || '';
}
export function getTempPath() {
  const TemporaryFolder = 0x2;
  const tmp = fso.GetSpecialFolder(TemporaryFolder);
  return tmp;
}

type AssociationType = {
  name: string
  description?: string
  path: string
  extensions: string[]
  icon?: string
};
export function setAssociation(param: AssociationType) {
  const {name, description, path, extensions, icon} = param;
  
  // create extension list
  const exts: {[name: string]: { DEFAULT: string }} = {};
  for( const ext of extensions ) {
    exts['.' + ext] = {
      DEFAULT: name,
    };
  }

  // icon entry
  const iconEntry = icon ? {
    DefaultIcon: {
      DEFAULT: "\""+icon+"\""
    },
  } : {};
  
  var regEntry = {
    HKEY_CURRENT_USER: {
      SOFTWARE: {
        Classes: {
          ...exts,

          [name]: {
            DEFAULT: description || name,
            ...iconEntry,
            shell: {
              open: {
                command: {
                  DEFAULT: path,
                }
              }
            }
          }
        }
      }
    }
  };
  digRegistoryData(regEntry)
}
export function removeAssociation(param: {name: string, extensions: string[]}) {
  const {name, extensions} = param;
  
  // create extension list
  const dellist: string[] = [];
  for( const ext of extensions ) {
    dellist.push(`HKEY_CURRENT_USER\\SOFTWARE\\Classes\\.${ext}\\`);
  }

  dellist.push(`HKEY_CURRENT_USER\\SOFTWARE\\Classes\\${name}\\DefaultIcon\\`);
  dellist.push(`HKEY_CURRENT_USER\\SOFTWARE\\Classes\\${name}\\shell\\open\\command\\`);
  dellist.push(`HKEY_CURRENT_USER\\SOFTWARE\\Classes\\${name}\\shell\\open\\`);
  dellist.push(`HKEY_CURRENT_USER\\SOFTWARE\\Classes\\${name}\\shell\\`);
  dellist.push(`HKEY_CURRENT_USER\\SOFTWARE\\Classes\\${name}\\`);

  const errors = [];
  for( const path of dellist ) {
    try {
      WshShell.RegDelete(path);
    } catch(e: any) {
      errors.push(e.message);
    }
  }
  if( errors.length ) {
    alert(errors.join('\n'));
  }
}

export function throwToTrashbox(path: string) {
  const ssfBITBUCKET = 10;
  Shell.NameSpace(ssfBITBUCKET).MoveHere(path);
  /*
  while( fso.FileExists(path) ){
    WScript.Sleep(100);
  }
  */
}
export function invokeDelete(path: string) {
  const parent = path.replace(/[^\\]+$/, '');
  const fileName = path.replace(/^.+\\(?=[^\\]+$)/, '');

  const sysParent = Shell.Namespace(parent);
  const sysFile = sysParent.ParseName(fileName);
  sysFile.InvokeVerb('delete');
}


function digRegistoryData(regData: any, path?: string) {
	path = path || '';
	try {
		// write reg key
		WshShell.RegWrite( path, regData.DEFAULT || '', "REG_SZ" );
		delete regData.DEFAULT;
	} catch(e) {
		//WSH.Echo(path+"\n"+e.description);
	}
	for( var prop in regData ) {
		var data = regData[prop];
		if( typeof data === "object" ) {
			digRegistoryData(data, path + prop + '\\');
			continue;
		}
		// write reg data
		WshShell.RegWrite( path + prop, data, typeof(data)==="string"? "REG_SZ" : "REG_DWORD");
	}
}
