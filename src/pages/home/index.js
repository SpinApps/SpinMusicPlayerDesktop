/* eslint-disable no-undef, no-unused-vars */

var selectFolder = () => {};
var updateAutomaticGeneratedFields = () => {};
var itemViewerButtonsFunctions = [];
var FolderDirIndex = 0;

function resetFields() {
    document.getElementsByClassName('albums')[0].innerHTML = '<h1 class="title">Albuns</h1>';
    document.getElementsByClassName('artists')[0].innerHTML = '<h1 class="title">Artists</h1>';
    document.getElementsByClassName('musics')[0].innerHTML = '<h1 class="title">Musics</h1>';
    document.getElementsByClassName('videos')[0].innerHTML = '<h1 class="title">Videos</h1>';
}

window.loadedComplete = () => {
    console.log('ActivePage javascript loaded!');
    const fs = window.require('fs');
    const path = window.require('path');

    const thumbsupply = window.require('thumbsupply');
    var ffmpeg = window.require('fluent-ffmpeg');
    const ffmpegPath = path.resolve(window.__dirname, '..', '..', 'assets', 'ffmpeg', 'ffmpeg.exe');
    const ffprobePath = path.resolve(window.__dirname, '..', '..', 'assets', 'ffmpeg', 'ffprobe.exe');
    console.log('FFmpeg path: ' + ffmpegPath);
    console.log('FFprobe path: ' + ffprobePath);
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);
    
    updateFoldersList();

    selectFolder = () => {
        window.dialog.showOpenDialog({
            properties: ['openDirectory']
        }).then(results => {
            if (results.canceled) {return;}
            var folderToAdd = results.filePaths[0];
            folderToAdd = folderToAdd.replace(/,/g, 'SData-SemilyCollomI');

            var currentFolders = localStorage.getItem('mediaFolders');
            if (currentFolders) {
                var folders = currentFolders.split(',');
                if (!folders.includes(folderToAdd)) {
                    currentFolders += ',' + folderToAdd;
                }
            } else {
                currentFolders = folderToAdd;
            }
            localStorage.setItem('mediaFolders', currentFolders);
            updateFoldersList();
        });
    };

    updateAutomaticGeneratedFields = () => {
        if (!localStorage.getItem('mediaFolders') || localStorage.getItem('mediaFolders') === '') {return;}
        var folders = localStorage.getItem('mediaFolders').split(',');
        var treadtedFolders = [];
        folders.forEach(Path => {treadtedFolders.push(Path.replace(/SData-SemilyCollomI/g, ','));});
        resetFields();
        FolderDirIndex += 1;
        treadtedFolders.forEach((Folder, index) => {
            setTimeout(() => {
                GenerateAutomaticFields(Folder, 1, FolderDirIndex);
            }, 500 * index);
        });
    };
    updateAutomaticGeneratedFields();

    function GenerateAutomaticFields(Directory, index, readingIndex) {
        index = index || 1;
        fs.readdir(Directory, (err, files) => {
            if (!files) {return;}
            if (readingIndex !== FolderDirIndex) {return resetFields();}
            files.forEach(async (file, indexo) => {
                if (fs.lstatSync(path.resolve(Directory, file)).isDirectory()) {
                    setTimeout(() => {
                        GenerateAutomaticFields(path.resolve(Directory, file), indexo, readingIndex);
                    }, 1500 * (index + indexo));
                } else {
                    if (getMimeTypefromString(path.extname(path.resolve(Directory, file)))) {
                        if (getMimeTypefromString(path.extname(path.resolve(Directory, file))) === 'video') {
                            var imageThumb = '';
                            thumbsupply.generateThumbnail(path.resolve(Directory, file), {
                                size: thumbsupply.ThumbSize.MEDIUM, // or ThumbSize.LARGE
                                forceCreate: true,
                                cacheDir: '~/myapp/cache',
                            })
                                .then(thumb => {
                                    // serve thumbnail
                                    imageThumb = path.resolve(window.rootPath, thumb);
                                    proceed();
                                })
                                .catch(err => {
                                    // thumbnail doesn't exist
                                    console.log(err);
                                    imageThumb = '../../assets/images/';
                                    proceed();
                                });

                            // eslint-disable-next-line no-inner-declarations
                            function proceed() {
                                // eslint-disable-next-line max-len
                                document.getElementsByClassName('videos')[0].innerHTML += '<button class=""><img class="Icon" src="' + imageThumb + '"></img><span class="subtext">' + file.substring(0, file.length - path.extname(path.resolve(Directory, file)).length) + '</span></button>';
                            
                            }
                        } else if (getMimeTypefromString(path.extname(path.resolve(Directory, file))) === 'audio') {
                            var imageSrc = '';
                            var titleSrc = '';
                            
                            var jsmediatags = window.require('jsmediatags');
                            jsmediatags.read(path.resolve(Directory, file), {
                                onSuccess: function(tag) {
                                    if (!tag) {return;}
                                    var image = tag.tags.picture;
                                    if (image) {
                                        var base64String = '';
                                        for (var i = 0; i < image.data.length; i++) {
                                            base64String += String.fromCharCode(image.data[i]);
                                        }
                                        var base64 = 'data:' + image.format + ';base64,' + window.btoa(base64String);
                                        imageSrc = base64;
                                        titleSrc = tag.tags.title;
                                        proceed();
                                    }
                                },
                                onError: function(error) {
                                    imageSrc = '../../assets/images/defaultMusicPicture.png';
                                    titleSrc = file.substring(0, file.length - path.extname(path.resolve(Directory, file)).length);
                                    proceed();
                                }
                            });

                            // eslint-disable-next-line no-inner-declarations
                            function proceed() {
                                // eslint-disable-next-line max-len
                                document.getElementsByClassName('musics')[0].innerHTML += '<button class=""><img class="Icon" src="' + imageSrc + '"></img><span class="subtext">' + titleSrc + '</span></button>';
                            }

                        }
                    }
                }
            });
        });
    }
};

function updateFoldersList() {
    resetFields();
    [...document.getElementsByClassName('AddedFolder')].forEach((element) => {
        element.outerHTML = '';
    });
    if (!localStorage.getItem('mediaFolders') || localStorage.getItem('mediaFolders') === '') {return;}
    var folders = localStorage.getItem('mediaFolders').split(',');
    var treadtedFolders = [];
    folders.forEach(Path => {treadtedFolders.push(Path.replace(/SData-SemilyCollomI/g, ','));});
    itemViewerButtonsFunctions = [];
    treadtedFolders.forEach((Folder, index) => {
        var icon = '../../assets/images/folderIcon.png';
        var item = {
            icon: icon,
            name: Folder.split('\\')[Folder.split('\\').length - 1],
            smallDesc: Folder,
            description: 'A folder than contains media files than you added to your media folders list',
            buttons: [
                {
                    name: 'deleteFolder',
                    text: 'Remove folder',
                    // eslint-disable-next-line max-len
                    onclick: 'var NewFolders = `' + folders.toString().replace(/\\/g, '\\\\') + '`.toString().split(`,`).filter((value,index) => index !== ' + index + ');localStorage.setItem(`mediaFolders`, NewFolders);updateFoldersList();dimissItemViewer(200);',
                    oncLickIndex: index,
                }
            ]
        };
        itemViewerButtonsFunctions.push(item);
        // eslint-disable-next-line max-len, quotes
        document.getElementsByClassName('folders')[0].innerHTML += '<button class="AddedFolder" onclick="createItemViewer(' + JSON.stringify(item).replace(/"/g, "'") + ')"><img class="Icon" src="' + icon + '"></img><span class="subtext">' + Folder + '</span></button>';

    });
    updateAutomaticGeneratedFields();
}

document.getElementsByClassName('contentBlocker')[0].onclick = dimissItemViewer;
function dimissItemViewer(e) {
    if (e === 'DimissButton' || (e && e.target && e.target.className && e.target.className === 'contentBlocker') || e === 200) {
        document.getElementsByClassName('contentBlocker')[0].style.opacity = 0;
        setTimeout(() => {
            document.getElementsByClassName('contentBlocker')[0].style.display = 'none';
        }, 500);
    }
}

function createItemViewer(item) {
    if (typeof(item) === 'string') {
        item = JSON.parse(item.replace(/'/g, '"'));
    }
    document.getElementsByClassName('itemViewerIcon')[0].src = item.icon;
    document.getElementsByClassName('itemViewerTitle')[0].innerText = item.name;
    document.getElementsByClassName('itemViewerSubTitle')[0].innerText = item.smallDesc;
    document.getElementsByClassName('itemViewerDescription')[0].innerText = item.description;
    document.getElementsByClassName('itemViewerButtonsArea')[0].innerHTML = '<button class="dimiss" onclick="dimissItemViewer(`DimissButton`);">Dimiss</button>';
    item.buttons.forEach((buttonInfo, indexo) => {
        // eslint-disable-next-line max-len
        document.getElementsByClassName('itemViewerButtonsArea')[0].innerHTML += '<button class="' + buttonInfo.name + '" onclick="' + itemViewerButtonsFunctions[buttonInfo.oncLickIndex].buttons[indexo].onclick + '">' + buttonInfo.text + '</button>';
    });
    document.getElementsByClassName('contentBlocker')[0].style.display = 'block';
    document.getElementsByClassName('contentBlocker')[0].style.opacity = 1;
}