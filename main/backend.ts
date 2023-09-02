import { app, ipcMain, IpcMainEvent, globalShortcut } from 'electron';
import { Logger } from '@promisepending/logger.js';
import { BaseEventStructure } from './structures';
import { Window } from './helpers';
import serve from 'electron-serve';
import { events } from './events';

export class Backend {
  private readonly isProd: boolean = process.env.NODE_ENV === 'production';
  private logger: Logger;
  private controllerWindow: Window;
  private exibitionWindow: Window;

  public static main(logger?: Logger): Backend {
    return new Backend(logger);
  }

  public constructor(logger?: Logger) {
    this.logger = logger || new Logger({
      prefix: 'Backend',
      debug: !this.isProd,
      disableFatalCrash: true,
      allLineColored: true,
    });

    if (this.isProd) {
      serve({ directory: 'app' });
    } else {
      app.setPath('userData', `${app.getPath('userData')} (development)`);
    }

    app.on('window-all-closed', () => {
      app.quit();
    });

    app.once('ready', async () => {
      await this.start();
      await this.registerEvents();
    });
  }

  private async start(): Promise<void> {
    this.controllerWindow = new Window(this, 'controller', {
      width: 800,
      height: 600,
      frame: false,
      transparent: true,
      minHeight: 600,
      minWidth: 800,
    });
    this.controllerWindow.windowInstance.removeMenu();
    this.controllerWindow.loadURL('/home');

    globalShortcut.register('Control+Shift+I', () => {
      if (this.isProd) return false;
      this.controllerWindow.windowInstance.webContents.toggleDevTools();
    });

    this.controllerWindow.windowInstance.on('close', (event: IpcMainEvent) => {
      if (this.exibitionWindow && !this.exibitionWindow.windowInstance.isDestroyed()) {
        event.preventDefault();
        // Ask user if he really wants to close the application
        this.exibitionWindow.windowInstance.webContents.send('app.stop.ask');
      }
    });

    this.controllerWindow.windowInstance.once('closed', () => {
      if (this.exibitionWindow) {
        this.exibitionWindow.destroy();
      }
      process.exit(0);
    });
  }

  private async registerEvents(): Promise<void> {
    for await (const eventClass of events) {
      try {
        this.logger.debug('Registering event ' + eventClass.name);
        const event: BaseEventStructure = new eventClass(this);
        if (event.runOnce()) {
          ipcMain.once(event.getName(), (receivedEvent: IpcMainEvent, ...args: any[]) => event.preExecute(receivedEvent, ...args).catch((error: any) => {
            this.logger.error('An error occurred while executing single-run event ' + event.getName(), error);
          }));
        } else {
          ipcMain.on(event.getName(), (receivedEvent: IpcMainEvent, ...args: any[]) => event.preExecute(receivedEvent, ...args).catch((error: any) => {
            this.logger.error('An error occurred while executing event ' + event.getName(), error);
          }));
        }
      } catch (error) {
        this.logger.error('An error occurred while registering event ' + eventClass.name, error);
      }
    }
  }

  public getLogger(): Logger {
    return this.logger;
  }

  public getControllerWindow(): Window {
    return this.controllerWindow;
  }

  public getExibitionWindow(): Window {
    return this.exibitionWindow;
  }

  public setControllerWindow(window: Window): void {
    this.controllerWindow = window;
  }

  public setExibitionWindow(window: Window): void {
    this.exibitionWindow = window;
  }

  public isProduction(): boolean {
    return this.isProd;
  }
}