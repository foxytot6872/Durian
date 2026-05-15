const { spawn } = require('child_process');

const processes = [];
const staticPort = process.env.STATIC_PORT || '5501';
const chatbotPort = process.env.CHATBOT_API_PORT || '8000';

function startProcess(name, command, args, options = {}) {
    const child = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        ...options,
    });

    processes.push(child);

    child.on('exit', code => {
        if (code !== 0) {
            console.error(`Process ${name} exited with code ${code}`);
            shutdown(code || 1);
        }
    });

    return child;
}

function shutdown(exitCode = 0) {
    while (processes.length) {
        const child = processes.pop();
        if (child && !child.killed) {
            child.kill();
        }
    }

    process.exit(exitCode);
}

async function main() {
    startProcess('static-server', 'npx', ['--yes', 'http-server', '.', '-p', staticPort, '-c-1']);
    startProcess('chatbot-api', 'D:/python.exe', ['chatbot_api.py'], {
        env: {
            ...process.env,
            CHATBOT_API_PORT: chatbotPort,
        },
    });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

main().catch(error => {
    console.error(error);
    shutdown(1);
});
