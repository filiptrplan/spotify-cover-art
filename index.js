#!/usr/bin/env node

const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");
const waitPort = require("wait-port");
const exec = require('child_process').exec;
var path = require('path');
var appDir = path.dirname(require.main.filename);

const options = {
    hostname: "localhost",
    port: 3131,
    path: "/json",
    method: "GET"
};

const args = process.argv.slice(2);

wait();

if (typeof (args[0]) != "undefined" && fs.existsSync(args[0])) {
    let spotify = exec(`${args[0]} --remote-debugging-port=3131`);
    spotify.unref();
}

function wait() {
    waitPort({ host: "localhost", port: 3131 }).then((open) => {
        if (open) {
            attach();
            console.log("Detected Spotify! Attempting to send payload...");
        }
    });
}


function attach() {
    http.get('http://localhost:3131/json', res => {
        let data = [];

        res.on('data', chunk => {
            data.push(chunk);
        });

        res.on('end', () => {
            const json = JSON.parse(data.toString());
            if (typeof (json[0]) == "undefined") {
                attach();
                return;
            }
            sendJS(json[0]);
        });
    }).on('error', err => {
        console.log('Error: ', err.message);
    });
}



function sendJS(window) {
    const ws = new WebSocket(window.webSocketDebuggerUrl);
    const payload = {
        "id": 1337,
        "method": "Runtime.evaluate",
        "params": {
            "expression": fs.readFileSync(path.join(appDir, "payload.js")).toString(),
            "silent": true,
        }
    };
    const checkDom = {
        "id": 8000,
        "method": "DOM.getDocument",
    };
    ws.on("open", () => {
        ws.send(JSON.stringify(checkDom));
        console.log("Checking for DOM load...");
    });
    ws.on("message", (data) => {
        const json = JSON.parse(data);
        if (json.id == 8000) {
            if (json.result.root.childNodeCount > 1) {
                ws.send(JSON.stringify(payload));
                ws.close();
                console.log("Payload sent! Exiting.");
                // Exiting immediately interrupts the dom loading
                setTimeout(() => {
                    process.exit(0);
                }, 1000);
            } else {
                setTimeout(() => {
                    ws.send(JSON.stringify(checkDom));
                    console.log("Checking for DOM load...");
                }, 500);
            }
        }
    });
}