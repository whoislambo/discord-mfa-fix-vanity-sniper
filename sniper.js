const WebSocket = require('ws');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');
const ayarlar = {
    ahsusarisinkizlar: '', //claimer tokeni yaz
    bodrumdahepyeniasklar: '', //vanity'İ claimleyecegin sunucunun idsini yaz
    senicokozluyorum: './mfa.txt' //mfa tokeni okuyup izleyecek bu dosyayı kendinize gore degistirin
};
let ws = null;
let heartbeatInterval = null;
let sequence = null;
let sessionId = null;
let mfaahsusarisinkizlar = '';
let guildVanities = new Map();
function mfayiyukle() {
    try {
        if (fs.existsSync(ayarlar.senicokozluyorum)) {
            mfaahsusarisinkizlar = fs.readFileSync(ayarlar.senicokozluyorum, 'utf8').trim();
            if (mfaahsusarisinkizlar) {
                console.log('ahsusarisinkizlari aldim');
            } else {
            }
        } else {
            fs.writeFileSync(ayarlar.senicokozluyorum, '');
        }
    } catch (err) {
    }
}
function coksarhosoldum() {
    fs.watch(ayarlar.senicokozluyorum, (eventType) => {
        if (eventType === 'change') {
            const newahsusarisinkizlar = fs.readFileSync(ayarlar.senicokozluyorum, 'utf8').trim();
            if (newahsusarisinkizlar !== mfaahsusarisinkizlar && newahsusarisinkizlar.length > 0) {
                mfaahsusarisinkizlar = newahsusarisinkizlar;
                console.log('mfayi gectim');
            }
        }
    });
}
async function whiskysarapfalanfilan(vanityUrl) {
    const headers = {
        'Authorization': ayarlar.ahsusarisinkizlar,
        'Content-Type': 'application/json',
        'X-Super-Properties': 'eyJicm93c2VyIjoiQ2hyb21lIiwiYnJvd3Nlcl91c2VyX2FnZW50IjoiQ2hyb21lIiwiY2xpZW50X2J1bWxkX251bWJlciI6MzU1NjI0fQ=='
    };
    if (mfaahsusarisinkizlar && mfaahsusarisinkizlar.length > 0) {
        headers['X-Discord-MFA-Authorization'] = mfaahsusarisinkizlar;
    }
    const body = JSON.stringify({ code: vanityUrl });
    try {
        const startTime = Date.now();
        const fetchModule = await import('node-fetch');
        const fetchFunc = fetchModule.default;
        const response = await fetchFunc(
            `https://discord.com/api/v10/guilds/${ayarlar.bodrumdahepyeniasklar}/vanity-url`,
            {
                method: 'PATCH',
                headers: headers,
                body: body
            }
        );

        const responseTime = Date.now() - startTime;
        const data = await response.json();
        if (response.ok) {
            console.log(`\n${'='.repeat(50)}`);
            console.log(`vanity claimed`);
            console.log(`response: ${responseTime}ms`);
            console.log(`${'='.repeat(50)}\n`);
            return true;
        } else {
            console.log(`\n${'='.repeat(50)}`);
            console.log(`${responseTime}ms`);
            console.log(`${'='.repeat(50)}\n`);
            if (data.code === 60003 || (data.message && data.message.includes('MFA'))) {
            } else if (data.code === 50035) {
            } else if (data.code === 30007) {
            } else if (data.code === 10008) {
            }
            
            return false;
        }
    } catch (err) {
        return false;
    }
}
function heartbeatgonder() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ op: 1, d: sequence }));
    }
}
function baglantilarimvar() {
    ws = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json');
    ws.on('open', () => {
    });
    ws.on('message', async (data) => {
        const payload = JSON.parse(data);
        const { op, d, t, s } = payload;
        if (s) sequence = s;
        switch (op) {
            case 10:
                heartbeatInterval = setInterval(heartbeatgonder, d.heartbeat_interval);
                ws.send(JSON.stringify({
                    op: 2,
                    d: {
                        token: ayarlar.ahsusarisinkizlar,
                        intents: 513,
                        properties: {
                            os: 'Windows',
                            browser: 'Firefox',
                            device: 'desktop'
                        }
                    }
                }));
                break;
            case 0:
                if (t === 'READY') {
                    sessionId = d.session_id;
                    console.log('='.repeat(50));
                    console.log('ready');
                    console.log(`${d.guilds.length} sunucu`);
                    console.log('='.repeat(50) + '\n');
                    d.guilds.forEach((guild, i) => {
                        if (guild.vanity_url_code) {
                            guildVanities.set(guild.id, guild.vanity_url_code);
                            console.log(`[${i + 1}] ${guild.id} -> ${guild.vanity_url_code}`);
                        }
                    });
                }
                if (t === 'GUILD_UPDATE') {
                    const guildId = d.id;
                    const yeniurl = d.vanity_url_code;
                    const eskiurl = guildVanities.get(guildId);
                    console.log(`${guildId}`);
                    if (eskiurl && !yeniurl) {
                        await whiskysarapfalanfilan(eskiurl);
                    }
                    if (yeniurl) {
                        guildVanities.set(guildId, yeniurl);
                    } else {
                        guildVanities.delete(guildId);
                    }
                }
                if (t === 'GUILD_DELETE') {
                    const guildId = d.id;
                    const eskiurl = guildVanities.get(guildId);
                    if (!d.unavailable && eskiurl) {
                        await whiskysarapfalanfilan(eskiurl);
                    }                    
                    guildVanities.delete(guildId);
                }
                break;
            case 1:
                heartbeatgonder();
                break;
            case 7:
                console.log('yeniden baglaniyorum');
                if (heartbeatInterval) clearInterval(heartbeatInterval);
                ws.close();
                setTimeout(baglantilarimvar, 1000);
                break;
            case 9:
                if (heartbeatInterval) clearInterval(heartbeatInterval);
                setTimeout(baglantilarimvar, 5000);
                break;
        }
    });
    ws.on('close', (code, reason) => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        setTimeout(baglantilarimvar, 5000);
    });
    ws.on('error', (err) => {
    });
}
console.log('\n' + '='.repeat(50));
console.log('     Developed by xuppL');
console.log('='.repeat(50) + '\n');
mfayiyukle();
coksarhosoldum();
baglantilarimvar();
