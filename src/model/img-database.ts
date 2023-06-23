/*
  Image Information Database
  it checks and stores image's information such as width, height, size, updated time, etc.
*/

var fso = new ActiveXObject("Scripting.FileSystemObject");

const ImgStatusTexts = ['UNINITIALIZED', 'LOADING', 'COMPLETED', 'FAILED', 'NOTFOUND'] as const;
type ImgStatusTypes = typeof ImgStatusTexts[number];



let CheckWrongExt: HTMLElement;

type ImgInfo = {
  path: string // image path

  success: boolean
  status: ImgStatusTypes
  width: number
  height: number

  failedCount: number
  dateCompleted: boolean
  dateFailed: boolean

  //file system information
  dateUpdated: string
  dateCreated: string
  size: number

  dateLastGotInfo: number
};

class ImgInfoDatabase {
  private _library: { [hash: string]: ImgInfo } = {};
  private _queuedCallbacks: { [hash: string]: Function[] | null } = {};

  request(path: string, callback?: (dat: ImgInfo) => any): ImgInfo {
    console.log(`${this.$L()}request "${path}"`, 'gray');
    path = this._normalizePathString(path);
    const imgInfo: ImgInfo = this._getImgDataFromLibrary(path) || this._createNewImgData(path);
    
    // is the image already parsed?
    if( this._checkData(imgInfo) ) {
      // execute callback and return stored data
      const dat = {...imgInfo};
      callback?.(dat);

      console.log(dat, 'gray');
      return dat;
    }
    else {
      // it will get current callback list if the queue is active
      let callbacks = this._queuedCallbacks[path];
      const isQueueActive = !!callbacks;
      
      // create a new callback list
      if( !callbacks ) {
        callbacks = this._queuedCallbacks[path] = [];
      }

      // add the callback to the list
      if( callback )
        callbacks.push(callback);
      
      // start the queue
      if( !isQueueActive ) {
        this._queue(imgInfo);
      }
      
    }

    return {...imgInfo};
  }
  /*
  requestSizeSync(path: string): {width:number, height:number} | null {
    const dat = this._checkWrongExtension(path);
    return dat;
  }
  */

  private _queue(data: ImgInfo) {
    console.log(`${this.$L()}_queue(new image) "${data.path}"`, 'gray');
    const path = data.path;
    
    // create and load image
    let imgtest = document.createElement('img');
    imgtest.onload = imgtest.onerror = () => {
      const success = event.type === 'load';
      if( success ) {
        data.width = imgtest.width;
        data.height = imgtest.height;
        data.status = 'COMPLETED';
      }
      else {
        data.status = 'FAILED';
      }
      data.success = success;

      // consume all callbacks
      const dat = {...data};
      console.log(dat, 'gray');
      const callbacks = this._queuedCallbacks[path] || [];
      for( const callback of callbacks ) {
        callback(dat);
      }
      
      // clear data
      this._queuedCallbacks[path] = null;
      imgtest.onload = imgtest.onerror = null as any;
      imgtest = null as any;
    };

    imgtest.src = path;
  }

  private _getFileSystemInformation(path: string) {
    console.log(`${this.$L()}_getFileSystemInformation "${path}"`, 'gray');
    try {
      var file = fso.GetFile(path);
    } catch (e: any) {
      console.log(e.message, 'red');
      file = {
        notfound: true
      };
    }

    let dateCreated = '';
    try {
      //*some files causes a weird error on Win98, for example "C:\\WINDOWS\\cloud.GIF"
      dateCreated = String(file.DateCreated);
    } catch (e) {}
    var dat = {
      notfound: file.notfound,
      dateCreated: dateCreated,
      dateUpdated: String(file.DateLastModified),
      size: file.Size
    };
    console.log(dat, 'gray');

    return dat;
  }
  private _normalizePathString(path: string) {
    if (!/^\w+:/.test(path)) {
      path = this.getAbsolutePath(path);
    }
    path = path.toLowerCase();
    path = path.replace(/^file:\/\/\//, '');
    path = path.replace(/\//g, '\\');

    return path;
  }
  getAbsolutePath(path: string) {
    var a = document.createElement('a');
    a.setAttribute('href', path);
    path = unescape((<HTMLAnchorElement>a.cloneNode(false)).href);
    return path;
  }
  private _getImgDataFromLibrary(path: string): ImgInfo | null {
    var data = this._library[path];
    return data || null;
  }
  public createBlankImgInfo(): ImgInfo {
    return {
      path: '',
      success: false,
      status: 'UNINITIALIZED',
      width: -1,
      height: -1,
      failedCount: 0,
      dateCompleted: false,
      dateFailed: false,
      dateUpdated: '',
      dateCreated: '',
      size: 0,
      dateLastGotInfo: 0,
    };
  }
  private _createNewImgData(path: string) {
    var fsInfo = this._getFileSystemInformation(path);
    var data: ImgInfo = {
      path: path,

      success: false,
      status: fsInfo.notfound ? 'NOTFOUND' : 'UNINITIALIZED',
      width: -1,
      height: -1,
      //wrongExt: false,

      failedCount: 0,
      dateCompleted: false,
      dateFailed: false,

      //notfound: fsInfo.notfound,
      dateUpdated: fsInfo.dateUpdated,
      dateCreated: fsInfo.dateCreated,
      size: fsInfo.size,

      dateLastGotInfo: new Date().getTime()
    };

    if( path )
      this._library[path] = data;

    return data;
  }
  private _checkData(data: ImgInfo) {
    const nowTime = new Date().getTime();
    let nowFileInfo: ReturnType<typeof this._getFileSystemInformation> | undefined;
    if (nowTime - (data.dateLastGotInfo || 0) > 1000) { // prevent to access to same file continuously
      nowFileInfo = this._getFileSystemInformation(data.path);
      data.dateLastGotInfo = nowTime;
    }

    let result = false;
    switch (data.status) {
      case 'UNINITIALIZED':
        break;
      case 'FAILED':
      case 'NOTFOUND':
      case 'COMPLETED':
        if (!nowFileInfo || /*nowFileInfo.notfound ||*/ !this.diffFileInfo(data, nowFileInfo)) {
          console.log(`use stored image data`, 'gray');
          result = true;
          break;
        }
        // update file system info
        data.dateUpdated = nowFileInfo.dateUpdated;
        data.dateCreated = nowFileInfo.dateCreated;
        data.size = nowFileInfo.size;
        break;

      case 'LOADING': // currently loading
        break;
      default:
        throw new Error(data.status);
    }

    return result;
  }
  diffFileInfo(obj1: ImgInfo, obj2: any = {}) {
    return obj1.dateUpdated != obj2.dateUpdated ||
      obj1.dateCreated != obj2.dateCreated ||
      obj1.size != obj2.size;
  }

  private $L() {
    return `ImgDatabase#`;
  }
}


// Singleton
const instance = new ImgInfoDatabase();
export { instance as ImgInfoDatabase, ImgInfo }
