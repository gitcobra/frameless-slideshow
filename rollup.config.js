import fs from "fs";

// for node modules
import { nodeResolve } from '@rollup/plugin-node-resolve';
// typescript
import typescript from "@rollup/plugin-typescript";
// to load resources
import loadHtml from "rollup-plugin-html";
import json from "@rollup/plugin-json";
// to copy external scripts from node_modules
import copy from 'rollup-plugin-copy-watch';


// clearn up tools
import del from "rollup-plugin-delete";
import cleanup from "rollup-plugin-cleanup";
import strip from "@rollup/plugin-strip";
import replace from '@rollup/plugin-replace';






// development flag
const DEV = !!process.env.ROLLUP_WATCH;
const RELEASE = !!process.env.NODE_BUILD_RELEASE;

// bundle file name
const bundleName = `frameless-slideshow`;
// destination
const dist = `${RELEASE ? bundleName : 'dist'}`;

// sites
const GITHUB_URL = `https://github.com/gitcobra/frameless-slideshow`;


// write banner
let BANNER_TXT = '';
if( !DEV ) {
  const Ver = JSON.parse(fs.readFileSync('./script/version.json'));
  const VERSION_TXT = `${Ver.major}.${Ver.minor}.${String(Ver.build)}${Ver.tag}`;

  BANNER_TXT = `/*
  title: ${bundleName}
  version: ${VERSION_TXT}
  github: ${GITHUB_URL}
*/`;
}









const CommonPlugins = [
  nodeResolve(),
  json({compact: true}),
  loadHtml({
    include: [
      "res/**/*html",
      "res/*.css",
    ],
    htmlMinifierOptions: {
      removeComments: true,
      collapseWhitespace: true,
      //minifyCSS: true,
    },
  }),
  
  // unfortunately rollup-plugin-json uses Object.freeze (that doesn't work on HTA of course).
  // so it replaces "Object.freeze({...})" with "Object({...})".
  replace({
    'Object.freeze': 'Object',
    preventAssignment: true,
  }),
];

const BuildConfig = [
  {
    input: ["src/entry.ts"],
    external: ['hta-ctx-menu', 'hta-drop-target'],
    output: {
      format: "iife",
      file: `${dist}/core/${bundleName}.js`,
      sourcemap: false,
      globals: {
        'hta-ctx-menu': "HtaContextMenu",
        'hta-drop-target': 'HtaDropTarget',
      },
      banner: BANNER_TXT,
    },

    plugins: [
      ...RELEASE ? [
        del({
          targets: [`${dist}/*.js`, `${dist}/*.ts`, `${dist}/dts`],
          hook: 'buildStart',
          verbose: true,
        }),
      ] : [],

      ...CommonPlugins,

      typescript({
        "exclude": ["./test/*.ts"],
        "compilerOptions": {
          "declaration": false,
          "noUnusedParameters": false,
          "noUnusedLocals": false,
        },
      }),

      copy({
        watch: DEV ? ['assets/**/*', 'hta/**/*'] : null,
        targets: [
          { src: 'node_modules/hta-ctx-menu/release/hta-ctx-menu.js', dest: `${dist}/external/` },
          { src: 'node_modules/hta-drop-target/release/hta-drop-target.js', dest: `${dist}/external/` },
          { src: 'node_modules/JSON2/json2.js', dest: `${dist}/external/` },
          { src: 'assets/*/', dest: `${dist}/` },
          { src: `hta/frameless-slideshow${DEV ? '-dev' : ''}.hta`, dest: `${dist}/`, rename: 'frameless-slideshow.hta' },
        ]
      }),

      // remove DEV blocks
      ...RELEASE ? [
        strip({
          include: ["**/*.js", "**/*.ts"],
          labels: ["DEV"],
        }),
        cleanup()
      ] : [],
    ],
    onwarn: suppress_warnings,
    //watch: {clearScreen: false},
  }
];

// for test folder.
if( DEV ) {
  const TEST_SRC = './test/';
  // create output settings for each file in the test folder
  fs.readdirSync(TEST_SRC).forEach(async (file) => {
    if( !fs.statSync(TEST_SRC + file).isFile() || !/\.ts$/i.test(file) )
      return;
    
    BuildConfig.push({
      input: [TEST_SRC + file],
      //external: ['hta-ctx-menu'],
      output: {
        format: "iife",
        dir: './test/testjs',
        sourcemap: false,
        globals: {
          //[externalId]: "HtaContextMenu",
        },
      },

      plugins: [
        typescript({
          "compilerOptions": {
            "declaration": false,
            "noUnusedParameters": false,
            "noUnusedLocals": false,
          }
        }),
        ...CommonPlugins,
      ],
      
      onwarn: suppress_warnings,
      watch: {clearScreen: false},
    });
  });
}

export default BuildConfig;




function suppress_warnings(warning, defaultHandler) {
  if (warning.code === 'THIS_IS_UNDEFINED')
    return;
  
  defaultHandler(warning);
}
