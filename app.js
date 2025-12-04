// MIDI Piano App - Client Side
class MIDIPiano {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.octave = 4;
        this.velocity = 80;
        this.activeNotes = new Set();
        this.touchMap = new Map(); // タッチIDと音符のマッピング

        // Web MIDI API
        this.midiAccess = null;
        this.midiOutput = null;
        this.midiOutputMode = false; // true: local MIDI, false: WebSocket

        this.initElements();
        this.createKeyboard();
        this.attachEventListeners();
        this.updateOctaveDisplay();
        this.initWebMIDI();
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

        // MIDI output elements
        this.midiOutputSelect = document.getElementById('midiOutputSelect');
        this.midiOutputBtn = document.getElementById('midiOutputBtn');
        this.midiStatusIndicator = document.getElementById('midiStatusIndicator');
        this.midiStatusText = document.getElementById('midiStatusText');
    }

    async initWebMIDI() {
        if (!navigator.requestMIDIAccess) {
            console.log('Web MIDI APIはこのブラウザでサポートされていません');
            if (this.midiStatusText) {
                this.midiStatusText.textContent = 'Web MIDI非対応';
            }
            if (this.midiOutputSelect) {
                this.midiOutputSelect.disabled = true;
            }
            if (this.midiOutputBtn) {
                this.midiOutputBtn.disabled = true;
            }
            return;
        }

        try {
            this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
            console.log('Web MIDI API初期化完了');
            this.updateMIDIOutputList();

            // MIDI接続状態の変化を監視
            this.midiAccess.onstatechange = () => {
                this.updateMIDIOutputList();
            };
        } catch (error) {
            console.error('Web MIDI API初期化エラー:', error);
            if (this.midiStatusText) {
                this.midiStatusText.textContent = 'MIDI初期化エラー';
            }
        }
    }

    updateMIDIOutputList() {
        if (!this.midiOutputSelect || !this.midiAccess) return;

        const outputs = Array.from(this.midiAccess.outputs.values());
        this.midiOutputSelect.innerHTML = '<option value="">-- MIDIデバイスを選択 --</option>';

        outputs.forEach((output, index) => {
            const option = document.createElement('option');
            option.value = output.id;
            option.textContent = output.name || `MIDI Output ${index + 1}`;
            this.midiOutputSelect.appendChild(option);
        });

        if (outputs.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'MIDIデバイスが見つかりません';
            option.disabled = true;
            this.midiOutputSelect.appendChild(option);
        }
    }

    toggleMIDIOutput() {
        if (this.midiOutputMode) {
            this.disconnectMIDIOutput();
        } else {
            this.connectMIDIOutput();
        }
    }

    connectMIDIOutput() {
        if (!this.midiAccess || !this.midiOutputSelect) return;

        const selectedId = this.midiOutputSelect.value;
        if (!selectedId) {
            alert('MIDIデバイスを選択してください');
            return;
        }

        this.midiOutput = this.midiAccess.outputs.get(selectedId);
        if (this.midiOutput) {
            this.midiOutputMode = true;
            this.updateMIDIOutputStatus(true);
            console.log('MIDI出力デバイス接続:', this.midiOutput.name);
        } else {
            alert('MIDIデバイスの接続に失敗しました');
        }
    }

    disconnectMIDIOutput() {
        // すべてのノートオフを送信
        if (this.midiOutput) {
            this.activeNotes.forEach(midiNote => {
                this.sendLocalMIDI('noteOff', midiNote, 0);
            });
        }
        this.midiOutput = null;
        this.midiOutputMode = false;
        this.updateMIDIOutputStatus(false);
        console.log('MIDI出力デバイス切断');
    }

    updateMIDIOutputStatus(connected) {
        if (this.midiStatusIndicator) {
            if (connected) {
                this.midiStatusIndicator.classList.add('connected');
            } else {
                this.midiStatusIndicator.classList.remove('connected');
            }
        }
        if (this.midiStatusText) {
            this.midiStatusText.textContent = connected ? 'MIDI接続中' : 'MIDI未接続';
        }
        if (this.midiOutputBtn) {
            this.midiOutputBtn.textContent = connected ? 'MIDI切断' : 'MIDI接続';
            this.midiOutputBtn.style.background = connected ? '#dc3545' : '#28a745';
        }
        if (this.midiOutputSelect) {
            this.midiOutputSelect.disabled = connected;
        }
    }

    sendLocalMIDI(type, note, velocity) {
        if (!this.midiOutput) return;

        const channel = 0; // MIDI channel 1 (0-indexed)
        if (type === 'noteOn') {
            // Note On: 0x90 + channel
            this.midiOutput.send([0x90 + channel, note, velocity]);
        } else if (type === 'noteOff') {
            // Note Off: 0x80 + channel
            this.midiOutput.send([0x80 + channel, note, 0]);
        }
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

        // MIDI出力ボタン
        if (this.midiOutputBtn) {
            this.midiOutputBtn.addEventListener('click', () => this.toggleMIDIOutput());
        }

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
        // WebSocket経由で送信
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }

        // ローカルMIDI出力に送信
        if (this.midiOutputMode && this.midiOutput) {
            this.sendLocalMIDI(data.type, data.note, data.velocity);
        }

        // どちらも接続されていない場合は警告
        if ((!this.ws || this.ws.readyState !== WebSocket.OPEN) && !this.midiOutputMode) {
            console.warn('WebSocketもMIDI出力も接続されていません');
        }
    }
}

// アプリ起動
document.addEventListener('DOMContentLoaded', () => {
    new MIDIPiano();
});
