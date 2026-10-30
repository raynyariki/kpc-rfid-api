import app from './app.js';

const PORT = process.env.PORT || 3000;

const server = app.listen(
    PORT, () => {
        console.log(`KPC RFID API running at http://localhost:${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
    }
);

function shutdown(signal){
    console.log('${signal} received. Shutting down...');
    server.close(()=>{
        console.log('Server closed.');
        process.exit(0);
    });
}

process.on('SIGINT', ()=> shutdown('SIGINT'));
process.on('SIGTERM', ()=> shutdown('SIGTERM'));