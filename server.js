require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const sampleQuestions = [
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

const waitingPlayers = [];

io.on('connection', (socket) => {
    console.log('🟢 لاعب جديد:', socket.id);

    socket.on('find-match', (data) => {
        const { playerId, username } = data;
        console.log(`🔍 ${username} يبحث عن خصم...`);

        waitingPlayers.push({
            socketId: socket.id,
            playerId: playerId,
            username: username
        });

        setTimeout(() => {
            const index = waitingPlayers.findIndex(p => p.socketId === socket.id);
            if (index === -1) return;

            if (waitingPlayers.length >= 2) {
                const opponent = waitingPlayers.find(p => p.socketId !== socket.id);
                if (opponent) {
                    waitingPlayers.splice(index, 1);
                    const opponentIndex = waitingPlayers.indexOf(opponent);
                    waitingPlayers.splice(opponentIndex, 1);
                    startMatch(socket.id, opponent.socketId);
                    return;
                }
            }

            waitingPlayers.splice(index, 1);
            socket.emit('match-found', {
                type: 'bot',
                questions: sampleQuestions,
                opponentName: 'الروبوت 🤖'
            });
        }, 4000);
    });

    socket.on('submit-answer', (data) => {
        const { questionIndex, answer } = data;
        const question = sampleQuestions[questionIndex];
        const isCorrect = (answer === question.correct);
        
        socket.emit('answer-result', {
            correct: isCorrect,
            correctAnswer: question.correct,
            questionIndex: questionIndex
        });
    });

    socket.on('disconnect', () => {
        console.log('🔴 لاعب ترك:', socket.id);
        const index = waitingPlayers.findIndex(p => p.socketId === socket.id);
        if (index !== -1) waitingPlayers.splice(index, 1);
    });
});

function startMatch(socketId1, socketId2) {
    const player1 = io.sockets.sockets.get(socketId1);
    const player2 = io.sockets.sockets.get(socketId2);

    if (!player1 || !player2) return;

    player1.emit('match-found', {
        type: 'real',
        questions: sampleQuestions,
        opponentName: 'خصم حقيقي'
    });

    player2.emit('match-found', {
        type: 'real',
        questions: sampleQuestions,
        opponentName: 'خصم حقيقي'
    });

    console.log(`⚔️ مباراة بين ${player1.id} و ${player2.id}`);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 الخادم يعمل على http://localhost:3000`);
});