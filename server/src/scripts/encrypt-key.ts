import { Encryption } from '../utils/Encryption';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n--- Zenith-9 API Key Encryption Tool ---\n');

rl.question('Enter the API key you want to encrypt: ', (apiKey) => {
    if (!apiKey) {
        console.log('No key provided. Exiting.');
        rl.close();
        return;
    }

    try {
        const encrypted = Encryption.secureEncrypt(apiKey);
        console.log('\n--- Encrypted Key ---');
        console.log(encrypted);
        console.log('---------------------\n');
        console.log('Copy the string above (including the "enc:" prefix) into your guardrails.json file.');
    } catch (err) {
        console.error('Encryption failed:', err);
    } finally {
        rl.close();
    }
});
