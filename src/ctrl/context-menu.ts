
declare var hta: any;

import { i18n, $t } from "../i18n/i18n";
import HtaContextMenu from "hta-ctx-menu";
//import HtaContextMenu from "../../../hta-ctx-menu/release/hta-ctx-menu";
import type { _CtrlBase } from "./ctrl-_base";
import { _CtrlWindow } from "./ctrl-window-_base";
import { CtrlRoot } from "./ctrl-window-root";
import { AdjustmentKeywords, AlphaList, Degree360List, FilterPropNames, FrameSizingList, ImageQualityList, ImageShrinkList, ShapeNameList, TransitionList } from "src/model/data-types";
import * as fs from "../utils/filesystem";
import { CtrlElement } from "./ctrl-element";

const langs = i18n.getLanguages();


// generateMenuStat() generates radios or checkboxes dynamically from setttings of multiple selected child elements
type ValuesForGenerator<T extends 'radios' | 'checkboxes'> = {
  type: T
  values: (string|number)[]
  currentValue: any,
  translate?: string
};
function generateMenuStat<T extends 'radios'>(param: ValuesForGenerator<T>): { labels: [string, any, boolean][] };
function generateMenuStat<T extends 'checkboxes'>(param: ValuesForGenerator<T>): { labels: [string, string, boolean][] };
function generateMenuStat<T extends 'radios' | 'checkboxes'>(param: ValuesForGenerator<T>) {
  const labels = [];
  const currentValue = param.currentValue;
  if( 'values' in param ) {
    const list = param.values;
    for( const value of list ) {
      const p = String(value);
      if( value === undefined )
        continue;
      const translate = param.translate?.replace(/\$\{\}/, String(p));
      switch( param.type ) {
        case 'radios':
          labels.push([translate ? $t(translate as any, p) : p, value, value === currentValue]);
          break;
        case 'checkboxes':
          labels.push([translate ? $t(translate as any, p) : p, p, !!currentValue[value]]);
          break;
      }
    }
  }

  return {
    //type: param.type,
    labels,
  };
  
}

// Element
export function getElementCtxMenuParameter(ctx: CtrlElement, selectedList: CtrlElement[]): HtaContextMenu["Types"]["MenuItemParameterOrNull"][] {
  const ssStarted = ctx.getModel().isPlayingSlideShow();
  const model = ctx.getModel();

  const parent = ctx.getParentCtrl();
  const selectedItemCount = ctx.getParentCtrl().getSelectedElementList().length;
  const multipleSelected = selectedItemCount > 1;
  const selected = !!ctx.getParentCtrl().getSelectedElementList().length;
  
  const imgpath = ctx.getModel().getList().get();
  const {w, h} = ctx.getView().getViewImagePos();

  const picframe = ctx.getModel().getPictureFrame();
  const defFrame = ctx.getModel().getDefaultSettings();

  const equalData = ctx.getParentCtrl().pickSameSettingsFromSelectedElements();



  const prepend: HtaContextMenu["Types"]["MenuItemParameterOrNull"][] = [
    {
      label: $t('slideshow'),
      type: 'submenu',
      icon: {
        text: '\xb7',
        fontFamily: 'Webdings',
      },
      items: [
        {
          label: ssStarted ? $t('stop-slide') : $t('start-slide'),
          flash: !ssStarted ? 500 : 0,
          icon: {
            text: !ssStarted ? '4' : '\x3b',
            fontFamily: 'Webdings',
          },
          onactivate<T extends _CtrlBase>(ev: any) {
            ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
              ssStarted ? item.getModel().stopSlideShow() : item.getModel().startSlideShow();
            });
          }
        },
        {
          type: 'submenu',
          label: $t('slide-delay'),
          icon: {
            text: '6',
            fontFamily: 'Wingdings',
          },
          items: [
            {
              type: 'radios',
              ...generateMenuStat({
                type: 'radios',
                currentValue: (equalData?.slide.delay || 0 ) / 1000,
                values: [1, 3, 5, 10, 20, 30, 60, 180, 300, 600, 1800, 3600],
                translate: 'slide-delay-val',
              }),
              fontFamily: 'MS Gothic',
              onchange(ev) {
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setSlideshowSettings({'delay': ev.value * 1000});
                });
              }
            },
            { type: 'separator' },
            {
              label: $t('slide-delay-input'),
              onactivate(ev) {
                let time = Number(parent.prompt('Input slide interval time (seconds)', String(Number(equalData?.slide.delay || 0)/1000)));
                if( !(time >= 0) ) {
                  alert('invalid number');
                  return;
                }

                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setSlideshowSettings({'delay': time * 1000});
                });
              }
            },
          ]
        },
        {
          type: 'submenu',
          label: $t('transition'),
          items: [
            {
              type: 'radios',
              name: 'transradios',
              ...generateMenuStat({
                currentValue: equalData?.filter.trans,
                values: TransitionList as any,
                type: 'radios',
                translate: 'trans.${}',
              }),
              //labels: RecordConfig['transradios'].result!,
              onchange(ev) {
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setFilterSettings({ trans: ev.value });
                });
              }
            },
          ]
        },
        {
          label: $t('trans-duration'),
          type: 'submenu',
          items: [
            {
              type: 'radios',
              name: 'trans-duration',
              ...generateMenuStat({
                type: 'radios',
                currentValue: equalData?.filter.duration,
                values: [100, 250, 500, 750, 1000, 1500, 2000, 3000, 5000, 9000],
                translate: 'trans-duration-val',
              }),
              onchange(ev) {
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setFilterSettings({'duration': ev.value});
                });
              }
            },
            {
              label: 'Input trans duration',
              onactivate(ev) {
                let duration = Number(parent.prompt('Input transition duration (ms)', String(equalData?.filter.duration || 100)));
                if( !duration || duration < 0 )
                  return;
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setFilterSettings({duration});
                });
              }
            },
          ]
        },

        {
          label: $t('trans-sync'),
          type: 'checkbox',
          checked: equalData?.slide.sync,// model.getSlideshowSettings('sync'),
          onchange(ev) {
            ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
              item.getModel().setSlideshowSettings({'sync': !!ev.checked});
            });
          }
        },
        {
          label: $t('trans-sync-gap'),
          type: 'submenu',
          disabled: !equalData?.slide.sync,// !model.getSlideshowSettings('sync'),
          items: [
            {
              type: 'radios',
              name: 'delaygap',
              fontFamily: 'MS Gothic',
              ...generateMenuStat({
                type: 'radios',
                currentValue: equalData?.slide.gap,
                values: [0, 100, 250, 500, 1000],
                translate: 'delaygap-val',
              }),
              onchange(ev) {
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setSlideshowSettings({'gap': Number(ev.value)});
                });
              }
            },
            { type: 'separator' },
            {
              label: $t('trans-randomgap'),
              type: 'checkbox',
              checked: equalData?.slide.randomGap,// model.getSlideshowSettings('randomGap'),
              onchange(ev) {
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setSlideshowSettings({'randomGap':ev.checked});
                });
              },
            },
            {
              label: $t('trans-gap-input'),
              onactivate(ev) {
                ctx.getParentCtrl().inputDelayGaps();
              }
            },
            {
              label: $t('trans-gap-input-stepwise'),
              onactivate(ev) {
                ctx.getParentCtrl().inputDelayGaps(true);
              }
            },
          ]
        },

        { type: 'separator' },
        {
          label: $t('add-image'),
          icon: {
            text: '\x9f',
            fontFamily: 'Webdings',
          },
          onactivate(ev: any) {
            ctx.addImage();
          }
        },
        {
          label: $t('add-folder'),
          icon: {
            text: '\x30',
            fontFamily: 'Wingdings',
          },
          onactivate(ev: any) {
            ctx.addFolder();
          }
        },
        {
          label: $t('shuffle-list'),
          icon: {
            text: 'q',
            fontFamily: 'Webdings',
          },
          flash: 300,
          onactivate(ev: any) {
            ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
              item.shuffleList();
            });
          }
        },
        {
          label: $t('shuffle-on-append'),
          type: 'checkbox',
          checked: equalData?.slide.randomizeOnAppend,// model.getSlideshowSettings('randomizeOnAppend'),
          onchange(ev: any) {
            ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
              item.getModel().setSlideshowSettings({randomizeOnAppend: ev.checked});
            });
          }
        },
        {
          label: $t('remove-failed-image'),
          type: 'checkbox',
          checked: equalData?.slide.removeOnError, //ctx.getModel().getSlideshowSettings('removeOnError'),
          onchange(ev, ctx) {
            ctx.getModel().setSlideshowSettings({'removeOnError':ev.checked});
          }
        },
        { type: 'separator' },

        {
          label: $t('edit-playlist'),
          icon: {
            text: '\x9e',
            fontFamily: 'Webdings',
          },
          onactivate() {
            ctx.openPlaylistEditor();
          }
        },
        {
          label: $t('clear-playlist'),
          onactivate(ev) {
            ctx.getParentCtrl().clearPlayListOfSelectedElements();
          }
        }
      ],
    },

    { type: 'separator' },


    {
      label: !equalData?.misc.pinned ? $t('pin-frame') : $t('unpin-frame'),//!ctx.getModel().getMiscSettings('pinned') ? $t('pin-frame') : $t('unpin-frame'),
      type: 'checkbox',
      checked: equalData?.misc.pinned, // ctx.getModel().getMiscSettings('pinned'),
      checkboxIcon: {
        text: '\xeb',
        fontFamily: 'Webdings',
      },
      onchange(ev) {
        ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
          item.getModel().setMiscSettings({'pinned': ev.checked});
        });
      }
    },
    {
      label: $t('frame-settings'),
      type: 'submenu',
      icon: {
        text: '\x32',
        fontFamily: 'Webdings',
      },
      items:[
        {
          label: $t('cut-frame'),
          disabled: !selected,
          onactivate() {
            ctx.getParentCtrl().copySelectedElementsToClipboard(true);
          },
        },
        {
          label: $t('copy-frame'),
          disabled: !selected,
          onactivate() {
            ctx.getParentCtrl().copySelectedElementsToClipboard();
          },
        },
        {
          label: $t('close-frame'),
          disabled: !selected,
          onactivate() {
            ctx.getParentCtrl().removeSelectedChildElements();
          }
        },
        { type: 'separator' },

        picframe ? {
          label: $t('remove-picframe'),
          icon: {
            text: '\xa3',
            fontFamily: 'Webdings',
          },
          onactivate() {
            ctx.getModel().deletePictureFrame();
          }
        } : {
          label: $t('set-picframe'),
          flash: 200,
          icon: {
            text: '\xa2',
            fontFamily: 'Webdings',
          },
          onactivate() {
            ctx.setThisAsPictureFrameForTarget();
          }
        },
        {
          label: $t('resize-frame'),
          onactivate() {
            parent.resizeSelectedFrames(ctx);
          }
        },

        {
          label: $t('fit-frame'),
          onactivate() {
            ctx.fitFrameToParentWindow();
          }
        },
        {
          label: $t('set-frame-backmost'),
          onactivate() {
            ctx.getModel().setBackgroundZIndex();
          }
        },
        
        {
          type: 'submenu',
          label: $t('frame-advanced-settings'),
          items: [
            {
              label: $t('disable-resizing'),
              type: 'checkbox',
              checked: equalData?.misc.disableResizing,// ctx.getModel().getMiscSettings('disableResizing'),
              disabled: ctx.getModel().getParent()?.getMiscSettings('pinned'),
              onchange(ev) {
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setMiscSettings({'disableResizing': ev.checked});
                });
              }
            },
            {
              label: $t('disable-snap'),
              type: 'checkbox',
              checked: equalData?.misc.disableSnap,//ctx.getModel().getMiscSettings('disableSnap'),
              disabled: ctx.getModel().getParent()?.getMiscSettings('pinned'),
              onchange(ev) {
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setMiscSettings({'disableSnap': ev.checked});
                });
              }
            },
            {
              label: $t('disable-overlay'),
              type: 'checkbox',
              checked: equalData?.element.disableOverlay,//ctx.getModel().getElementSettings('disableOverlay'),
              disabled: equalData?.element.overlayLocked,//ctx.getModel().getElementSettings('overlayLocked'),
              onchange(ev) {
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setElementSettings({'disableOverlay': ev.checked});
                });
              }
            },
            {
              label: $t('allow-moving-outside-frame'),
              type: 'checkbox',
              checked: equalData?.misc.allowMovingOutsideFrame,//ctx.getModel().getElementSettings('disableOverlay'),
              onchange(ev) {
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setMiscSettings({'allowMovingOutsideFrame': ev.checked});
                });
              }
            },
            {
              label: $t('lock-overlay'),
              type: 'checkbox',
              checked: equalData?.element.overlayLocked,//ctx.getModel().getElementSettings('overlayLocked'),
              //disabled: ctx.getModel().getElementSettings('disableOverlay'),
              onchange(ev) {
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setElementSettings({'overlayLocked': ev.checked});
                });
              }
            },
            {
              label: $t('split-frame'),
              onactivate() {
                ctx.getParentCtrl().splitImagesFromChildElement(ctx);
              }
            },
            {
              label: $t('rename-frame'),
              onactivate() {
                ctx.openRenameDialog();
              }
            },
          ]
        },

        {
          label: $t('frame-set-as-default'),
          onactivate() {
            ctx.getModel().setDefaultSettingsByModel(ctx.getModel());
          }
        },
        defFrame ? {
          label: $t('remove-default-frame'),
          onactivate() {
            ctx.getModel().removeDefaultSettings();
          }
        } : null,
      ]
    },


    {
      type: 'submenu',
      label: $t('image-settings'),
      icon: {
        text: '\x9f',
        fontFamily: 'Webdings',
      },
      items: [
        {
          type: 'submenu',
          label: $t('image-quality'),
          items: [
            {
              type: 'radios',
              name: 'imgquality',
              //labels: RecordConfig['imgquality'].result!,
              ...generateMenuStat({
                type: 'radios',
                currentValue: equalData?.image.quality,
                values: ImageQualityList as any,
                translate: 'imgquality.${}',
              }),
              onchange(ev) {
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setImageSettings({'quality':ev.value});
                });
              },
            }
          ]
        },
        {
          type: 'submenu',
          label: $t('filters'),
          items: [
            {
              type: 'submenu',
              label: $t('filters.alpha'),
              items: [
                {
                  type: 'radios',
                  name: 'alphatype',
                  ...generateMenuStat({
                    type: 'radios',
                    currentValue: equalData?.filter.alpha,
                    values: AlphaList as any,
                    //translate: '-val',
                  }),
                  onchange(ev) {
                    ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                      item.getModel().setFilterSettings({'alpha': ev.value});
                    });
                  }
                },
                {
                  type: 'submenu',
                  label: $t('filter-alpha-linear-degrees'),
                  items: [
                    {
                      type: 'radios',
                      name: 'alphadegree',
                      disabled: equalData?.filter.alpha !== 'linear',
                      fontFamily: 'MS Gothic',
                      ...generateMenuStat({
                        type: 'radios',
                        currentValue: equalData?.filter.alphaDegree,
                        values: Degree360List as any,
                        translate: 'degree-val',
                      }),
                      onchange(ev) {
                        ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                          item.getModel().setFilterSettings({'alphaDegree': parseInt(ev.value)});
                        });
                      }
                    }
                  ]
                },
                { type: 'separator' },
                {
                  type: 'submenu',
                  label: $t('filters.alpha-opacity'),
                  items: [
                    {
                      type: 'radios',
                      name: 'alpha-opacity',
                      align: 'right',
                      fontFamily: 'MS Gothic',
                      ...generateMenuStat({
                        type: 'radios',
                        currentValue: equalData?.filter.alphaOpacity,
                        values: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10],
                        //translate: 'degree-val',
                      }),
                      onchange(ev) {
                        ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                          // set alpha flag on if it is "none"
                          const current = item.getModel().getFilterSettings('alpha');
                          const flag = ev.value && ev.value !== 100 && (!current || current === 'none') && { alpha: 'plain' } || {};

                          item.getModel().setFilterSettings({'alphaOpacity': ev.value, ...flag});
                        });
                      }
                    },
                  ]
                },
                {
                  type: 'checkbox',
                  label: $t('filters.alpha-reverse'),
                  checked: equalData?.filter.alphaReverse, //ctx.getModel().getFilterSettings('alphaReverse'),
                  onchange(ev) {
                    ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                      item.getModel().setFilterSettings({ 'alphaReverse': ev.checked });
                    });
                  }
                }
              ]
            },
            {
              type: 'checkboxes',
              ...generateMenuStat({
                type: 'checkboxes',
                currentValue: equalData?.filter,
                values: FilterPropNames as any,
                translate: 'filters.${}',
              }),
              onchange(ev) {
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  if( typeof ev.checked === 'boolean' )
                    item.getModel().setFilterSettings({ [ev.value]: ev.checked });
                });
              }
            },
            
            {
              type: 'submenu',
              label: $t('filters-rotation-list'),
              items: [
                {
                  type: 'radios',
                  name: 'rotation',
                  align: 'right',
                  fontFamily: 'MS Gothic',
                  ...generateMenuStat({
                    type: 'radios',
                    currentValue: equalData?.filter.matrix,
                    values: Degree360List as any,
                    translate: 'degree-val',
                  }),
                  onchange(ev) {
                    ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                      item.getModel().setFilterSettings({'matrix': parseInt(ev.value)});
                    });
                  }
                },
              ]
            },
            
            { type: 'separator' },

            {
              label: 'Border Width',
              onactivate(ev) {
                let width = Number(parent.prompt('Input border width', '1'));
                if( !width )
                  return;
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setFilterSettings({border:true, 'borderWidth': width});
                });
              }
            },
            {
              label: 'Border Color',
              onactivate(ev) {
                const c = parent.colorPicker();
                const color = (((c & 0xFF) << 16 | (c & 0x00FF00) | (c >> 16) ) | 0x1000000).toString(16).substring(1);
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setFilterSettings({border:true, 'borderColor': color});
                });
              }
            },
            {
              label: 'Glow Strength',
              onactivate(ev) {
                const width = Number(parent.prompt('Input glow strength', '1'));
                if( !width )
                  return;
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setFilterSettings({glow:true, 'glowStr': width});
                });
              }
            },
            {
              label: 'Glow Color',
              onactivate(ev) {
                const c = parent.colorPicker();
                const color = (((c & 0xFF) << 16 | (c & 0x00FF00) | (c >> 16) ) | 0x1000000).toString(16).substring(1);
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setFilterSettings({glow:true, 'glowColor': color});
                });
              }
            },
            {
              label: 'Blur Strength',
              onactivate(ev) {
                const str = Number(parent.prompt('Input Blur strength', '1'));
                if( !(str >= 0) ) {
                  return;
                }
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setFilterSettings({blur:!!str, 'blurStr': str});
                });
              }
            },
          ]
        },
        {
          type: 'submenu',
          label: $t('shape'),
          items: [
            {
              type: 'radios',
              name: 'shapes',
              ...generateMenuStat({
                type: 'radios',
                currentValue: equalData?.filter.shape,
                values: ShapeNameList,
              }),
              onchange(ev) {
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setFilterSettings({ shape: ev.value });
                });
              }
            },
            { type: 'separator' },
            {
              label: $t('filters.shape-select-image'),
              onactivate() {
                const file = fs.openFileDialog('', 'test');
                if( !file )
                  return;
                ctx.getModel().setFilterSettings({'shape': 'file', 'shapeFilePath': file});
              }
            },
            {
              type: 'checkbox',
              label: $t('filters.shape-stretch'),
              checked: equalData?.filter.shapestretch,//ctx.getModel().getFilterSettings('shapestretch'),
              onchange(ev) {
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setFilterSettings({ 'shapestretch': ev.checked });
                });
              }
            }
          ]
        },
      ]
    },

    {
      type: 'submenu',
      label: $t('view'),
      icon: {
        text: '\x4e',
        fontFamily: 'Webdings',
      },
      items: [
        {
          type: 'radios',
          name: 'framesizing',
          ...generateMenuStat({
            type: 'radios',
            currentValue: equalData?.frame.sizing,
            values: FrameSizingList as any,
            translate: 'frameview.${}',
          }),
          onchange(ev) {
            ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
              item.getModel().setFrameSettings({ 'sizing': ev.value });
              if( ev.value === 'stretch' ) {
                item.getModel().setImageSettings({'shrink': 'none'});
              }
              const pos = item.getView().getViewFramePos();
              let {x, y} = pos;
              if( x < 0 )
                x = 0;
              if( y < 0 )
                y = 0;
              item.getModel().moveFrame(x, y);
            });
          }
        },
        {
          type: 'submenu',
          label: $t('frame-position'),
          items: [
            {
              type: 'radios',
              name: 'frams-position',
              ...generateMenuStat({
                type: 'radios',
                currentValue: equalData?.frame.adjust,
                values: AdjustmentKeywords as any,
              }),
              onchange(ev) {
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setFrameSettings({ adjust: ev.value, offsetX: 0, offsetY: 0 });
                });
              }
            }
          ]
        },
        { type: 'separator' },


        {
          type: 'submenu',
          label: $t('image-scale'),
          icon: {
            text: '\x4c',
            fontFamily: 'Webdings',
          },
          items: [
            {
              type: 'radios',
              name: 'imgscale',
              onchange(ev) {
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setImageSettings({'scale':ev.value});
                  item.getModel().setImageSettings({'shrink': 'none'});
                });
              },
              ...generateMenuStat({
                type: 'radios',
                currentValue: equalData?.image.scale,
                values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
              }),
            }
          ]
        },

        {
          type: 'radios',
          name: 'image-fitting',
          onchange(ev) {
            ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
              item.getModel().setImageSettings({'shrink': ev.value});
            });
          },
          disabled: equalData?.frame.sizing === 'stretch', //ctx.getModel().getFrameSettings('sizing') === 'stretch',
          //selectedIndex: multipleSelected ? -1 : {none:0, longer:1, shorter:2, width:3, height:4}[shrink],
          //labels: RecordConfig['imagefitting'].result!,
          //record: RecordConfig['imagefitting'].record!,
          ...generateMenuStat({
            type: 'radios',
            currentValue: equalData?.image.shrink,
            values: ImageShrinkList as any,
            translate: 'imageview.${}',
          }),
        },

        {
          type: 'checkbox',
          label: $t('imageview.expand'),
          disabled: equalData?.frame.sizing === 'stretch', //ctx.getModel().getFrameSettings('sizing') === 'stretch',
          checked: equalData?.image.expand, // ctx.getModel().getImageSettings('expand'),
          onchange(ev) {
            ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
              item.getModel().setImageSettings({'expand':ev.checked});
            });
          }
        },
        {
          type: 'submenu',
          label: $t('image-position'),
          items: [
            {
              type: 'radios',
              name: 'imgposition',
              ...generateMenuStat({
                type: 'radios',
                currentValue: equalData?.image.adjust,
                values: AdjustmentKeywords as any,
              }),
              onchange(ev) {
                ctx.getParentCtrl().doSometingToAllSelectedElements(item => {
                  item.getModel().setImageSettings({'adjust':ev.value});
                });
              }
            }
          ]
        },
      ]
    },
    { type: 'separator' },


    {
      label: $t('file-management'),
      type: 'submenu',
      disabled: !imgpath,
      icon: {
        text: '\x34',
        fontFamily: 'Wingdings',
      },
      items: [
        {
          label: `
            <div><img src="${imgpath}" ${ h > w ? 'height' : 'width'}="128"></div>
            <div style="font-size:xx-small; word-break:break-all; word-wrap:break-word; width:200px; zoom:1; position:relative;">${imgpath}</div>
          `,
          nowrap: false,
          html: true,
          unselectable: true,
        },
        { type: 'separator' },
        {
          label: $t('file-open'),
          onactivate(ev, ctx) {
            if( imgpath ) {
              fs.shellExecute(imgpath);
            }
          }
        },
        {
          label: $t('open-parent'),
          icon: {
            text: '1',
            fontFamily: 'Wingdings',
          },
          onactivate(ev, ctx) {
            if( imgpath ) {
              fs.explorer(imgpath);
            }
          }
        },
        /*
        {
          label: $t('invoke-delete'),
          onactivate(ev) {
            if( imgpath ) {
              if( confirm("trash box") )
                fs.invokeDelete(imgpath);
            }
          }
        },
        */
        {
          label: $t('throw-trash'),
          icon: {
            text: '\x72',
            fontFamily: 'Webdings',
          },
          onactivate(ev) {
            if( imgpath ) {
              if( confirm($t('confirm-moveto-trash')) )
                fs.throwToTrashbox(imgpath);
            }
          }
        }
      ],
    },



  ];

  return prepend;
}




// Window
export function getWindowCtxMenuParameter(ctx: _CtrlWindow): HtaContextMenu["Types"]["MenuItemParameter"][] {
  return [

  ];
}



// Root
export function getRootCtxMenuParameter(ctx: CtrlRoot): HtaContextMenu["Types"]["MenuItemParameterOrNull"][] {
  const allSSStarted = ctx.activeSlideshowsExist();
  const cutlist = ctx.getElementsAsJSONFromClipboard();
  
  return [
    {
      label: !ctx.getModel().getMiscSettings('pinned')? $t('pin-window') : $t('unpin-window'),
      type: 'checkbox',
      checked: ctx.getModel().getMiscSettings('pinned'),
      checkboxIcon: {
        text: '\xeb',
        fontFamily: 'Webdings',
      },
      onchange(ev) {
        ctx.getModel().setMiscSettings({'pinned': !ctx.getModel().getMiscSettings('pinned')});
      }
    },

    {
      type: 'submenu',
      label: $t('new-frame'),
      items: [
        {
          label: $t('add-newframe'),
          disabled: ctx.isPinned(),
          onactivate(ev) {
            const size = ctx.getModel().getFramePos();
            const w = Math.max(120, size.w / 4);
            const h = Math.max(90, size.h / 4);
            const x = ev.rootX - size.x;
            const y = ev.rootY - size.y;
            const item = ctx.createNewChildElement(x, y, w, h);
            
            ctx.clearSelectedElementList();
            ctx.addToSelectedElementList(item);
          }
        },
        {
          label: $t('open-new-window'),
          onactivate(ev) {
            ctx.openNewWindow();
          }
        },
        {
          label: $t('import-frames-from-flss'),
          disabled: ctx.isPinned(),
          onactivate: (ev) => {
            const path = ctx.openDialogToLoadFlss();
            if( path )
              ctx.importChildElementsFromFlss(path);
          }
        },
      ],
    },

    {
      type: 'submenu',
      label: $t('arrange-frames'),
      disabled: ctx.isPinned(),
      items: [
        {
          label: $t('select-all-frames'),
          disabled: ctx.isPinned(),
          onactivate() {
            ctx.selectAllChildElements();
          }
        },
        {
          label: $t('unpin-all-frames'),
          flash: 100,
          onactivate() {
            ctx.pinAllChildElements(false);
          }
        },
        {
          label: $t('pin-all-frames'),
          flash: 100,
          onactivate() {
            ctx.pinAllChildElements(true);
          }
        },
        {
          label: $t('disable-all-overlays'),
          flash: 100,
          onactivate() {
            ctx.setAllOverlays(false);
          }
        },
        {
          label: $t('enable-all-overlays'),
          flash: 100,
          onactivate() {
            ctx.setAllOverlays(true);
          }
        },
        {
          label: $t('lock-all-overlays'),
          flash: 100,
          onactivate() {
            ctx.setLockAllOverlays(true);
          }
        },
        {
          label: $t('unlock-all-overlays'),
          flash: 100,
          onactivate() {
            ctx.setLockAllOverlays(false);
          }
        },
        {
          label: $t('sort-frames'),
          onactivate() {
            ctx.sortChildElements();
          }
        },
        {
          label: $t('shrink-frame'),
          onactivate() {
            ctx.shrinkWindowToChildrenSize();
          }
        },
        { type: 'separator' },
        {
          label: $t('disable-inner-drop'),
          type: 'checkbox',
          checked: ctx.getModel().getWindowSettings('disableInnerDrop'),
          onchange(ev) {
            ctx.getModel().setWindowSettings({'disableInnerDrop': ev.checked});
          }
        },
        {
          label: $t('disable-highlight-effects'),
          type: 'checkbox',
          checked: ctx.getModel().getWindowSettings('disableHighlightEffects'),
          onchange(ev) {
            ctx.getModel().setWindowSettings({'disableHighlightEffects': ev.checked});
          }
        },
      ]
    },

    cutlist ? {
      label: $t('paste-frame'),
      disabled: ctx.isPinned(),
      onactivate(ev) {
        const size = ctx.getModel().getFramePos();
        const x = ev.rootX - size.x;
        const y = ev.rootY - size.y;
        ctx.pasteElementsFromJSON(cutlist, x, y);
      }
    } : null,
    { type: 'separator' },
    
    
    {
      label: allSSStarted ? 'Stop All Slideshows' : 'Start All Slideshows', 
      flash: !allSSStarted ? 500 : 0,
      icon: {
        text: !allSSStarted ? '\x38' : '\x3c',
        fontFamily: 'Webdings',
      },
      onactivate(ev: any) {
        allSSStarted ? ctx.stopAllSlideshows() : ctx.startAllSlideshows();
      }
    },
    {
      label: $t('settings'),
      type: 'submenu',
      icon: {
        text: '\x40',
        fontFamily: 'Webdings',
      },
      items: [
        {
          label: $t('save-as'),
          onactivate() {
            ctx.saveAs();
          }
        },
        {
          label: $t('create-shortcut'),
          onactivate() {
            //ctx.createShortcut();
            ctx.createShortcut();
          }
        },
        {
          label: $t('languages'),
          type: 'submenu',
          icon: {
            text: '\xfd',
            fontFamily: 'Webdings',
          },
          items: [
            {
              type: 'radios',
              labels: (() => {
                const labels: [string, string][] = [];
                for( const lang of langs ) {
                  labels.push([$t(lang) || lang, lang]);
                }
                return labels;
              })(),
              selectedIndex: (() => {for(let i=langs.length;i--;)if(langs[i]===i18n.getLang())return i;})(),
              onchange(ev) {
                ctx.getModel().setRootWindowSettings({lang: ev.value});
                ctx.refreshStartingMenu();
              }
            }
            
          ]
        },
        /*
        {
          label: "get monitors",
          onactivate() {
            ctx.getMonitors();
          }
        },
        */
        {
          label: 'File Association',
          type: 'submenu',
          items: [
            {
              label: $t('set-association'),
              onactivate() {
                ctx.setAssociation();
              },
            },
            {
              label: $t('remove-association'),
              onactivate() {
                ctx.removeAssociation();
              },
            },
            { type: 'separator' },
            {
              label: $t('create-app-shortcut-to-desktop'),
              onactivate() {
                //ctx.createShortcut();
                ctx.createAppShortcut();
              }
            },
            /*
            {
              label: $t('create-startup'),
              onactivate() {
                ctx.createStartup();
              }
            },
            */
            {
              label: $t('open-startup'),
              icon: {
                text: '1',
                fontFamily: 'Wingdings',
              },
              onactivate() {
                ctx.openStartupFolder();
              }
            },
            {
              label: $t('open-sendto'),
              icon: {
                text: '1',
                fontFamily: 'Wingdings',
              },
              onactivate() {
                ctx.openSendToFolder();
              }
            },
          ]
        },
        /*
        {
          label: $t('open-zipfolder'),
          icon: {
            text: '1',
            fontFamily: 'Wingdings',
          },
          onactivate() {
            ctx.openZipFolder();
          }
        },
        */

        { type: 'separator' },
        {
          label: $t('about'),
          type: 'submenu',
          items: [
            {
              html: true,
              nowrap: false,
              label: ctx.getAboutHTML(),
              unselectable: true,
            },
            { type: 'separator' },
            {
              label: $t('goto-homepage'),
              icon: {
                text: '\xc2',
                fontFamily: 'Webdings',
              },
              onactivate() {
                ctx.openWebSite();
              }
            },
          ],
        },
      ]
    },
    { type: 'separator' },
    /*
    {
      label: $t('exit-without-saving'),
      onactivate() {
        if( ctx.confirmToExitWithoutSaving() )
          ctx.close();
      }
    },
    */
    {
      label: $t('exit'),
      onactivate() {
        if( ctx.confirmSaveBeforeExit() )
          ctx.close();
      }
    }
  ];
}
