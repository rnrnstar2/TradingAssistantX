/**
 * EA接続テストスクリプト
 * 
 * 使い方:
 * 1. Hedge Systemを起動（pnpm run hedge:dev）
 * 2. 別のターミナルで: node docs/ea-integration/test-ea-connection.js
 * 3. MT4でEAをアタッチ
 * 4. 接続成功メッセージを確認
 */

const http = require('http');

const PORT = 8080;

// テストサーバー作成
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/ea/sync') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('\n=== EA Data Received ===');
        console.log('Type:', data.type);
        
        switch(data.type) {
          case 'EA_CONNECTION_INFO':
            console.log('✅ EA Connected Successfully!');
            console.log('Account:', data.account);
            console.log('Broker:', data.broker);
            console.log('Balance:', data.balance, data.currency);
            console.log('Leverage:', data.leverage);
            break;
            
          case 'EA_PRICE_REALTIME':
            console.log('📊 Price Update');
            console.log('Symbol:', data.symbol);
            console.log('Bid:', data.bid, '/ Ask:', data.ask);
            console.log('Spread:', data.spread, 'pips');
            break;
            
          case 'EA_ORDER_UPDATE':
            console.log('📋 Order Update');
            console.log('Total Orders:', data.totalOrders);
            if (data.orders && data.orders.length > 0) {
              data.orders.forEach(order => {
                console.log(`  - ${order.type} ${order.lots} ${order.symbol} @ ${order.openPrice}`);
              });
            }
            break;
            
          case 'EA_DISCONNECTION':
            console.log('❌ EA Disconnected');
            console.log('Reason:', data.reason);
            break;
        }
        
        console.log('Timestamp:', data.timestamp);
        console.log('========================\n');
        
        // 成功レスポンス
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Data received' }));
        
      } catch (error) {
        console.error('Error parsing JSON:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
      }
    });
    
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// サーバー起動
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║      EA Connection Test Server         ║
╠════════════════════════════════════════╣
║  Server running on port ${PORT}           ║
║  Waiting for EA connection...          ║
║                                        ║
║  Press Ctrl+C to stop                  ║
╚════════════════════════════════════════╝
`);
});

// 終了処理
process.on('SIGINT', () => {
  console.log('\n\nServer stopped.');
  process.exit(0);
});