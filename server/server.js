const WebSocket = require('ws');
const easymidi = require('easymidi');
const qrcode = require('qrcode-terminal');

// MIDIポートの設定
let output;

try {
    // 利用可能なMIDIポートを表示
    console.log('=== 利用可能なMIDIポート ===');
    const outputs = easymidi.getOutputs();

    if (outputs.length === 0) {
        console.log('既存のMIDIポートが見つかりません。仮想ポートを作成します。');
        output = new easymidi.Output('MIDI Piano Virtual Port', true);
        console.log('仮想MIDIポート "MIDI Piano Virtual Port" を作成しました。');
    } else {
        outputs.forEach((name, i) => {
            console.log(`${i}: ${name}`);
        });
        // 最初のポートを使用
        output = new easymidi.Output(outputs[0]);
        console.log(`\nMIDIポート "${outputs[0]}" を使用します。`);
    }
} catch (error) {
    console.log('MIDIポートの初期化に失敗しました。仮想ポートを作成します。');
    output = new easymidi.Output('MIDI Piano Virtual Port', true);
    console.log('仮想MIDIポート "MIDI Piano Virtual Port" を作成しました。');
}

// WebSocketサーバーの設定
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

console.log(`\n=== WebSocketサーバー起動 ===`);
console.log(`ポート: ${PORT}`);
console.log(`待機中...`);
console.log(`\nスマホアプリから接続してください。`);
console.log(`接続URL例: ws://<このPCのIPアドレス>:${PORT}`);

// 接続されているクライアント数
let clientCount = 0;

wss.on('connection', (ws, req) => {
    clientCount++;
    const clientIp = req.socket.remoteAddress;
    console.log(`\n[接続] クライアント接続: ${clientIp} (合計: ${clientCount}台)`);

    // 接続確認メッセージを送信
    ws.send(JSON.stringify({
        type: 'connected',
        message: 'MIDIサーバーに接続しました',
        timestamp: new Date().toISOString()
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // MIDIメッセージの処理
            if (data.type === 'noteOn') {
                const note = data.note;
                const velocity = data.velocity;

                // Note On メッセージを送信
                output.send('noteon', {
                    note: note,
                    velocity: velocity,
                    channel: 0
                });

                console.log(`[MIDI] Note ON  - Note: ${note}, Velocity: ${velocity}`);

            } else if (data.type === 'noteOff') {
                const note = data.note;

                // Note Off メッセージを送信
                output.send('noteoff', {
                    note: note,
                    velocity: 0,
                    channel: 0
                });

                console.log(`[MIDI] Note OFF - Note: ${note}`);
            }
        } catch (error) {
            console.error('メッセージ解析エラー:', error);
        }
    });

    ws.on('close', () => {
        clientCount--;
        console.log(`\n[切断] クライアント切断: ${clientIp} (残り: ${clientCount}台)`);
    });

    ws.on('error', (error) => {
        console.error('WebSocketエラー:', error);
    });
});

// サーバーエラーハンドリング
wss.on('error', (error) => {
    console.error('サーバーエラー:', error);
});

// 終了処理
process.on('SIGINT', () => {
    console.log('\n\nサーバーを終了します...');

    // すべてのノートオフを送信（念のため）
    for (let i = 0; i < 128; i++) {
        try {
            output.send('noteoff', { note: i, velocity: 0, channel: 0 });
        } catch (e) {
            // エラーを無視
        }
    }

    if (output && output.close) {
        output.close();
    }

    wss.close(() => {
        console.log('サーバーを停止しました。');
        process.exit(0);
    });
});// ローカルIPアドレスを表示
const os = require('os');
const networkInterfaces = os.networkInterfaces();
console.log('\n=== このPCのIPアドレス ===');

let primaryUrl = null;
for (const name in networkInterfaces) {
    for (const net of networkInterfaces[name]) {
        // IPv4のみ表示、内部アドレスをスキップ
        if (net.family === 'IPv4' && !net.internal) {
            const url = `ws://${net.address}:${PORT}`;
            console.log(`${name}: ${net.address}`);
            console.log(`  → 接続URL: ${url}`);
            if (!primaryUrl) primaryUrl = url;
        }
    }
}
console.log('========================\n');

// QRコード生成
if (primaryUrl) {
    console.log('スマホでスキャンしてください:');
    console.log('(WebSocket URL)\n');
    qrcode.generate(primaryUrl, { small: true });
    console.log(`\nURL: ${primaryUrl}\n`);
} else {
    console.log('警告: ネットワークインターフェースが見つかりませんでした。');
    console.log('localhost接続のみ可能です: ws://localhost:' + PORT + '\n');
}
