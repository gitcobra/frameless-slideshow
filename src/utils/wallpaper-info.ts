
declare var GetObject: any;
//declare var Enumerator: any;


type WallPaperData = {
  bgColor: string
  path: string
  style: number
  tileStyle: number

  originX: number
  originY: number

  width: number
  height: number
};

let objWMIService: any; // WMI object
//let defWMIService: any;
//const WshShell = new ActiveXObject('WScript.Shell');
class WallpaperInfo {

  eventListeners: any = [];
  _wmiSink: any;
  Types: {
    WallPaperData: WallPaperData;
  } = {} as any;

  constructor() {
    // initialize WMI services
    objWMIService = GetObject('winmgmts:{impersonationLevel=impersonate}!\\\\.\\root\\cimv2');
    //defWMIService = GetObject('winmgmts:{impersonationLevel=impersonate}!\\\\.\\root\\default');

    //this._wmiSink = this._createWMISink();
    //this._setWallpaperObserver();
  }
  /*
  private _checkOS() {
    var OS = this.OS;
    var user = objWMIService.ExecQuery('Select * From Win32_OperatingSystem', 'WQL', 48);
    var enumItems = new Enumerator(user);
    for( ;!enumItems.atEnd(); enumItems.moveNext() ) {
      var item = enumItems.item();
      OS.caption = item.Caption;
      OS.buildNumber = item.BuildNumber;
      OS.version = item.Version;
      OS.architecture = item.OSArchitecture;
      OS.serialNumber = item.SerialNumber;
      OS.registeredUser = item.RegisteredUser;
      OS.windowsDirectory = item.WindowsDirectory;
      OS.systemDirectory = item.SystemDirectory;
      OS.totalMemory = item.TotalVisibleMemorySize;
      OS.freeMemory = item.FreePhysicalMemory;
      OS.totalVirtualMemory = item.TotalVirtualMemorySize;
      OS.freeVirtualMemory = item.FreeVirtualMemory;
    }

    var ver = (/^\d+\.\d/.exec(OS.version) || {})[0];
    OS.name = ({
      '10.0': '10',
      '6.3': '8.1',
      '6.2': '8',
      '6.1': '7',
      '6.0': 'Vista',
      '5.2': 'XP64',
      '5.1': 'XP',
      '5.0': '2000',
      '4.9': 'ME',
      '4.1': '98'
    })[ver] || '';
  }
  */
  // wallpaper
  /*
  changeWallpaper(path: string, opt = {}) {
    // set wallpaper
    WshShell.RegWrite('HKCU\\Control Panel\\Desktop\\WallPaper', path, 'REG_SZ');
    this._informSystemOfRegistoryChange();
  }
  private _informSystemOfRegistoryChange() {
    // notify that wallpaper has been changed to Windows Explorer
    var count = 5;
    var clearId = setInterval(function () {
      WshShell.Run('RUNDLL32.EXE user32.dll,UpdatePerUserSystemParameters', 0, true);
      if (!count--)
        clearInterval(clearId);
    }, 1000);
  }
  */
  getWallpaperData(): WallPaperData | null {
    console.log('#getWallpaperData', 'green');
    try {
      var regprov = GetObject('WinMgmts:root/default:StdRegProv');
    } catch (e) {
      console.log('failed to get StdRegProv', 'red');
      return null;
    }

    var HKEY_CLASSES_ROOT = (0x80000000);
    var HKEY_CURRENT_USER = (0x80000001);
    var HKEY_LOCAL_MACHINE = (0x80000002);
    var HKEY_USERS = (0x80000003);
    var HKEY_CURRENT_CONFIG = (0x80000005);
    var HKEY_DYN_DATA = (0x80000006);

    // StringValue
    var enumvalues = regprov.Methods_('GetStringValue');
    var param = enumvalues.InParameters.SpawnInstance_();
    param.hDefKey = HKEY_CURRENT_USER;

    param.sSubKeyName = 'Control Panel\\Desktop';
    param.Svaluename = 'Wallpaper';
    var wpPath = regprov.ExecMethod_('GetStringValue', param).sValue;

    param.sSubKeyName = 'Control Panel\\Colors';
    param.Svaluename = 'Background';
    var bgColor = regprov.ExecMethod_('GetStringValue', param).sValue;

    if (!bgColor) {
      bgColor = '0 128 128';
      /*
      // set default bgcolor by OS
      switch (this.OS.name) {
        // win98
        case '98':
          bgColor = '0 128 128';
          break;
        // ME,2000,XP,VISTA,7
        case 'ME':
        case '2000':
        case 'XP':
        case 'Vista':
        case '7':
          bgColor = '58 110 165';
          break;
        // 8
        case '8':
        case '8.1':
          bgColor = '24 0 82';
          break;
        // 10
        case '10':
        default:
          bgColor = '0 120 215';
          break;
      }
      */
    }

    bgColor = '#' + bgColor.replace(/\d+/g, function (m: string) { return (0x100 + Number(m)).toString(16).substring(1) }).replace(/\s/g, '');

    param.sSubKeyName = 'Control Panel\\Desktop';
    param.Svaluename = 'WallpaperStyle';
    var wpStyle = regprov.ExecMethod_('GetStringValue', param).sValue;

    param.sSubKeyName = 'Control Panel\\Desktop';
    param.Svaluename = 'TileWallpaper';
    var tileStyle = regprov.ExecMethod_('GetStringValue', param).sValue;

    // DWord
    param.Svaluename = 'WallpaperOriginX';
    var wpOriginX = regprov.ExecMethod_('GetDWordValue', param).uValue;

    param.Svaluename = 'WallpaperOriginY';
    var wpOriginY = regprov.ExecMethod_('GetDWordValue', param).uValue;

    return {
      bgColor: bgColor,
      path: wpPath,
      style: Number(wpStyle),
      tileStyle: Number(tileStyle),

      originX: wpOriginX,
      originY: wpOriginY,

      width: 0,
      height: 0,
    };
  }
  
  // observe wallpaper's change
  /*
  private _setWallpaperObserver() {
    var userName = this._getCurrentUserName();
    var sid = '';
    try {
      var user = objWMIService.ExecQuery('SELECT * FROM Win32_UserAccount WHERE Name="' + userName + '"', "WQL", 48);
      var enumItems = new Enumerator(user);
      for (; !enumItems.atEnd(); enumItems.moveNext()) {
        sid = enumItems.item().sid;
      }
      console.log('SID: ' + sid);
      defWMIService.ExecNotificationQueryAsync(this._wmiSink, "SELECT * FROM RegistryTreeChangeEvent WHERE Hive='HKEY_USERS' AND RootPath='" + sid + "\\\\Control Panel\\\\Desktop' ");
      //defWMIService.ExecNotificationQueryAsync(this._wmiSink, "SELECT * FROM RegistryValueChangeEvent WHERE Hive='HKEY_USERS' AND KeyPath='"+sid+"\\\\Control Panel\\\\Desktop' AND ValueName='WallPaper'");
    } catch (e: any) {
      console.log(e.description, 'red');
      // win9x ?
      sid = '.DEFAULT';
      var delaySec = 10; // interval
      defWMIService.ExecNotificationQueryAsync(this._wmiSink, "SELECT * FROM RegistryTreeChangeEvent WITHIN " + delaySec + "WHERE Hive='HKEY_USERS' AND RootPath='" + sid + "\\\\Control Panel\\\\Desktop'");
    }
  }
  */
  dispose() {
  }
}


// Singleton
export default new WallpaperInfo()
