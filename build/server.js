"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const socket2_1 = __importDefault(require("./core/socket2"));
const socketPort = 5002;
const server = new ws_1.WebSocketServer({ port: socketPort }, () => {
    console.log(`Servidor pronto na porta ${socketPort}`);
});
let ultimaMensagemGlobal = { nome: "Servidor", texto: "Ninguém enviou nada ainda..." };
server.on('connection', (ws) => {
    console.log('Novo aluno conectado!');
    const socket = new socket2_1.default(ws, { open: true });
    socket.on("ENVIAR_MSG", (event) => {
        const mensagemRecebida = event; // Ex: { nome: "Lara", texto: "Olá!" }
        const respostaParaOAluno = ultimaMensagemGlobal;
        ultimaMensagemGlobal = mensagemRecebida;
        socket.emit("RECEBER_ULTIMA", respostaParaOAluno);
        console.log(`Troca: ${mensagemRecebida.nome} pegou a msg de ${respostaParaOAluno.nome}`);
    });
    socket.on('disconnect', () => {
        console.log('Aluno desconectado.');
    });
});
