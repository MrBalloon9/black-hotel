require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

// ===== إعداد Supabase =====
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// ===== إعداد الخادم =====
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// ===== جلب الأسئلة من Supabase =====
async function fetchQuestions() {
    try {
        const { data, error } = await supabase
            .from('questions')
            .select('question, option1, option2, option3, option4, correct_answer')
            .order('id', { ascending: true })
            .limit(10);

        if (error) {
            console.error('خطأ في جلب الأسئلة:', error);
            return getFallbackQuestions();
        }

        if (!data || data.length === 0) {
            return getFallbackQuestions();
        }

        return data.map(q => ({
            question: q.question,
            options: [q.option1, q.option2, q.option3, q.option4],
            correct: q.correct_answer - 1
        }));
    } catch (e) {
        console.error('خطأ:', e);
        return getFallbackQuestions();
    }
}

// ===== أسئلة احتياطية (في حال فشل الاتصال) =====
function getFallbackQuestions() {
    return [
        {
            question: "ما هو أكبر محيط في العالم؟",
            options: ["الأطلسي", "الهادئ", "الهندي", "المتجمد"],
            correct: 1
        },
        {
            question: "من هو مؤسس الدولة العثمانية؟",
            options: ["أورخان", "عثمان الأول", "مراد", "بايزيد"],
            correct: 1
        },
        {
            question: "كم عدد أركان الإسلام؟",
            options: ["3", "4", "5", "6"],
            correct: 2
        },
        {
            question: "ما هي عاصمة فرنسا؟",
            options: ["لندن", "باريس", "برلين", "مدريد"],
            correct: 1
        },
        {
            question: "كم عدد الكواكب في المجموعة الشمسية؟",
            options: ["7", "8", "9", "10"],
            correct: 1
        }
    ];
}

// ===== قائمة الانتظار =====
const waitingPlayers = [];

// ===== اتصال Socket.io =====
io.on('connection', (socket) => {
    console.log('🟢 لاعب جديد:', socket.id);

socket.on('find-match', async (data) => {
    const { playerId, username } = data;
    console.log(`🔍 ${username} يبحث عن خصم...`);

    // جلب الأسئلة من Supabase
    const questions = await fetchQuestions();

    // إضافة للانتظار
    waitingPlayers.push({
        socketId: socket.id,
        playerId: playerId,
        username: username,
        questions: questions // حفظ الأسئلة مع اللاعب
    });

    // محاولة إيجاد خصم (4 ثوانٍ)
    setTimeout(() => {
        const index = waitingPlayers.findIndex(p => p.socketId === socket.id);
        if (index === -1) return;

        if (waitingPlayers.length >= 2) {
            const opponent = waitingPlayers.find(p => p.socketId !== socket.id);
            if (opponent) {
                waitingPlayers.splice(index, 1);
                const opponentIndex = waitingPlayers.indexOf(opponent);
                waitingPlayers.splice(opponentIndex, 1);
                startMatch(socket.id, opponent.socketId, questions);
                return;
            }
        }

        waitingPlayers.splice(index, 1);
        socket.emit('match-found', {
            type: 'bot',
            questions: questions,
            opponentName: 'الروبوت 🤖'
        });
    }, 4000);
});

    socket.on('submit-answer', (data) => {
        const { questionIndex, answer } = data;
        // ملاحظة: هذا يعمل فقط مع الأسئلة المحلية، سنعدله لاحقاً
        socket.emit('answer-result', {
            correct: true,
            correctAnswer: 0,
            questionIndex: questionIndex
        });
    });

    socket.on('disconnect', () => {
        console.log('🔴 لاعب ترك:', socket.id);
        const index = waitingPlayers.findIndex(p => p.socketId === socket.id);
        if (index !== -1) waitingPlayers.splice(index, 1);
    });
});

// ===== بدء مباراة بين لاعبين =====
async function startMatch(socketId1, socketId2, questions) {
    const player1 = io.sockets.sockets.get(socketId1);
    const player2 = io.sockets.sockets.get(socketId2);

    if (!player1 || !player2) return;

    player1.emit('match-found', {
        type: 'real',
        questions: questions,
        opponentName: 'خصم حقيقي'
    });

    player2.emit('match-found', {
        type: 'real',
        questions: questions,
        opponentName: 'خصم حقيقي'
    });

    console.log(`⚔️ مباراة بين ${player1.id} و ${player2.id}`);
}

// ===== تشغيل الخادم =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 الخادم يعمل على http://localhost:3000`);
});