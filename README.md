# MIDI Piano - WiFi MIDI Controller

スマホをピアノにして、WiFi 経由で PC に MIDI データをリアルタイム送信するアプリケーションです。

## 機能

-   📱 スマホでピアノ演奏
-   🎹 12 音階（1 オクターブ）のキーボード
-   🎚️ オクターブ調整（0-8）
-   🔊 ベロシティ調整（1-127）
-   📡 WiFi 経由での MIDI データ送信
-   🖥️ PC 側で MIDI デバイスとして認識

## 必要な環境

### スマホ側（クライアント）

-   モダンブラウザ（Chrome、Safari、Firefox など）
-   WiFi 接続

### PC 側（サーバー）

-   Node.js（v14 以降推奨）
-   npm
-   WiFi 接続（スマホと同じネットワーク）

## セットアップ

### 1. PC 側のセットアップ

```cmd
cd server
npm install
```

### 2. サーバーの起動

```cmd
npm start
```

サーバーが起動すると、以下の情報が表示されます：

-   利用可能な MIDI ポート
-   WebSocket サーバーのポート番号（デフォルト: 8080）
-   PC の IP アドレスと接続 URL

### 3. スマホ側の接続

1. スマホのブラウザで `index.html` を開く

    - ローカルサーバーを使用する場合：`http://localhost:8000/index.html`
    - ファイルから直接開く場合：ブラウザでファイルを開く

2. 表示されたサーバー URL を入力

    - 例: `ws://192.168.1.100:8080`
    - PC のコンソールに表示された接続 URL を使用

3. 「接続」ボタンをクリック

4. 接続成功後、ピアノキーをタップして演奏

## 使い方

### オクターブの変更

-   `+` / `-` ボタンでオクターブを調整（0-8）
-   現在のオクターブが表示されます

### ベロシティの調整

-   スライダーでベロシティ（音の強さ）を調整（1-127）
-   80 がデフォルト値

### 演奏

-   白鍵・黒鍵をタップして演奏
-   マルチタッチ対応（複数の音を同時に鳴らせます）

## MIDI デバイスの利用

PC の DAW（Digital Audio Workstation）や音楽ソフトで受信した MIDI データを使用できます。

### 対応ソフト例：

-   Ableton Live
-   FL Studio
-   Logic Pro
-   GarageBand
-   Reaper
-   その他 MIDI 入力対応ソフト

### 設定方法：

1. サーバーを起動
2. DAW の MIDI 入力設定で「MIDI Piano Virtual Port」または使用中のポートを選択
3. スマホから演奏すると、DAW 側で MIDI 入力として認識されます

## トラブルシューティング

### 接続できない場合

-   PC とスマホが同じ WiFi ネットワークに接続されているか確認
-   ファイアウォール設定を確認（ポート 8080 を開放）
-   サーバーが正しく起動しているか確認

### 音が出ない場合

-   サーバーのコンソールで MIDI メッセージが受信されているか確認
-   DAW や MIDI ソフトで正しい MIDI ポートが選択されているか確認
-   仮想 MIDI ポートが作成されているか確認

### レイテンシが気になる場合

-   WiFi の電波状況を改善
-   5GHz 帯の WiFi を使用
-   PC とスマホを近づける

## ファイル構成

```
MIDIPIano/
├── index.html          # スマホ側のUIページ
├── style.css          # スタイルシート
├── app.js            # クライアント側のJavaScript
├── server/
│   ├── package.json   # Node.jsの依存関係
│   └── server.js      # WebSocket + MIDIサーバー
└── README.md         # このファイル
```

## 技術仕様

-   **通信プロトコル**: WebSocket
-   **MIDI メッセージ**:
    -   Note On: 0x90 (チャンネル 1)
    -   Note Off: 0x80 (チャンネル 1)
-   **音域**: C0 - G10（オクターブ調整により）
-   **ベロシティ範囲**: 1-127

## ライセンス

MIT License

## 開発者向け情報

### カスタマイズ

#### ポート番号の変更

`server/server.js` の以下の行を変更：

```javascript
const PORT = process.env.PORT || 8080;
```

環境変数でも設定可能：

```cmd
set PORT=9000
npm start
```

#### 鍵盤数の増加

`app.js` の `createKeyboard()` メソッドで鍵盤数を調整可能

#### MIDI チャンネルの変更

`server.js` の MIDI メッセージ部分を変更：

```javascript
// チャンネル2の場合: 0x91, 0x81
output.sendMessage([0x91, note, velocity]);
```

## 今後の拡張案

-   [ ] 複数オクターブの同時表示
-   [ ] サスティンペダル機能
-   [ ] MIDI CC（コントロールチェンジ）対応
-   [ ] プリセット音色の追加
-   [ ] レコーディング機能
-   [ ] Bluetooth MIDI 対応

## お問い合わせ

問題が発生した場合は、GitHub の Issue でご報告ください。
