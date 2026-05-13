// Bet Receipt Generator

import { Bet } from '@/store/useStore';

export interface BetReceipt {
  receiptId: string;
  betId: string;
  userId: string;
  gameType: string;
  number: string;
  amount: number;
  potentialWin: number;
  odds: string;
  drawDate: string;
  status: string;
  result?: string;
  createdAt: string;
  qrCode?: string;
}

export function generateBetReceipt(bet: Bet): BetReceipt {
  const multiplier = getMultiplier(bet.gameType);
  
  return {
    receiptId: `TN-${bet.id.substring(0, 8).toUpperCase()}`,
    betId: bet.id,
    userId: bet.userId,
    gameType: formatGameType(bet.gameType),
    number: bet.number,
    amount: bet.amount,
    potentialWin: bet.potentialWin,
    odds: `${multiplier}x`,
    drawDate: bet.drawDate,
    status: bet.status,
    result: bet.result,
    createdAt: bet.createdAt,
    qrCode: generateQRData(bet),
  };
}

function getMultiplier(gameType: string): number {
  switch (gameType) {
    case 'thailand-2d':
    case 'kalyan-jodi':
      return 90;
    case 'thailand-3up':
    case 'kalyan-patti':
      return 900;
    case 'kalyan-single':
      return 9;
    default:
      return 1;
  }
}

function formatGameType(gameType: string): string {
  return gameType
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function generateQRData(bet: Bet): string {
  // Generate a simple verification code
  return `TN:${bet.id}:${bet.number}:${bet.amount}`;
}

export function formatReceiptText(receipt: BetReceipt): string {
  const lines = [
    '╔════════════════════════════════════╗',
    '║        TICKETNOVA LOTTERY          ║',
    '║         BET RECEIPT                ║',
    '╠════════════════════════════════════╣',
    `║ Receipt #: ${receipt.receiptId.padEnd(22)}║`,
    `║ Date: ${new Date(receipt.createdAt).toLocaleString().padEnd(27)}║`,
    '╠════════════════════════════════════╣',
    `║ Game: ${receipt.gameType.padEnd(27)}║`,
    `║ Number: ${receipt.number.padEnd(25)}║`,
    `║ Bet Amount: ${receipt.amount.toFixed(2).padEnd(21)}SAR ║`,
    `║ Odds: ${receipt.odds.padEnd(27)}║`,
    `║ Potential Win: ${receipt.potentialWin.toFixed(2).padEnd(17)}SAR ║`,
    '╠════════════════════════════════════╣',
    `║ Draw Date: ${receipt.drawDate.padEnd(22)}║`,
    `║ Status: ${receipt.status.toUpperCase().padEnd(25)}║`,
  ];
  
  if (receipt.result) {
    lines.push(`║ Result: ${receipt.result.padEnd(25)}║`);
  }
  
  lines.push('╠════════════════════════════════════╣');
  lines.push('║ Keep this receipt for verification ║');
  lines.push('║     www.ticketnova.com             ║');
  lines.push('╚════════════════════════════════════╝');
  
  return lines.join('\n');
}

export function downloadReceipt(receipt: BetReceipt): void {
  const text = formatReceiptText(receipt);
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TicketNova-Receipt-${receipt.receiptId}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateReceiptHTML(receipt: BetReceipt): string {
  const statusColor = 
    receipt.status === 'won' ? '#00E676' :
    receipt.status === 'lost' ? '#FF3D57' :
    receipt.status === 'pending' ? '#FFD700' : '#888';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>TicketNova Receipt - ${receipt.receiptId}</title>
  <style>
    body { 
      font-family: 'Courier New', monospace; 
      background: #0A0A0F; 
      color: #fff;
      padding: 20px;
      margin: 0;
    }
    .receipt {
      max-width: 400px;
      margin: 0 auto;
      background: linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,140,0,0.05));
      border: 2px solid rgba(255,215,0,0.3);
      border-radius: 20px;
      padding: 24px;
    }
    .header {
      text-align: center;
      border-bottom: 1px dashed rgba(255,215,0,0.3);
      padding-bottom: 16px;
      margin-bottom: 16px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      background: linear-gradient(135deg, #FFD700, #FF8C00);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .receipt-id {
      font-size: 12px;
      color: #888;
      margin-top: 8px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .label { color: #888; }
    .value { font-weight: bold; }
    .number {
      font-size: 32px;
      text-align: center;
      padding: 16px;
      background: rgba(255,215,0,0.1);
      border-radius: 12px;
      margin: 16px 0;
      color: #FFD700;
    }
    .status {
      text-align: center;
      padding: 12px;
      border-radius: 8px;
      background: rgba(${receipt.status === 'won' ? '0,230,118' : receipt.status === 'lost' ? '255,61,87' : '255,215,0'},0.1);
      color: ${statusColor};
      font-weight: bold;
      text-transform: uppercase;
    }
    .footer {
      text-align: center;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px dashed rgba(255,215,0,0.3);
      font-size: 11px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="logo">🎰 TicketNova</div>
      <div>BET RECEIPT</div>
      <div class="receipt-id">${receipt.receiptId}</div>
    </div>
    
    <div class="row">
      <span class="label">Game</span>
      <span class="value">${receipt.gameType}</span>
    </div>
    
    <div class="number">${receipt.number}</div>
    
    <div class="row">
      <span class="label">Bet Amount</span>
      <span class="value">${receipt.amount.toFixed(2)} SAR</span>
    </div>
    
    <div class="row">
      <span class="label">Odds</span>
      <span class="value">${receipt.odds}</span>
    </div>
    
    <div class="row">
      <span class="label">Potential Win</span>
      <span class="value" style="color: #FFD700">${receipt.potentialWin.toFixed(2)} SAR</span>
    </div>
    
    <div class="row">
      <span class="label">Draw Date</span>
      <span class="value">${receipt.drawDate}</span>
    </div>
    
    ${receipt.result ? `
    <div class="row">
      <span class="label">Result</span>
      <span class="value">${receipt.result}</span>
    </div>
    ` : ''}
    
    <div class="status">${receipt.status}</div>
    
    <div class="footer">
      <div>${new Date(receipt.createdAt).toLocaleString()}</div>
      <div style="margin-top: 8px;">Keep this receipt for verification</div>
      <div>www.ticketnova.com</div>
    </div>
  </div>
</body>
</html>
  `;
}

export function printReceipt(receipt: BetReceipt): void {
  const html = generateReceiptHTML(receipt);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
