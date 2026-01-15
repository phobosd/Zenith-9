const io = require('socket.io-client');

const socket = io('http://localhost:3000/admin');

socket.on('connect', () => {
    console.log('Connected to Admin Socket');

    socket.emit('director:manual_trigger', {
        type: 'ITEM',
        payload: {
            forcedType: 'weapon',
            hint: 'A high-tech katana. Melee weapon. No ammo.'
        }
    });

    console.log('Triggered Katana Generation');

    // Wait a bit then exit
    setTimeout(() => {
        process.exit(0);
    }, 5000);
});

socket.on('connect_error', (err) => {
    console.error('Connection Error:', err);
    process.exit(1);
});
