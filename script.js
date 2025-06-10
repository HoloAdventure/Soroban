// ゲーム状態管理
class SorobanGame {
    constructor() {
        this.settings = {
            problems: 3,
            digits: 1,
            operations: 2,
            type: 'addition'
        };

        this.gameState = {
            currentProblem: 0,
            problems: [],
            startTime: null,
            endTime: null,
            abacusValue: 0,
            currentStep: 0
        };

        this.initializeEventListeners();
        this.updateSettingsDisplay();
    }

    initializeEventListeners() {
        // タイトル画面のボタン
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('customize-btn').addEventListener('click', () => this.showSettings());        // ゲーム画面のボタン
        document.getElementById('check-answer').addEventListener('click', () => this.checkAnswer());
        document.getElementById('next-problem').addEventListener('click', () => this.nextProblem());

        // 結果画面のボタン
        document.getElementById('play-again-btn').addEventListener('click', () => this.startGame());
        document.getElementById('back-to-title-btn').addEventListener('click', () => this.showTitleScreen());

        // 設定画面のボタン
        document.getElementById('default-btn').addEventListener('click', () => this.resetToDefault());
        document.getElementById('back-to-title-settings-btn').addEventListener('click', () => this.showTitleScreen());

        // 設定変更
        document.getElementById('problems-setting').addEventListener('change', (e) => {
            this.settings.problems = parseInt(e.target.value);
            this.updateSettingsDisplay();
        });

        document.getElementById('digits-setting').addEventListener('change', (e) => {
            this.settings.digits = parseInt(e.target.value);
            this.updateSettingsDisplay();
        });

        document.getElementById('operations-setting').addEventListener('change', (e) => {
            this.settings.operations = parseInt(e.target.value);
            this.updateSettingsDisplay();
        });

        // 計算式タイプ選択
        document.querySelectorAll('.operation-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.operation-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.settings.type = btn.dataset.operation;
                this.updateSettingsDisplay();
            });
        });

        // そろばんの珠クリック
        this.initializeAbacus();
    } initializeAbacus() {
        const beads = document.querySelectorAll('.bead');
        beads.forEach(bead => {
            // マウスクリックイベント
            bead.addEventListener('click', () => this.toggleBead(bead));

            // タッチイベント（マルチタッチ対応）
            bead.addEventListener('touchstart', (e) => {
                e.preventDefault(); // デフォルトのタッチ動作を防ぐ
                this.toggleBead(bead);
            });

            // タッチ移動中のイベント（珠をドラッグしても反応）
            bead.addEventListener('touchmove', (e) => {
                e.preventDefault();
                // タッチ位置の要素を取得
                const touch = e.touches[0];
                const element = document.elementFromPoint(touch.clientX, touch.clientY);
                if (element && element.classList.contains('bead') && element !== bead) {
                    this.toggleBead(element);
                }
            });
        });

        // マルチタッチ用の追加設定
        const abacus = document.getElementById('abacus');
        if (abacus) {
            // タッチイベントの設定
            abacus.style.touchAction = 'none'; // ブラウザのデフォルトタッチ動作を無効化

            // 複数タッチポイントでの同時操作
            abacus.addEventListener('touchstart', (e) => {
                // 複数のタッチポイントを処理
                Array.from(e.touches).forEach(touch => {
                    const element = document.elementFromPoint(touch.clientX, touch.clientY);
                    if (element && element.classList.contains('bead')) {
                        // 少し遅延を入れて同時タップを確実に処理
                        setTimeout(() => this.toggleBead(element), 10);
                    }
                });
            });
        }
    }

    toggleBead(bead) {
        const column = bead.closest('.abacus-column');
        const place = parseInt(column.dataset.place);
        const value = parseInt(bead.dataset.value);
        const isHeavenBead = bead.classList.contains('heaven-bead');

        if (isHeavenBead) {
            // 天珠（5の珠）の処理
            const heavenBead = column.querySelector('.heaven-bead');
            heavenBead.classList.toggle('active');
        } else {
            // 地珠（1の珠）の処理
            const earthBeads = column.querySelectorAll('.earth-bead');
            const activeEarthBeads = column.querySelectorAll('.earth-bead.active').length;

            if (bead.classList.contains('active')) {
                // 珠を非アクティブにする
                bead.classList.remove('active');
                // この珠より下の珠も非アクティブにする
                let foundBead = false;
                earthBeads.forEach(eb => {
                    if (eb === bead) foundBead = true;
                    if (foundBead) eb.classList.remove('active');
                });
            } else {
                // 珠をアクティブにする
                // この珠まで（含む）の珠をアクティブにする
                let beadIndex = Array.from(earthBeads).indexOf(bead);
                for (let i = 0; i <= beadIndex; i++) {
                    earthBeads[i].classList.add('active');
                }
            }
        } this.calculateAbacusValue();
    }

    calculateAbacusValue() {
        let total = 0;
        const columns = document.querySelectorAll('.abacus-column');

        columns.forEach(column => {
            const place = parseInt(column.dataset.place);
            const placeValue = Math.pow(10, place);

            // 天珠の値
            const heavenBead = column.querySelector('.heaven-bead.active');
            if (heavenBead) {
                total += 5 * placeValue;
            }

            // 地珠の値
            const activeEarthBeads = column.querySelectorAll('.earth-bead.active').length;
            total += activeEarthBeads * placeValue;
        });

        this.gameState.abacusValue = total;

        // 現在のステップを更新
        this.updateCurrentStep();

        // 問題表示を更新
        this.displayCurrentProblem();

        // 自動正解判定
        this.checkAutoAnswer();
    } checkAutoAnswer() {
        // ゲーム中でない場合は判定しない
        if (!this.gameState.startTime || !this.gameState.problems.length) {
            return;
        }

        const problem = this.gameState.problems[this.gameState.currentProblem];
        const feedback = document.getElementById('feedback');
        const checkButton = document.getElementById('check-answer');
        const nextButton = document.getElementById('next-problem');

        // 正解と一致した場合
        if (this.gameState.abacusValue === problem.answer) {
            // すでに正解判定済みの場合は処理しない
            if (checkButton.disabled) {
                return;
            }

            feedback.textContent = '正解！';
            feedback.className = 'feedback correct';

            // 答えを表示
            const equationElement = document.getElementById('current-equation');
            const currentText = equationElement.innerHTML;
            const answerText = currentText.replace('?', `<span class="correct">${problem.answer}</span>`);
            equationElement.innerHTML = answerText;

            // ボタンの表示を切り替え
            checkButton.style.display = 'none';
            nextButton.style.display = 'inline-block';

            // 自動進行タイマーを設定
            this.autoNextTimer = setTimeout(() => {
                this.nextProblem();
            }, 3000);
        }
    }

    generateProblems() {
        this.gameState.problems = [];

        for (let i = 0; i < this.settings.problems; i++) {
            const problem = this.generateSingleProblem();
            this.gameState.problems.push(problem);
        }
    } generateSingleProblem() {
        const maxNum = Math.pow(10, this.settings.digits) - 1;
        const minNum = Math.pow(10, this.settings.digits - 1);

        let problem = {
            steps: [],
            answer: 0
        };

        // 最初の数字
        const firstNum = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
        problem.steps.push({ operation: 'start', value: firstNum });
        problem.answer = firstNum;

        // 追加の計算
        for (let i = 0; i < this.settings.operations - 1; i++) {
            let num;
            let operation;

            if (this.settings.type === 'addition') {
                num = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
                operation = '+';
                problem.answer += num;
            } else if (this.settings.type === 'subtraction') {
                operation = '-';
                // 引き算の場合、現在の答えから引いても1以上になる数値を選択
                const maxSubtractable = problem.answer - 1;
                if (maxSubtractable >= 1) {
                    // 引ける範囲で数値を生成
                    const subtractMax = Math.min(maxSubtractable, maxNum);
                    const subtractMin = Math.min(minNum, subtractMax);
                    num = Math.floor(Math.random() * (subtractMax - subtractMin + 1)) + subtractMin;
                } else {
                    // 引くと1未満になってしまう場合は、足し算に変更
                    operation = '+';
                    num = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
                }

                if (operation === '-') {
                    problem.answer -= num;
                } else {
                    problem.answer += num;
                }
            } else {
                operation = Math.random() < 0.5 ? '+' : '-';
                if (operation === '+') {
                    num = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
                    problem.answer += num;
                } else {
                    // 混合の場合も引き算で1以上を保証
                    const maxSubtractable = problem.answer - 1;
                    if (maxSubtractable >= 1) {
                        const subtractMax = Math.min(maxSubtractable, maxNum);
                        const subtractMin = Math.min(minNum, subtractMax);
                        num = Math.floor(Math.random() * (subtractMax - subtractMin + 1)) + subtractMin;
                        problem.answer -= num;
                    } else {
                        // 引くと1未満になる場合は足し算に変更
                        operation = '+';
                        num = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
                        problem.answer += num;
                    }
                }
            }

            problem.steps.push({ operation, value: num });
        }

        return problem;
    } startGame() {
        this.generateProblems();
        this.gameState.currentProblem = 0;
        this.gameState.currentStep = 0;
        this.gameState.startTime = new Date();
        this.resetAbacus();
        this.resetFeedback();
        this.showGameScreen();
        this.displayCurrentProblem();
        this.startTimer();
    }

    displayCurrentProblem() {
        const problem = this.gameState.problems[this.gameState.currentProblem];
        let equationText = '';

        for (let i = 0; i < problem.steps.length; i++) {
            const step = problem.steps[i];
            if (i === 0) {
                equationText += step.value;
            } else {
                equationText += ` ${step.operation} ${step.value}`;
            }
        }

        equationText += ' = ?';        // 現在のステップをハイライト
        const steps = problem.steps;
        let highlightedText = '';

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const isCurrentStep = i === this.gameState.currentStep;
            const isCompletedStep = i < this.gameState.currentStep;

            if (i === 0) {
                if (isCurrentStep) {
                    highlightedText += `<span class="highlight">${step.value}</span>`;
                } else if (isCompletedStep) {
                    highlightedText += `<span class="completed">${step.value}</span>`;
                } else {
                    highlightedText += step.value;
                }
            } else {
                const operationClass = isCurrentStep ? 'highlight' : (isCompletedStep ? 'completed' : '');
                const valueClass = isCurrentStep ? 'highlight' : (isCompletedStep ? 'completed' : '');
                highlightedText += ` <span class="${operationClass}">${step.operation}</span> <span class="${valueClass}">${step.value}</span>`;
            }
        }

        highlightedText += ' = ?';

        document.getElementById('current-equation').innerHTML = highlightedText;
        document.getElementById('problem-counter').textContent = `${this.gameState.currentProblem + 1}問目`;
    } checkAnswer() {
        const problem = this.gameState.problems[this.gameState.currentProblem];
        const feedback = document.getElementById('feedback');
        const checkButton = document.getElementById('check-answer');
        const nextButton = document.getElementById('next-problem');

        if (this.gameState.abacusValue === problem.answer) {
            feedback.textContent = '正解！';
            feedback.className = 'feedback correct';

            // 答えを表示
            const equationElement = document.getElementById('current-equation');
            const currentText = equationElement.innerHTML;
            const answerText = currentText.replace('?', `<span class="correct">${problem.answer}</span>`);
            equationElement.innerHTML = answerText;

            // ボタンの表示を切り替え
            checkButton.style.display = 'none';
            nextButton.style.display = 'inline-block';

            this.autoNextTimer = setTimeout(() => {
                this.nextProblem();
            }, 3000);
        } else {
            feedback.textContent = `不正解。正しい答え: ${problem.answer}`;
            feedback.className = 'feedback incorrect';

            // ボタンの表示を切り替え
            checkButton.style.display = 'none';
            nextButton.style.display = 'inline-block';

            this.autoNextTimer = setTimeout(() => {
                this.nextProblem();
            }, 4000);
        }
    } nextProblem() {
        // 自動進行タイマーをクリア
        if (this.autoNextTimer) {
            clearTimeout(this.autoNextTimer);
            this.autoNextTimer = null;
        }

        this.gameState.currentProblem++;

        if (this.gameState.currentProblem >= this.settings.problems) {
            this.endGame();
        } else {
            this.gameState.currentStep = 0;
            this.resetAbacus();
            this.displayCurrentProblem();

            // フィードバックとボタンをリセット
            document.getElementById('feedback').textContent = '';
            document.getElementById('feedback').className = 'feedback';
            document.getElementById('check-answer').style.display = 'inline-block';
            document.getElementById('check-answer').disabled = false;
            document.getElementById('next-problem').style.display = 'none';
        }
    } endGame() {
        this.gameState.endTime = new Date();
        const totalTime = Math.floor((this.gameState.endTime - this.gameState.startTime) / 1000);
        const minutes = Math.floor(totalTime / 60);
        const seconds = totalTime % 60;

        document.getElementById('total-problems').textContent = this.settings.problems;
        document.getElementById('total-time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // 設定情報を結果画面に表示
        document.getElementById('result-problems').textContent = this.settings.problems;
        document.getElementById('result-digits').textContent = this.settings.digits;
        document.getElementById('result-operations').textContent = this.settings.operations;

        const typeText = {
            'addition': '足し算',
            'subtraction': '引き算',
            'mixed': '混合'
        };
        document.getElementById('result-type').textContent = typeText[this.settings.type];

        this.showResultScreen();
    } resetAbacus() {
        document.querySelectorAll('.bead').forEach(bead => {
            bead.classList.remove('active');
        });
        this.gameState.abacusValue = 0;
    } resetFeedback() {
        const feedback = document.getElementById('feedback');
        const checkButton = document.getElementById('check-answer');
        const nextButton = document.getElementById('next-problem');

        feedback.textContent = '';
        feedback.className = 'feedback';
        checkButton.style.display = 'inline-block';
        checkButton.disabled = false;
        nextButton.style.display = 'none';

        // 自動進行タイマーをクリア
        if (this.autoNextTimer) {
            clearTimeout(this.autoNextTimer);
            this.autoNextTimer = null;
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.gameState.startTime) {
                const elapsed = Math.floor((new Date() - this.gameState.startTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                document.getElementById('timer').textContent = `タイム ${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    showTitleScreen() {
        this.hideAllScreens();
        document.getElementById('title-screen').classList.add('active');
        this.stopTimer();
        this.updateSettingsDisplay();
    }

    showGameScreen() {
        this.hideAllScreens();
        document.getElementById('game-screen').classList.add('active');
    }

    showResultScreen() {
        this.hideAllScreens();
        document.getElementById('result-screen').classList.add('active');
        this.stopTimer();
    }

    showSettings() {
        this.hideAllScreens();
        document.getElementById('settings-screen').classList.add('active');
        this.loadSettingsToForm();
    }

    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
    }

    loadSettingsToForm() {
        document.getElementById('problems-setting').value = this.settings.problems;
        document.getElementById('digits-setting').value = this.settings.digits;
        document.getElementById('operations-setting').value = this.settings.operations;

        document.querySelectorAll('.operation-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.operation === this.settings.type) {
                btn.classList.add('active');
            }
        });
    }

    updateSettingsDisplay() {
        document.getElementById('display-problems').textContent = this.settings.problems;
        document.getElementById('display-digits').textContent = this.settings.digits;
        document.getElementById('display-operations').textContent = this.settings.operations;

        const typeText = {
            'addition': '足し算',
            'subtraction': '引き算',
            'mixed': '掛け算'
        };
        document.getElementById('display-type').textContent = typeText[this.settings.type];
    } resetToDefault() {
        this.settings = {
            problems: 3,
            digits: 1,
            operations: 2,
            type: 'addition'
        };
        this.loadSettingsToForm();
        this.updateSettingsDisplay();
    } updateCurrentStep() {
        // ゲーム中でない場合は処理しない
        if (!this.gameState.startTime || !this.gameState.problems.length) {
            return;
        }

        const problem = this.gameState.problems[this.gameState.currentProblem];
        const currentValue = this.gameState.abacusValue;

        // 各ステップまでの計算結果を求める
        let calculatedValue = 0;
        let currentStep = 0;

        for (let i = 0; i < problem.steps.length; i++) {
            const step = problem.steps[i];

            if (i === 0) {
                calculatedValue = step.value;
            } else {
                if (step.operation === '+') {
                    calculatedValue += step.value;
                } else if (step.operation === '-') {
                    calculatedValue -= step.value;
                    // 計算結果が負になることは問題生成時に防いでいるが、念のため
                    if (calculatedValue < 1) {
                        calculatedValue = 1;
                    }
                }
            }

            // そろばんの値と一致する場合、そのステップまで進んでいる
            if (currentValue === calculatedValue) {
                currentStep = i + 1; // 0ステップが正解している場合は次のステップに進む
                break;
            }
        }

        // 最終的な答えと一致する場合は、最後のステップとする
        if (currentValue === problem.answer) {
            currentStep = problem.steps.length;
        }

        // ステップ数は戻らないので現在のステップ数を超えた場合のみ更新する
        if (currentStep > this.gameState.currentStep) {
            this.gameState.currentStep = currentStep;
        }
    }
}

// 設定変更用の関数
function changeSetting(type, direction) {
    const input = document.getElementById(`${type}-setting`);
    const currentValue = parseInt(input.value);
    const min = parseInt(input.min);
    const max = parseInt(input.max);

    const newValue = currentValue + direction;
    if (newValue >= min && newValue <= max) {
        input.value = newValue;
        input.dispatchEvent(new Event('change'));
    }
}

// ゲーム初期化
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new SorobanGame();
});
