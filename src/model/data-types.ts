import { LangTypes } from "src/i18n/i18n";

// normal image path list
export type ImagePathList = string[];


export type XYPos = {
  x: number
  y: number
};
export type BoxSize = {
  w: number
  h: number
};
export type BoxPosition = XYPos & BoxSize;


export const DialogAdjustKeywordsX = ["left-out" , "left" , "center" , "right" , "right-out"] as const;
export const DialogAdjustKeywordsY = ["top-out" , "top" , "center" , "bottom" , "bottom-out"] as const;
export type DialogAdjustX = typeof DialogAdjustKeywordsX[number];
export type DialogAdjustY = typeof DialogAdjustKeywordsY[number];

// position settings
export const AdjustmentKeywords = ["left-top" , "left-center" , "left-bottom" , "center-top" , "center-center" , "center-bottom" , "right-top" , "right-center" , "right-bottom"] as const;
export type AdjustmentPosition = typeof AdjustmentKeywords[number];

// resizing settings for the frame and image
export const FrameSizingList = ["fixed" , "stretch" , "mix"] as const;
export type FrameSizing = typeof FrameSizingList[number];
export interface FrameSettings {
  // adjust position to screen or parent's window
  adjust: AdjustmentPosition
  
  // offsets from the "adjust"
  offsetX: number 
  offsetY: number 

  // fixed size when frame is "fixed", or maximum size when it is "mix"
  width: number
  height: number

  // how the frame window(or element) is treated
  sizing: FrameSizing // in case of "mix", expand the frame only if the image is larger than fixed size
}

export const ImageShrinkList = ["none", "longer" , "shorter" , "width" , "height"] as const;
export type ImageShrink = typeof ImageShrinkList[number];
export const ImageQualityList = ["balanced", "low", "medium", "high"] as const;
export type ImageQuality = Exclude<typeof ImageQualityList[number], "balanced">;
export interface ImageSettings {
  // quality "low":<IMG> "medium":<IMG & -ms-interpolation-mode> "high":VML "balanced":decided by scale size
  quality: ImageQuality | "balanced"
  // use alphaimage
  alphaimage?: boolean
  // the image's scale
  scale: number
  // how the image is treated when it is too large for the frame
  shrink: ImageShrink
  // when the actual image size is smaller than fixed frame, expand it to the frame size
  expand: boolean
  // set base direction for adjusted image
  adjust: AdjustmentPosition
}


export const Shapes = {
  'none': '',
  'roundrect': './shapes/roundrect.gif',
  'heart': './shapes/heart.gif',
  'heart2': './shapes/heart2.gif',
  'flower': './shapes/flower.gif',
  'square': './shapes/square.gif',
  'star': './shapes/star.gif',
  'circle': './shapes/circle.gif',
  'pentagon': './shapes/pentagon.gif',
  'hexagon': './shapes/hexagon.gif',
  'octagon': './shapes/octagon.gif',
  'needle': './shapes/needle.gif',
  //'diamond-round': './shapes/diamond.gif',  
  //'clover': './shapes/clover.gif',
  //'spade': './shapes/spade.gif',
  //'hexagram': './shapes/hexagram.gif',
  //'8pstar': './shapes/8pstar.gif',
  //'star4': './shapes/star0.gif',
  //'triangle': './shapes/triangle.gif',
  //'triangle-flip': './shapes/triangle2.gif',
  //'hexagon2': './shapes/hexagon2.gif',
  //'octagon2': './shapes/octagon2.gif',
  //'pentagon2': './shapes/pentagon2.gif',
  //'needle2': './shapes/needle2.gif',
  //'blink': './shapes/blink.gif',
  //'blink2': './shapes/blink2.gif',
  //'windows': './shapes/windows.gif',
  //'shuriken': './shapes/shuriken.gif',
  //'butterfly': './shapes/butterfly.gif',
  //'footprint': './shapes/footprint.gif',
  //'leaf': './shapes/leaf.gif',
  //'keyhole': './shapes/keyhole.gif',

  'file': '',
} as const;
export type ShapeNames = keyof typeof Shapes;
export const ShapeNameList: ShapeNames[] = [];
for( const prop in Shapes ) {
  ShapeNameList.push(prop as ShapeNames);
}

export const IrisStyleList = ["DIAMOND", "CIRCLE", "CROSS", "PLUS", "SQUARE", "STAR"] as const;
export type IrisStyleTypes = typeof IrisStyleList[number];


export const TransitionList = ["none" , "barn" , "blinds" , "checkerboard" , "fade" , "gradientwipe" , "iris" , "inset" , "pixelate" , "strips" , "stretch" , "spiral" , "slide" , "randombars" , "radialwipe" , "randomdissolve" , "wheel" , "zigzag" , "RevealTrans"] as const;
export type Transitions = typeof TransitionList[number];

export const AlphaList = ['none', 'plain', 'radial', 'rect', 'linear'] as const;
export type AlphaTypes = typeof AlphaList[number];

export const Degree360List = [0, 45, 90, 135, 180, 225, 270, 315];
export type Degree360Types = typeof Degree360List[number];

export type FilterSettings = {
  trans: Transitions
  duration: number // *msec

  irisStyle?: IrisStyleTypes
  motion?: "out" | "in"

  // static filter
  alpha?: AlphaTypes
  alphaOpacity?: number // start opacity (end opacity is always 0)
  alphaReverse?: boolean
  alphaDegree?: number // for linear
    //0 Top 
    //45 Top right 
    //90 Right 
    //135 Bottom right 
    //180 Bottom 
    //225 Bottom left 
    //270 Default. Left 
    //315 Top left 

  chroma?: string // color
  shadow?: boolean
  gradient?: boolean
  
  border?: boolean
  borderWidth?: number
  borderColor?: string

  emboss?: boolean
  engrave?: boolean
  blur?: boolean
  blurStr?: number
  glow?: boolean
  glowStr?: number
  glowColor?: string
  
  //basicImage
  invert?: boolean
  grayscale?: boolean
  mirror?: boolean
  xray?: boolean
  //rotation?: 0 | 1 | 2 | 3

  //matrix?: boolean
  matrix?: number // degree

  // shape
  shape?: ShapeNames
  shapeFilePath?: string
  shapestretch?: boolean
  //shapeAdjust?: "frame" | "image" | "image-stretch"
};

// for context menu
export const FilterPropNames = [
  'border', 
  'shadow', 
  //'alpha', 
  'glow',
  'mirror',
  'grayscale',
  //'chroma', 
  //'gradient', 
  'emboss', 
  'engrave',  
  'invert',
  'xray',
  'blur'
  //'matrix'
] as const;


export interface MiscSettings {
  pinned?: boolean
  disableSnap?: boolean
  disableResizing?: boolean
  allowMovingOutsideFrame?: boolean
};


export type SlideshowSettings = {
  status: 'play' | 'stop' | 'pause'
  index: number
  delay: number
  sync: boolean
  gap: number
  randomGap?: boolean
  removeOnError: boolean
  randomizeOnAppend?: boolean
};

export type PictureFrameSettings = {
  enabled: boolean
  framePath: string
  quality: ImageSettings["quality"]
  xratio: number
  yratio: number
  wratio: number
  hratio: number

  shape?: ShapeNames
  width?: number // virtual rect shape size when shape is empty
  height?: number
};


export type ElementSettings = {
  zIndex: number
  overlayLocked: boolean
  disableOverlay: boolean
};
export type WindowSettings = {
  disableInnerDrop?: boolean
  disableHighlightEffects?: boolean
};
export type RootWindowSettings = {
  lang?: LangTypes
  disableAutoSave?: boolean
};

export type FrameSettingsJSON = {
  name: string
  frame: FrameSettings
  image: ImageSettings
  filter: FilterSettings
  slide: SlideshowSettings
  misc: MiscSettings
  picframe?: PictureFrameSettings

  playlist: string[]
};
export type DefaultFrameSettingsJSON = Omit<FrameSettingsJSON, "name" | "playlist">;

export type SettingType = 'frame' | 'image' | 'filter' | 'slide' | 'misc';

export type ElementFrameSettingsJSON = FrameSettingsJSON & {
  element: ElementSettings
}
export type WindowFrameSettingsJSON = Pick<FrameSettingsJSON, "frame" | "misc"> & {
  childElements: ElementFrameSettingsJSON[]
  window: WindowSettings
};
export type RootFrameSettingsJSON = WindowFrameSettingsJSON & {
  //childDialogs: WindowFrameSettingsJSON[]
  root: RootWindowSettings
};


export const FLSS_COPY_TEXT_ID = 'FLSS_CUT_ELEMENT_LIST';
export type FLSSCopyList = {
  id: typeof FLSS_COPY_TEXT_ID
  cutlist: ElementFrameSettingsJSON[]
}

export const ImageScaleList = [0.1, 0.25, 0.5, 1, 1.5, 2, 3, 5, 7, 10] as const;
