// MIDI Piano App - Client Side
class MIDIPiano {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.octave = 4;
        this.velocity = 80;
        this.activeNotes = new Set();
        this.touchMap = new Map(); // タッチIDと音符のマッピング

        this.initElements();
        this.createKeyboard();
        this.attachEventListeners();
        this.updateOctaveDisplay();
    }

    initElements() {
        this.serverUrlInput = document.getElementById('serverUrl');
        this.connectBtn = document.getElementById('connectBtn');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.octaveValue = document.getElementById('octaveValue');
        this.velocitySlider = document.getElementById('velocity');
        this.velocityValue = document.getElementById('velocityValue');
        this.keyboard = document.getElementById('keyboard');
    }

    createKeyboard() {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const blackKeyPositions = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#の位置

        let whiteKeyIndex = 0;

        for (let i = 0; i < 12; i++) {
            const note = notes[i];
            const isBlack = note.includes('#');
            const key = document.createElement('div');
            key.className = `key ${isBlack ? 'black' : 'white'}`;
            key.dataset.note = i;
            key.dataset.noteName = note;

            const label = document.createElement('span');
            label.className = 'key-label';
            label.textContent = note;
            key.appendChild(label);

            if (isBlack) {
                // 黒鍵の位置調整
                const offset = whiteKeyIndex * 50 - 15;
                key.style.left = `${offset}px`;
            } else {
                whiteKeyIndex++;
            }

            this.keyboard.appendChild(key);
        }
    }

    attachEventListeners() {
        // 接続ボタン
        this.connectBtn.addEventListener('click', () => this.toggleConnection());

        // オクターブコントロール
        document.getElementById('octaveUp').addEventListener('click', () => {
            if (this.octave < 8) {
                this.octave++;
                this.updateOctaveDisplay();
            }
        });

        document.getElementById('octaveDown').addEventListener('click', () => {
            if (this.octave > 0) {
                this.octave--;
                this.updateOctaveDisplay();
            }
        });

        // ベロシティコントロール
        this.velocitySlider.addEventListener('input', (e) => {
            this.velocity = parseInt(e.target.value);
            this.velocityValue.textContent = this.velocity;
        });

        // ピアノキーのイベント
        const keys = document.querySelectorAll('.key');
        keys.forEach(key => {
            // タッチイベント（スマホ用）
            key.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touches = e.changedTouches;
                for (let touch of touches) {
                    const note = parseInt(key.dataset.note);
                    this.noteOn(note, touch.identifier, key);
                }
            }, { passive: false });

            key.addEventListener('touchend', (e) => {
                e.preventDefault();
                const touches = e.changedTouches;
                for (let touch of touches) {
                    this.noteOffByTouch(touch.identifier, key);
                }
            }, { passive: false });

            key.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                const touches = e.changedTouches;
                for (let touch of touches) {
                    this.noteOffByTouch(touch.identifier, key);
                }
            }, { passive: false });

            // マウスイベント（PC用）
            key.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const note = parseInt(key.dataset.note);
                this.noteOn(note, 'mouse', key);
            });

            key.addEventListener('mouseup', (e) => {
                e.preventDefault();
                this.noteOffByTouch('mouse', key);
            });

            key.addEventListener('mouseleave', (e) => {
                this.noteOffByTouch('mouse', key);
            });
        });

        // Enterキーで接続
        this.serverUrlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.toggleConnection();
            }
        });
    }

    toggleConnection() {
        if (this.isConnected) {
            this.disconnect();
        } else {
            this.connect();
        }
    }

    connect() {
        const url = this.serverUrlInput.value.trim();
        if (!url) {
            alert('サーバーURLを入力してください');
            return;
        }

        try {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                this.isConnected = true;
                this.updateConnectionStatus(true);
                console.log('WebSocket接続完了');
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                this.updateConnectionStatus(false);
                console.log('WebSocket接続終了');
            };

            this.ws.onerror = (error) => {
                console.error('WebSocketエラー:', error);
                alert('接続エラーが発生しました');
                this.isConnected = false;
                this.updateConnectionStatus(false);
            };

            this.ws.onmessage = (event) => {
                console.log('サーバーからのメッセージ:', event.data);
            };

        } catch (error) {
            console.error('接続エラー:', error);
            alert('接続に失敗しました');
        }
    }

    disconnect() {
        if (this.ws) {
            // すべてのノートオフを送信
            this.activeNotes.forEach(midiNote => {
                this.sendMIDI({ type: 'noteOff', note: midiNote, velocity: 0 });
            });
            this.activeNotes.clear();
            this.touchMap.clear();

            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.updateConnectionStatus(false);
    }

    updateConnectionStatus(connected) {
        if (connected) {
            this.statusIndicator.classList.add('connected');
            this.statusText.textContent = '接続中';
            this.connectBtn.textContent = '切断';
            this.connectBtn.style.background = '#dc3545';
        } else {
            this.statusIndicator.classList.remove('connected');
            this.statusText.textContent = '未接続';
            this.connectBtn.textContent = '接続';
            this.connectBtn.style.background = '#667eea';
        }
    }

    updateOctaveDisplay() {
        this.octaveValue.textContent = this.octave;
        document.getElementById('rangeStart').textContent = this.octave;
        document.getElementById('rangeEnd').textContent = this.octave;
    }

    noteOn(note, touchId, keyElement) {
        const midiNote = this.octave * 12 + note + 12; // MIDI note number

        // 同じタッチIDで既に音が鳴っている場合は何もしない
        if (this.touchMap.has(touchId)) {
            return;
        }

        this.touchMap.set(touchId, midiNote);
        this.activeNotes.add(midiNote);
        keyElement.classList.add('active');

        this.sendMIDI({
            type: 'noteOn',
            note: midiNote,
            velocity: this.velocity
        });

        console.log(`Note ON: ${midiNote} (${keyElement.dataset.noteName}${this.octave})`);
    }

    noteOffByTouch(touchId, keyElement) {
        const midiNote = this.touchMap.get(touchId);

        if (midiNote !== undefined) {
            this.activeNotes.delete(midiNote);
            this.touchMap.delete(touchId);
            keyElement.classList.remove('active');

            this.sendMIDI({
                type: 'noteOff',
                note: midiNote,
                velocity: 0
            });

            console.log(`Note OFF: ${midiNote}`);
        }
    }

    sendMIDI(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn('WebSocketが接続されていません');
        }
    }
}

// アプリ起動
document.addEventListener('DOMContentLoaded', () => {
    new MIDIPiano();
});
