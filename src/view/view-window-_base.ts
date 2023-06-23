import { _ViewBase } from "./view-_base";
import WallpaperInfo from "../utils/wallpaper-info";
import { AdjustmentPosition, BoxPosition } from "src/model/data-types";
import { IE_Version } from "src/utils/utils";

abstract class _ViewWindow extends _ViewBase {
  protected _container!: HTMLElement;
  protected _dropTarget!: HTMLElement;
  protected _wallpaperElement!: HTMLImageElement;

  protected initWindow() {
    this._container = this._document.body;
    this._container.style.margin = '0px';
    this._container.style.padding = '0px';

    this.initBase();

    this._wallpaperElement = document.all('wallpaper'+ this._UID)! as HTMLImageElement;
    this._wallpaperElement.src = this.BlankGIF;
    //this._wallpaperElement.style.cssText = 'display:inline; position:absolute; left:0px; top:0px; width:100%; height:100%; z-index: -10000000;';
    this._title.style.border = '';

    //this._dropTarget = this._document.getElementById('drop-target'+this._UID);
    this._dropTarget = this._document.createElement('div');
    this._dropTarget.style.cssText = 'z-index:30000; display:none; width:1px; height:1px; position:absolute; left:0px; top:0px;';
    this._container.appendChild(this._dropTarget);
    
    if (!this._image || !this._dropTarget) {
      throw new Error(`some necessary elements are missing: imgElement:${!!this._image} dropTarget:${!!this._dropTarget}`);
    }
  }

  setWallpaper(wpdat: typeof WallpaperInfo.Types.WallPaperData) {
    console.log(`${this.$L()}setWallpaper`, 'darkcyan');
    const path = wpdat.path || this.BlankGIF;
    const wpelm = this._wallpaperElement;
    wpelm.src = path;
    console.log(`${this.$L()}setWallpaper ${path}`, 'darkcyan');

    // for using virtual windows position
    let scrLeft = this._window.screenLeft;
    let scrTop = this._window.screenTop;
    var scrWidth = screen.width;
    var scrHeight = screen.height;

    var wpWidth = wpdat.width;
    var wpHeight = wpdat.height ;
    var bgColor = wpdat.bgColor;

    if( !path ) {
      this._container.style.backgroundColor = bgColor;
      wpelm.style.display = 'none';
      return;
    }
    else {
      //this._container.style.backgroundColor = 'transparent';
      wpelm.style.display = 'inline-block';
    }
    
    switch (wpdat.style) {
      case 0:
        var ratio = wpWidth / wpHeight;
        var resizedTooLargeImage = false;
        if (wpWidth - scrWidth < wpHeight - scrHeight) {
          if (wpWidth >= scrWidth * 1.6) {
            wpWidth = scrWidth * 1.6;
            wpHeight = wpWidth * ratio;
            resizedTooLargeImage = true;
          }
        }
        else {
          if (wpHeight >= scrHeight * 1.6) {
            wpHeight = scrHeight * 1.6;
            wpWidth = wpHeight * ratio;
            resizedTooLargeImage = true;
          }
        }

        // Tile
        if (Number(wpdat.tileStyle) === 1) {
          console.log('Tile', 'darkcyan');
          if (resizedTooLargeImage) {
            wpelm.style.visibility = 'visible';
            let left = - scrLeft;
            let top = - scrTop;
            wpelm.style.width = wpWidth as any;
            wpelm.style.height = wpHeight as any;
            wpelm.style.pixelLeft = left as any;
            wpelm.style.top = top as any;
          }
          // CSS normal tile style
          else {
            /*
            wpelm.style.pixelWidth = scrWidth;
            wpelm.style.pixelHeight = scrHeight;
            wpelm.style.pixelLeft = -scrLeft;
            wpelm.style.pixelTop = -scrTop;
            */
            //wpelm.style.background = `transparent url(${path}) repeat scroll ${-scrLeft} ${-scrTop}`;
            wpelm.style.display = 'none';
            wpelm.src = this.BlankGIF;
            this._container.style.background = `${bgColor} url(${path}) repeat scroll ${-scrLeft} ${-scrTop}`;
          }
        }
        // center
        else if (resizedTooLargeImage) {
          wpelm.style.visibility = 'visible';
          let left = -(Math.abs(scrWidth - wpWidth) >> 1) - scrLeft;
          let top = -(Math.abs(scrHeight - wpHeight) >> 1) - scrTop;
          wpelm.style.width = wpWidth as any;
          wpelm.style.height = wpHeight as any;
          wpelm.style.left = left as any;
          wpelm.style.top = top as any;
        }
        // CSS normal center style
        else {
          wpelm.style.display = 'none';
          let left = ((scrWidth - wpWidth) >> 1) - scrLeft;
          let top = ((scrHeight - wpHeight) >> 1) - scrTop;
          this._container.style.background = bgColor + ' url("' + path + '") ' + left + 'px ' + top + 'px no-repeat fixed';
        }

        break;
      // stretch to screen (breaking aspect ratio)
      case 2:
        wpelm.style.background = `${bgColor} url(${path}) no-repeat fixed`;
        wpelm.style.visibility = 'visible';
        wpelm.style.position = 'absolute';
        wpelm.style.pixelWidth = screen.width;
        wpelm.style.pixelHeight = screen.height;
        wpelm.style.pixelLeft = -scrLeft;
        wpelm.style.pixelTop = -scrTop;
        //console.log([scrLeft, scrTop])
        break;
      // fit to screen
      case 6:
        this._container.style.backgroundColor = `${bgColor}`;
        wpelm.style.backgroundColor = bgColor;
        wpelm.style.visibility = 'visible';
        wpelm.style.position = 'absolute';

        // calculate wallpaper size compared to screen
        var wpWrate = wpWidth / wpHeight;
        var wpHrate = wpHeight / wpWidth;
        var scWrate = scrWidth / scrHeight;
        var scHrate = scrHeight / scrWidth;

        if (scHrate < wpHrate) {
          wpelm.style.height = scrHeight as any;
          var tmp = scrHeight * wpWrate | 0;
          wpelm.style.width = tmp as any;
          wpelm.style.top = -scrTop as any;
          wpelm.style.pixelLeft = ((scrWidth - tmp) >> 1) - scrLeft;
        }
        else {
          wpelm.style.width = scrWidth as any;
          var tmp = scrWidth * wpHrate | 0;
          wpelm.style.height = tmp as any;
          wpelm.style.pixelLeft = -scrLeft;
          wpelm.style.top = ((scrHeight - tmp) >> 1) - scrTop as any;
        }
        break;
      
      // fill screen (not tile)
      case 10:
      // span :TODO
      case 22:
        wpelm.style.backgroundColor = bgColor as any;
        wpelm.style.visibility = 'visible';
        wpelm.style.position = 'absolute';
        var rateH = wpHeight / screen.height;
        var rateW = wpWidth / screen.width;
        var ratio = Math.min(rateH, rateW);
        wpelm.style.pixelWidth = wpWidth / ratio;
        wpelm.style.pixelHeight = wpHeight / ratio;
        wpelm.style.pixelLeft = (screen.width - wpelm.style.pixelWidth) / 2 - scrLeft;
        wpelm.style.pixelTop = (screen.height - wpelm.style.pixelHeight) / 3 - scrTop;
        break;
    }
  }
  updateBasePositionArrowIcon(frameadjust: AdjustmentPosition) {
    // do nothing
  }
  setName(name: string) {
    this._name.innerHTML = '';
  }

  getTargetDocument() {
    return this._document;
  }
  getDropTarget() {
    return this._dropTarget;
  }

  showBorder(flag = true) {
    console.log(`${this.$L()}showBorder(root) ${flag}`, 'darkcyan');
    
    // hide border
    if( !flag ) {
      //this._filterContainer.style.backgroundColor = 'transparent';
      this._filterContainer.style.filter = '';
    }
    else if( flag ) {
      // show border
      //this._filterContainer.style.backgroundColor = 'black';
      if( IE_Version.real >= 5 && this._enableHighlightEffects )
        this._filterContainer.style.filter = 'Alpha(opacity=50) progid:DXImageTransform.Microsoft.gradient(startColorstr=#AA5500FF, endColorstr=#22000022)';
    }
    super.showBorder(flag);
  }

  dispose(): void {
    this._window.close();
  }
}



export { _ViewWindow }
