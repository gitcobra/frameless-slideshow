// This is for observing wallpaper registry settings. currently unused.



// SWbemSink
// https://docs.microsoft.com/en-us/windows/win32/wmisdk/swbemsink
// The SWbemSink object is implemented by client applications to receive the results of asynchronous operations and event notifications.
// To make an asynchronous call, you must create an instance of an SWbemSink object and pass it as the ObjWbemSink parameter.
// The events in your implementation of SWbemSink are triggered when status or results are returned, or when the call is complete.
// The VBScript CreateObject call creates this object.

const objWMIService = GetObject('winmgmts:{impersonationLevel=impersonate}!\\\\.\\root\\cimv2');
const defWMIService = GetObject('winmgmts:{impersonationLevel=impersonate}!\\\\.\\root\\default');

class SWbemSink {
  private _wmiSink: any;
  constructor() {
    const wmiSink = document.createElement('object');
    wmiSink.classid = 'clsid:75718C9A-F029-11D1-A1AC-00C04FB6C223';
    wmiSink.id = 'wmiSinkObjectElm';
    document.body.appendChild(wmiSink);
    this._wmiSink = wmiSink;
    
    wmiSink.attachEvent('OnObjectReady', ((wmiObject: any, wmiAsyncContext: any) => {
      this._consumeEvents(wmiObject, wmiAsyncContext);
    }) as any);
    
    this.setWallpaperObserver();
    
  }
	setWallpaperObserver() {
		var userName = this.getCurrentUserAccount();
		var sid = '';
    
    try {
			var user = objWMIService.ExecQuery('SELECT * FROM Win32_UserAccount WHERE Name="'+userName+'"', "WQL", 48);
			var enumItems = new Enumerator<any>(user);
			for( ;!enumItems.atEnd(); enumItems.moveNext() ) {
				sid = enumItems.item().sid;
			}
			//defWMIService.ExecNotificationQueryAsync(this._wmiSink, "SELECT * FROM RegistryTreeChangeEvent WHERE Hive='HKEY_USERS' AND RootPath='"+sid+"\\\\Control Panel\\\\Desktop' ");
			//defWMIService.ExecNotificationQueryAsync(this._wmiSink, "SELECT * FROM RegistryValueChangeEvent WHERE Hive='HKEY_USERS' AND KeyPath='"+sid+"\\\\Control Panel\\\\Desktop' AND ValueName='WallPaper'");
		} catch(e: any) {
			// win9x ?
			sid = '.DEFAULT';
			var delaySec = 10; // interval
			defWMIService.ExecNotificationQueryAsync(this._wmiSink, "SELECT * FROM RegistryTreeChangeEvent WITHIN " + delaySec + "WHERE Hive='HKEY_USERS' AND RootPath='"+sid+"\\\\Control Panel\\\\Desktop'");
      console.log(e.message);
		}
	}
  cancelWMInotifications() {
    //if (this._wmiSink)
    //  this._wmiSink.Cancel();
  }
  /*
  addListener(handler: string, listener: EventListener) {
    handler = handler.toLowerCase();
    if (typeof listener !== 'function')
      throw new Error('"a listener" must be a function');

    this.eventListeners.push({
      handler: handler,
      listener: listener
    });
  }
  */
  _consumeEvents(wmiObject: any, wmiAsyncContext: any) {
    console.log('#_consumeEvents');
    /*
    for (var i = 0; i < this.eventListeners.length; i++) {
      var handler = this.eventListeners[i].handler;
      var listener = this.eventListeners[i].listener;
      switch (handler) {
        case 'onwallpaperchange':
          if (wmiObject.Path_.Class === 'RegistryTreeChangeEvent') {
            if (/\\Control Panel\\Desktop\b/i.test(wmiObject.RootPath)) {
              listener(this.getWallpaperData());
            }
          }
          continue;
      }
    }
    */
    console.log(wmiObject.Path_.Class);
  }
	getCurrentUserAccount() {
		var enumItems = objWMIService.ExecQuery("Select * From Win32_ComputerSystem");
		enumItems = new Enumerator(enumItems);
		var userName;
		for( ;!enumItems.atEnd(); enumItems.moveNext() ) {
			userName = enumItems.item().UserName;
		}
		userName = userName.replace(/.+\\/,'');
		
		return userName;
	}
}

// Singleton
let instance: SWbemSink;
export function create() {
  instance = instance || new SWbemSink();
  return instance;
}
