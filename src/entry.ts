import { CtrlRoot } from "./ctrl/ctrl-window-root";


declare const hta: any; // HTA Application object
const commandLine = hta.commandLine;

// start application
window.attachEvent('onload', () => {
  CtrlRoot.create(commandLine)?.start();
});
