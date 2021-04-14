/* eslint-disable no-inner-declarations */
const cluster = require('cluster');

if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);
    const path = require('path');
    const electron = require('electron');
    const { app, BrowserWindow, ipcMain } = electron;
    const { autoUpdater } = require('electron-updater');
    const isDev = require('electron-is-dev');

    var fsThread;

    function generateFsThread() {
        fsThread = cluster.fork();
        fsThread.send({test: true, valid: 3});
        function disconnectHandler() {
            fsThread.removeAllListeners();
            fsThread.kill();
            generateFsThread();
        }
        fsThread.on('disconnect', disconnectHandler);
        fsThread.on('error', disconnectHandler);
        fsThread.on('exit', disconnectHandler);
    }

    if (isDev) {
        const log = require('electron-log');
        log.transports.file.level = 'debug';
        autoUpdater.logger = log;
        require('electron-reload')(__dirname);
    }

    /* Chrome cast testing, (all tests complete sucefully! keeping this comment here be the base of chromecast support code)
        const ChromecastAPI = require('chromecast-api')
        
        const client = new ChromecastAPI()
        
        client.on('device', function (device) {
            console.log("ABOBORA!");
            var mediaURL = 'https://www.youtube.com/watch?v=D0hQI6MW0jc';
        
            device.play(mediaURL, function (err) {
                if (!err) console.log('Playing in your chromecast')
            })
        })
    */
    function createWindow () {
        const win = new BrowserWindow({
            width: 900,
            height: 610,
            transparent: true, 
            frame: false,
            movable: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true,
            },
            icon: path.resolve(__dirname, 'src', 'assets', 'images','logo.png'),
            title: 'Spin Music Player',
        });

        ipcMain.on('synchronous-message', (event, args) => {
            if (args !== 'maximize') {return;}
            if (win.isMaximized()) {
                win.unmaximize();
                event.returnValue = 'screen.events.maximize.contract';
            } else {
                win.maximize();
                event.returnValue = 'screen.events.maximize.fullscreen';
            }
        });
        ipcMain.on('minimize', ()=>{win.minimize();});

        win.loadFile('./src/pages/splashScreen/index.html');
        win.removeMenu();

        win.setThumbarButtons([{
            tooltip: 'previous',
            icon: path.resolve(__dirname, 'src', 'assets', 'images','previousbutton.png'),
            flags: ['disabled'],
            click () { console.log('button0 clicked.'); }
        }, {
            tooltip: 'Play',
            icon: path.resolve(__dirname, 'src', 'assets', 'images','playbutton.png'),
            flags: ['disabled'],
            click () { console.log('button1 clicked'); }
        }, {
            tooltip: 'next',
            icon: path.resolve(__dirname, 'src', 'assets', 'images','nextbutton.png'),
            flags: ['disabled'],
            click () { console.log('button2 clicked.'); }
        }]);

        win.webContents.on('before-input-event', (event, input) => {
            if (input.control && input.shift && input.key.toLowerCase() === 'i') {
                event.preventDefault();
                win.webContents.toggleDevTools();
            }
        });

        /* win.setOverlayIcon(path.resolve(__dirname, 'src', 'assets', 'images','previousbutton.png'), 'Description for overlay')

        win.flashFrame(true)*/

        var avaliableUpdate = false;
        var canUpdate = false;

        autoUpdater.on('checking-for-update', () => {
            win.webContents.send('checkingforupdate');
            setTimeout(() => {
                if (!canUpdate) {
                    win.webContents.send('updatenotavailable');
                }
            }, 15000);
        });

        autoUpdater.on('update-available', () => {
            canUpdate = true;
            win.webContents.send('downloadprogress', 0 + '%');
        });

        // eslint-disable-next-line no-unused-vars
        autoUpdater.on('download-progress', (progress, bytesPsecound, percent, total, transferred) => {
            win.webContents.send('downloadprogress', percent.toString() + '%');
        });
    
        autoUpdater.on('update-downloaded', (updateInfo) => {
            avaliableUpdate = true;
            win.webContents.send('updatedownloaded', JSON.stringify(updateInfo));
        });

        ipcMain.on('installupdate', () => {
            if (avaliableUpdate) {
                autoUpdater.quitAndInstall(true, true);
            } else {
                win.webContents.send('updateerror', 'no update to install');
            }
        });

        generateFsThread();

        fsThread.on('message', (msg) => {
            win.webContents.send(msg.action, JSON.stringify(msg.content));
        });

        ipcMain.on('SubProcess.Fs.ReadDirAsync', (event, dir) => {
            fsThread.send({action: 'Fs.ReadDirAsync', content: dir});
        });
    }

    app.whenReady().then(createWindow);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    ipcMain.on('app_version', (event) => {
        if (!isDev) {
            autoUpdater.checkForUpdatesAndNotify();
            setInterval(() => {
                autoUpdater.checkForUpdatesAndNotify();
            }, 780000); // 13 minutes
        }
        event.sender.send('app_version', { version: app.getVersion(), rootPath: __dirname });
    });

} else {
    const fs = require('fs');

    console.log('Worker ' + cluster.worker.id + ' active!');
    process.on('message', (msg) => {
        if (msg.action === 'Fs.ReadDirAsync') {
            fs.readdir(msg.content[0], (err, files) => {
                if (err) {return process.emit('error');}
                process.send({action: 'SubProcess.Fs.ReadDirAsync.Results', content: [files, msg.content[1]]});
            });
        }
    });
}