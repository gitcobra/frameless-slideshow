
import { ModelRoot } from 'src/model/model-root';
import { ModelElement } from '../src/model/model-element';
import { ImgInfo } from 'src/model/img-database';

const pmodel = new ModelRoot();

class Mock extends ModelElement {
  test() {
    console.log('test _calculateFrameAndImageSize', 'lime');
    console.log('$indent');
    this.setFrameSettings({
      sizing: 'mix',
      width:300,
      height:300,
      offsetX: 100,
      offsetY: 100,
      adjust: 'left-top',
    });
    this.setImageSettings({
      adjust: 'center-center',
    });

    const imgdat = { width:100, height: 100 } ;
    console.log(['frmsetting', this._frameSettings]);
    console.log(['img', imgdat]);
    const {frame, image} = this._calcSizeForFrameAndImage(imgdat as ImgInfo);
    console.log('frame')
    console.log(frame);
    console.log('image');
    console.log(image);

    console.log(`is the image centered on frame?: ` + (() => image.x === 100 && image.y === 100 && image.w === 100 && image.h === 100)(), 'red');
    console.log('$unindent');
  }
  test2() {
    console.log('test _calculateFrameAndImageSize', 'lime');
    console.log('$indent');
    this.setFrameSettings({
      sizing: 'stretch',
      width:300,
      height:300,
      offsetX: 100,
      offsetY: 100,
      adjust: 'left-top',
    });
    this.setImageSettings({
      adjust: 'center-center',
    });
    
    const imgdat = { width:100, height: 100 } ;
    console.log(['frmsetting', this._frameSettings]);
    console.log(this._frameSettings, "red")
    console.log(this._framePos, "red")
    console.log(['img', imgdat]);
    const {frame, image} = this._calcSizeForFrameAndImage(imgdat as ImgInfo);
    console.log('frame')
    console.log(frame);
    console.log('image');
    console.log(image);

    console.log(`is the image centered on frame?: ` + (() => image.x === 100 && image.y === 100 && image.w === 100 && image.h === 100)(), 'red');
    console.log('$unindent');
  }
  test3() {
    console.log('test _calculateFrameAndImageSize', 'lime', true);
    this.setFrameSettings({
      sizing: 'mix',
      width:300,
      height:300,
      offsetX: 100,
      offsetY: 100,
      adjust: 'left-top',
    });
    this.setImageSettings({
      adjust: 'center-center',
    });
    
    let imgdat = { width:300, height: 100 } ;
    let index = 0;
    console.log([index++, imgdat], 'blue');
    console.log(['frmsetting', this.getFrameSettings()], 'blue');
    console.log(['imgsetting', this.getImageSettings()], 'blue');
    console.log(['framspos', this._framePos], 'blue');
    let {frame, image} = this._calcSizeForFrameAndImage(imgdat as ImgInfo);
    console.log('mix, left-top', 'blue', true)
    console.log(['frame', frame])
    console.log(['image', image]);
    this.resizeFrame(frame.w, frame.h);
    this.moveFrame(frame.x, frame.y);
    console.log(['framspos', this._framePos], 'blue', false);
    
    
    imgdat = { width:100, height: 300 } ;
    console.log([index++, imgdat], 'blue');
    console.log(['frmsetting', this.getFrameSettings()], 'blue');
    console.log(['imgsetting', this.getImageSettings()], 'blue');
    console.log(['framspos', this._framePos], 'blue');
    ({frame, image} = this._calcSizeForFrameAndImage(imgdat as ImgInfo));
    console.log('mix, left-top', 'blue', true);
    console.log(['frame', frame])
    console.log(['image', image]);
    this.resizeFrame(frame.w, frame.h);
    this.moveFrame(frame.x, frame.y);
    console.log(['framspos', this._framePos], 'blue', true);
    
    this.setFrameSettings({
      adjust: 'left-bottom',
    });
    imgdat = { width:300, height: 100 } ;
    this.setImageSettings({
      adjust: 'left-bottom',
    });
    console.log(['left-bottomimg', imgdat], 'blue', true);
    console.log(['frmsetting', this.getFrameSettings()], 'blue');
    console.log(['imgsetting', this.getImageSettings()], 'blue');
    console.log(['framspos', this._framePos], 'blue');
    ({frame, image} = this._calcSizeForFrameAndImage(imgdat as ImgInfo));
    console.log(['frame', frame])
    console.log(['image', image]);
    this.resizeFrame(frame.w, frame.h);
    this.moveFrame(frame.x, frame.y);
    console.log(['framspos', this._framePos], 'blue', false);

    imgdat = { width:100, height: 300 } ;
    this.setImageSettings({
      adjust: 'left-bottom',
    });
    console.log(['left-bottom img', imgdat], 'blue', true);
    console.log(['frmsetting', this.getFrameSettings()], 'blue');
    console.log(['imgsetting', this.getImageSettings()], 'blue');
    console.log(['framspos', this._framePos], 'blue');
    ({frame, image} = this._calcSizeForFrameAndImage(imgdat as ImgInfo));
    console.log(['frame', frame])
    console.log(['image', image]);
    this.resizeFrame(frame.w, frame.h);
    this.moveFrame(frame.x, frame.y);
    console.log(['framspos', this._framePos], 'blue', false);

    console.log('','',false);
    
  }
}

const model = new Mock(pmodel);
model.test();
model.test2();
model.test3();
