import { WebSocketServer, WebSocket } from 'ws';
import Socket2 from "./core/socket2";

const socketPort = 5002;

const server = new WebSocketServer({ port: socketPort }, () => {
    console.log(`Servidor pronto na porta ${socketPort}`);
});

let ultimaMensagemGlobal = { nome: "Servidor", texto: "Ninguém enviou nada ainda..." };

server.on('connection', (ws: WebSocket) => {
    console.log('Novo aluno conectado!');
    const socket = new Socket2(ws, { open: true });

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