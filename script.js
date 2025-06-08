// ゲーム状態管理
class SorobanGame {
    constructor() {
        this.settings = {
            problems: 1,
            digits: 2,
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
        document.getElementById('customize-btn').addEventListener('click', () => this.showSettings());

        // ゲーム画面のボタン
        document.getElementById('check-answer').addEventListener('click', () => this.checkAnswer());

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
    }

    initializeAbacus() {
        const beads = document.querySelectorAll('.bead');
        beads.forEach(bead => {
            bead.addEventListener('click', () => this.toggleBead(bead));
        });
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
                // この珠より上の珠も非アクティブにする
                let foundBead = false;
                earthBeads.forEach(eb => {
                    if (eb === bead) foundBead = true;
                    if (foundBead) eb.classList.remove('active');
                });
            } else {
                // 珠をアクティブにする
                // この珠から下の珠まで（含む）をアクティブにする
                let beadIndex = Array.from(earthBeads).indexOf(bead);
                for (let i = beadIndex; i < earthBeads.length; i++) {
                    earthBeads[i].classList.add('active');
                }
            }
        }

        this.calculateAbacusValue();
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
    }

    generateProblems() {
        this.gameState.problems = [];

        for (let i = 0; i < this.settings.problems; i++) {
            const problem = this.generateSingleProblem();
            this.gameState.problems.push(problem);
        }
    }

    generateSingleProblem() {
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
            const num = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
            let operation;

            if (this.settings.type === 'addition') {
                operation = '+';
                problem.answer += num;
            } else if (this.settings.type === 'subtraction') {
                operation = '-';
                problem.answer -= num;
                if (problem.answer < 0) {
                    problem.answer = Math.abs(problem.answer);
                }
            } else {
                operation = Math.random() < 0.5 ? '+' : '-';
                if (operation === '+') {
                    problem.answer += num;
                } else {
                    problem.answer -= num;
                    if (problem.answer < 0) {
                        problem.answer = Math.abs(problem.answer);
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

        equationText += ' = ?';

        // 現在のステップをハイライト
        const steps = problem.steps;
        let highlightedText = '';

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const isHighlighted = i === this.gameState.currentStep;

            if (i === 0) {
                highlightedText += isHighlighted ?
                    `<span class="highlight">${step.value}</span>` :
                    step.value;
            } else {
                const operationClass = isHighlighted ? 'highlight' : '';
                const valueClass = isHighlighted ? 'highlight' : '';
                highlightedText += ` <span class="${operationClass}">${step.operation}</span> <span class="${valueClass}">${step.value}</span>`;
            }
        }

        highlightedText += ' = ?';

        document.getElementById('current-equation').innerHTML = highlightedText;
        document.getElementById('problem-counter').textContent = `${this.gameState.currentProblem + 1}問目`;
    }

    checkAnswer() {
        const problem = this.gameState.problems[this.gameState.currentProblem];
        const feedback = document.getElementById('feedback');

        if (this.gameState.abacusValue === problem.answer) {
            feedback.textContent = '正解！';
            feedback.className = 'feedback correct';

            // 答えを表示
            const equationElement = document.getElementById('current-equation');
            const currentText = equationElement.innerHTML;
            const answerText = currentText.replace('?', `<span class="correct">${problem.answer}</span>`);
            equationElement.innerHTML = answerText;

            setTimeout(() => {
                this.nextProblem();
            }, 2000);
        } else {
            feedback.textContent = `不正解。正しい答え: ${problem.answer}`;
            feedback.className = 'feedback incorrect';

            setTimeout(() => {
                this.nextProblem();
            }, 3000);
        }

        document.getElementById('check-answer').disabled = true;
    }

    nextProblem() {
        this.gameState.currentProblem++;

        if (this.gameState.currentProblem >= this.settings.problems) {
            this.endGame();
        } else {
            this.gameState.currentStep = 0;
            this.resetAbacus();
            this.displayCurrentProblem();
            document.getElementById('feedback').textContent = '';
            document.getElementById('feedback').className = 'feedback';
            document.getElementById('check-answer').disabled = false;
        }
    }

    endGame() {
        this.gameState.endTime = new Date();
        const totalTime = Math.floor((this.gameState.endTime - this.gameState.startTime) / 1000);
        const minutes = Math.floor(totalTime / 60);
        const seconds = totalTime % 60;

        document.getElementById('total-problems').textContent = this.settings.problems;
        document.getElementById('total-time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        this.showResultScreen();
    } resetAbacus() {
        document.querySelectorAll('.bead').forEach(bead => {
            bead.classList.remove('active');
        });
        this.gameState.abacusValue = 0;
    }

    resetFeedback() {
        const feedback = document.getElementById('feedback');
        feedback.textContent = '';
        feedback.className = 'feedback';
        document.getElementById('check-answer').disabled = false;
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
    }

    resetToDefault() {
        this.settings = {
            problems: 1,
            digits: 2,
            operations: 2,
            type: 'addition'
        };
        this.loadSettingsToForm();
        this.updateSettingsDisplay();
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
