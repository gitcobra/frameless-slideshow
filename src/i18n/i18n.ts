import en from "./en";
import ja from "./ja";

const Languages = {en, ja};
const LangList = ['en', 'ja'] as const;
type LangTypes = typeof LangList[number];

class i18n {
  private _lang: LangTypes | 'auto' = 'auto';
  private _currentLang: LangTypes;
  private _language: string;
  private readonly _sysLang: LangTypes;
  constructor() {
    const [lang, country] = navigator.browserLanguage.split('-');
    this._language = navigator.browserLanguage;
    this._sysLang = lang as LangTypes;
    this._currentLang = 'en';
    this.change();
  }
  change(lang?: LangTypes) {
    this._currentLang = !lang ? this._sysLang : lang;
    if( lang )
      this._lang = lang;
  }
  get() {
    return (id: keyof typeof en, ...args: any[]): string => {
      const text = (Languages[this._currentLang] || en)[id] || en[id] || `$t_undefined[${id}]`;
      return text.replace(/\$(\d+)(?:\$(p|d)?\((\d+)\))?/g, function(m:string, index:string, func:string, param1:string) {
        const val = args[Number(index) - 1 ||0];
        switch(func) {
          // padding
          case 'p':
          case 'd': {
            const pad = Number(param1);
            return $p(val, pad, func === 'd' ? '0' : ' ');
          }
          default:
            return val;
        }
      });
    };
  }
  getCurrent() {
    const clang = this._currentLang;
    return function(id: keyof typeof en, ...args: any[]): string {
      const text = (Languages[clang] || en)[id] || en[id] || `$t_undefined[${id}]`;
      return text.replace(/\$(\d+)/g, function(m:string, index:string) {
        return args[Number(index)||0];
      });
    };
  }

  getLang() {
    return this._currentLang;
  }
  getLanguages() {
    return LangList.concat();
  }
}

function $p(val: number, padNum: number, pad:string = ' '): string {
  let str = String(val);
  const len = str.length;
  const lacked = padNum - len;
  if( lacked ) {
    str = Array(lacked + 1).join(pad) + str;
  }
  return str;
}




const instance = new i18n;
const $t = instance.get();
export { instance as i18n, $t, $p, LangTypes, LangList }
