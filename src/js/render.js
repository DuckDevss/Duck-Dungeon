// Packages
const { DownloaderHelper } = require('node-downloader-helper');
const decompress = require('decompress');
const { shell } = require('electron');
const fetch = require('axios');
const path = require('path');
const util = require('util');
const fs = require('fs');

const exec = util.promisify(require('child_process').exec);

async function isRunning(query) {
    let platform = process.platform;
    let cmd = '';

    switch (platform) {
        case 'win32':
            cmd = `tasklist`;
            break;
        case 'darwin':
            cmd = `ps -ax | grep ${query}`;
            break;
        case 'linux':
            cmd = `ps -A`;
            break;
        default:
            break;
    }

    try {
        const { stdout } = await exec(cmd);
        return stdout.toLowerCase().indexOf(query.toLowerCase()) > -1;
    } catch (error) {
        console.error(error);
        return false;
    }
}

async function run() {
    const url = "https://duckdevss.github.io/Duck-Dungeon";

    async function home() {
        const version = (await fetch(`${url}/launcher/duckdungeon.json`)).data;

        document.getElementById("version").innerHTML = version.launcher.version;
        document.getElementById("patchnotes").innerHTML = version.game.patch_notes;

        document.getElementById('play').addEventListener('click', () => openGame());
        document.getElementById('remove').addEventListener('click', () => deleteGame());
        document.getElementById('update-launcher').addEventListener('click', () => shell.openExternal(version.launcher.link));
    }

    async function updateLauncher() {
        const version = (await fetch(`${url}/launcher/duckdungeon.json`)).data;

        const launcherPath = `${__dirname}/game/launcher.json`;

        if (!fs.existsSync(launcherPath)) {
            try {
                const download = new DownloaderHelper(version.launcher.locallink, `${__dirname}/game`);

                download.start();
            } catch (error) {
                console.error(error);
            }
        } else {
            try {
                const file = JSON.parse(await fs.promises.readFile(launcherPath));

                if (file.ver !== version.launcher.version) runModel();
            } catch (error) {
                console.error(error);
            }
        }
    }

    async function openGame() {
        try {
            if (!fs.existsSync(`${__dirname}/game/version.json`)) {
                const version = (await fetch(`${url}/launcher/duckdungeon.json`)).data;

                const download = new DownloaderHelper(`${version.game.locallink}`, `${__dirname}/game`);
                download.start();
            }

            if (fs.existsSync(`${__dirname}/game/Duck.Dungeon.Latest.zip`)) {
                const version = (await fetch(`${url}/launcher/duckdungeon.json`)).data;
                const file = JSON.parse(fs.promises.readFile(`${__dirname}/game/version.json`));

                if (file.ver === version.game.version) return shell.openPath(path.join(__dirname, 'game', 'Duck Dungeon', 'Duck Dungeon.exe'));
                else {
                    document.getElementById("play").innerHTML = "Updating";

                    const status = await isRunning('Duck Dungeon.exe');
                    if (status === true) return document.getElementById("play").innerHTML = "Game is running";

                    await fs.promises.unlink(`${__dirname}/game/version.json`);
                    await fs.promises.unlink(`${__dirname}/game/Duck.Dungeon.Latest.zip`);
                    await fs.promises.rmdir(`${__dirname}/game/Duck Dungeon`, { recursive: true, force: true });

                    const downloadVersion = new DownloaderHelper(`${version.game.locallink}`, `${__dirname}/game`);
                    downloadVersion.start();

                    await new Promise((resolve) => downloadVersion.on('end', resolve));

                    document.getElementById("play").innerHTML = "Downloading";

                    const downloadGame = new DownloaderHelper(`${version.game.link}`, `${__dirname}/game`);
                    downloadGame.start();

                    await new Promise((resolve) => downloadGame.on('end', resolve));

                    document.getElementById("play").innerHTML = "Extracting";

                    await decompress(`${__dirname}/game/Duck.Dungeon.Latest.zip`, `${__dirname}/game`);

                    document.getElementById("play").innerHTML = "Running";

                    shell.openPath(path.join(__dirname, 'game', 'Duck Dungeon', 'Duck Dungeon.exe'));

                    document.getElementById("play").innerHTML = "Play";
                }
            } else {
                const version = (await fetch(`${url}/launcher/duckdungeon.json`)).data;

                console.log(version);

                document.getElementById("play").innerHTML = "Downloading";

                const download = new DownloaderHelper(`${version.game.link}`, `${__dirname}/game`);
                download.start();

                await new Promise((resolve) => download.on('end', resolve));

                document.getElementById("play").innerHTML = "Extracting";

                await decompress(`${__dirname}/game/Duck.Dungeon.Latest.zip`, `${__dirname}/game`);

                document.getElementById("play").innerHTML = "Running";

                shell.openPath(path.join(__dirname, 'game', 'Duck Dungeon', 'Duck Dungeon.exe'));

                document.getElementById("play").innerHTML = "Play";
            }
        } catch (error) {
            console.error(error);
        }
    }

    async function deleteGame() {
        const button = document.getElementById("remove");

        const isGameRunning = await isRunning('Duck Dungeon.exe');
        if (isGameRunning) return button.innerHTML = "Game is running";

        try {
            if (fs.existsSync(`${__dirname}/game/Duck.Dungeon.Latest.zip`)) {
                button.innerHTML = "Deleting";
                await fs.promises.unlink(`${__dirname}/game/version.json`);
                await fs.promises.unlink(`${__dirname}/game/Duck.Dungeon.Latest.zip`);
                await fs.promises.rmdir(`${__dirname}/game/Duck Dungeon`, { recursive: true });
            }
        } catch (error) {
            console.log(error);
        }

        button.innerHTML = "Remove";
    }

    home();
    updateLauncher();
}

run();