const socket = io('https://black-hotel-ybzh.onrender.com');

const loginScreen = document.getElementById('loginScreen');
const matchScreen = document.getElementById('matchScreen');
const matchStatus = document.getElementById('matchStatus');
const opponentName = document.getElementById('opponentName');
const questionsContainer = document.getElementById('questionsContainer');
const resultContainer = document.getElementById('resultContainer');
const errorMessage = document.getElementById('errorMessage');
const diamondsCount = document.getElementById('diamondsCount');
const backBtn = document.getElementById('backBtn');

let currentQuestions = [];
let currentQuestionIndex = 0;
let playerName = '';
let playerId = '';

document.getElementById('findMatchBtn').addEventListener('click', () => {
    playerName = document.getElementById('playerName').value.trim() || 'لاعب';
    playerId = document.getElementById('playerId').value.trim() || `user_${Date.now()}`;

    loginScreen.style.display = 'none';
    matchScreen.style.display = 'block';
    backBtn.style.display = 'none';
    matchStatus.textContent = '⏳ جاري البحث عن خصم... (4 ثوانٍ)';
    opponentName.textContent = '';
    questionsContainer.innerHTML = '';
    resultContainer.innerHTML = '';
    errorMessage.textContent = '';

    socket.emit('find-match', {
        playerId: playerId,
        username: playerName
    });
});

socket.on('match-found', (data) => {
    matchStatus.textContent = '⚔️ المباراة بدأت!';
    opponentName.textContent = `👤 الخصم: ${data.opponentName || 'غير معروف'}`;
    currentQuestions = data.questions;
    currentQuestionIndex = 0;
    showQuestion();
});

function showQuestion() {
    if (currentQuestionIndex >= currentQuestions.length) {
        matchStatus.textContent = '🏁 انتهت المباراة!';
        questionsContainer.innerHTML = '';
        resultContainer.innerHTML = '<div class="win">🎉 مباراة جيدة! (ستضاف المكافآت لاحقاً)</div>';
        backBtn.style.display = 'block';
        return;
    }

    const q = currentQuestions[currentQuestionIndex];
    let html = `
        <div class="question-box">
            <h3>📝 السؤال ${currentQuestionIndex + 1} من ${currentQuestions.length}</h3>
            <div class="question-text">${q.question}</div>
    `;

    q.options.forEach((option, index) => {
        html += `<button class="option-btn" onclick="submitAnswer(${index})" id="opt_${index}">${option}</button>`;
    });

    html += '</div>';
    questionsContainer.innerHTML = html;
    matchStatus.textContent = `⏱️ السؤال ${currentQuestionIndex + 1}`;
}

window.submitAnswer = function(answerIndex) {
    document.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);
    socket.emit('submit-answer', {
        questionIndex: currentQuestionIndex,
        answer: answerIndex
    });
};

socket.on('answer-result', (data) => {
    const buttons = document.querySelectorAll('.option-btn');
    
    buttons.forEach((btn, index) => {
        if (index === data.correctAnswer) {
            btn.classList.add('correct');
        }
    });

    if (data.correct) {
        matchStatus.textContent = '✅ إجابة صحيحة! +10 نقاط';
    } else {
        matchStatus.textContent = '❌ إجابة خاطئة!';
    }

    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuestions.length) {
            showQuestion();
        } else {
            matchStatus.textContent = '🏁 انتهت المباراة!';
            questionsContainer.innerHTML = '';
            resultContainer.innerHTML = '<div class="win">🎉 مباراة جيدة! (ستضاف المكافآت لاحقاً)</div>';
            backBtn.style.display = 'block';
        }
    }, 1500);
});

socket.on('match-error', (msg) => {
    errorMessage.textContent = '❌ ' + msg;
    matchScreen.style.display = 'none';
    loginScreen.style.display = 'block';
    backBtn.style.display = 'none';
});

backBtn.addEventListener('click', () => {
    matchScreen.style.display = 'none';
    loginScreen.style.display = 'block';
    backBtn.style.display = 'none';
    resultContainer.innerHTML = '';
});