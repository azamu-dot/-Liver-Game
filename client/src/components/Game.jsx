import React, { useState } from 'react';
import Card from './Card';

function Game({ roomState, timer, socket, myId, toggleMute, isMuted, openRules, customCardBack }) {
  const [selectedCard, setSelectedCard] = useState(null);

  const me = roomState.players.find(p => p.id === myId);
  const opponent = roomState.players.find(p => p.id !== myId);

  if (roomState.phase === 'ended') {
    const isWin = me.points > opponent.points;
    const isDraw = me.points === opponent.points;
    return (
      <div className="game-container end-screen">
        <h1 className={isWin ? 'text-win' : isDraw ? 'text-draw' : 'text-lose'}>
          {isWin ? '勝利！' : isDraw ? '引き分け' : '敗北…'}
        </h1>
        <div className="final-scores">
          <div>あなたのポイント: {me.points}</div>
          <div>相手のポイント: {opponent.points}</div>
        </div>
        <div style={{marginTop: '30px'}}>
          <button className="styled-button primary" onClick={() => socket.emit('restartGame')}>
            もう一度遊ぶ
          </button>
        </div>
      </div>
    );
  }

  const handleCardClick = (card) => {
    if (roomState.phase !== 'submission') return;
    if (me.selectedCard !== null) return;
    setSelectedCard(card);
  };

  const handleSubmit = () => {
    if (selectedCard !== null) {
      socket.emit('submitCard', selectedCard);
    }
  };

  const handleSkipDiscussion = () => {
    socket.emit('skipDiscussion');
  };

  const handleReset = () => {
    if (window.confirm('ゲームを最初からやり直しますか？')) {
      socket.emit('resetGame');
    }
  };

  const renderPhaseText = () => {
    switch (roomState.phase) {
      case 'discussion': return '議論フェーズ';
      case 'submission': return '提出フェーズ';
      case 'reveal': return '結果発表';
      default: return '';
    }
  };

  return (
    <div className="game-container">
      <div className="top-bar">
        <div className="turn-info">ターン {roomState.turn}</div>
        <div className="timer">
          {renderPhaseText()} - <span className={timer <= 10 ? 'text-danger' : ''}>{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</span>
        </div>
        <div className="top-actions" style={{display: 'flex', gap: '10px'}}>
          <button className="mute-btn" onClick={openRules}>📖 ルール</button>
          <button className="mute-btn" onClick={handleReset}>🔄 リセット</button>
          <button className="mute-btn" onClick={toggleMute}>
            {isMuted ? '🔇 ミュート中' : '🎙️ マイクON'}
          </button>
        </div>
      </div>

      <div className="opponent-area">
        <div className="player-stats">
          <div className="name">{opponent.name}</div>
          <div className="points">{opponent.points} PT</div>
        </div>
        
        <div className="opponent-used-cards">
          <span className="used-label">使用済:</span>
          {opponent.usedCards && opponent.usedCards.map((c, i) => (
             <span key={i} className={`used-card-badge ${c===0?'joker':''}`}>{c === 0 ? 'J' : c}</span>
          ))}
        </div>

        <div className="cards-in-hand">
          {opponent.hand.map((_, i) => (
            <Card key={i} hidden={true} customCardBack={customCardBack} />
          ))}
        </div>
      </div>

      <div className="battle-field glass-panel">
        <div className="played-card-slot">
          {roomState.phase === 'reveal' && roomState.lastResult ? (
            <Card value={roomState.lastResult.c2} animate="reveal" customCardBack={customCardBack} />
          ) : (
            opponent.selectedCard !== null ? <Card hidden={true} customCardBack={customCardBack} /> : <div className="empty-slot">相手</div>
          )}
        </div>
        <div className="vs-text">VS</div>
        <div className="played-card-slot">
          {roomState.phase === 'reveal' && roomState.lastResult ? (
            <Card value={roomState.lastResult.c1} animate="reveal" customCardBack={customCardBack} />
          ) : (
            me.selectedCard !== null ? <Card value={me.selectedCard} customCardBack={customCardBack} /> : <div className="empty-slot">あなた</div>
          )}
        </div>
      </div>
      
      {roomState.phase === 'reveal' && roomState.lastResult && (() => {
         const { c1, c2, p1Damage, p2Damage, p1Heal, p2Heal, winner } = roomState.lastResult;
         const isP1 = me.id === roomState.players[0].id;
         const myDamage = isP1 ? p1Damage : p2Damage;
         const opponentDamage = isP1 ? p2Damage : p1Damage;
         const myHeal = isP1 ? p1Heal : p2Heal;
         const myCard = isP1 ? c1 : c2;
         const opponentCard = isP1 ? c2 : c1;
         
         let resultTitle = "";
         let resultColor = "";
         let detailText = [];
         
         if (winner === 0) {
            resultTitle = "引き分け！";
            resultColor = "text-draw";
            detailText.push("ダメージなし。カードは消費されます。");
         } else if ((winner === 1 && isP1) || (winner === 2 && !isP1)) {
            resultTitle = "勝利！";
            resultColor = "text-win";
            if (myCard.value === 0) detailText.push(`相手の「${opponentCard.value === 0 ? 'JOKER' : opponentCard.value}」を奪った！`);
            if (opponentDamage > 0) detailText.push(`${opponentDamage}ダメージを与えた！`);
            if (myHeal > 0) detailText.push(`${myHeal}ポイントを吸収した！`);
         } else {
            resultTitle = "敗北…";
            resultColor = "text-lose";
            if (opponentCard.value === 0) detailText.push(`相手に「${myCard.value === 0 ? 'JOKER' : myCard.value}」を奪われた！`);
            if (myDamage > 0) detailText.push(`${myDamage}ダメージを受けた…`);
         }

         return (
           <div className="result-banner glass-panel">
              <h2 className={resultColor}>{resultTitle}</h2>
              {detailText.map((txt, i) => <div key={i} className="detail-text">{txt}</div>)}
           </div>
         );
      })()}

      <div className="my-area">
        <div className="action-area">
          {roomState.phase === 'discussion' && (
            <button className="styled-button secondary" onClick={handleSkipDiscussion} disabled={me.skipDiscussion}>
              {me.skipDiscussion ? '相手を待っています...' : '準備完了 / 議論をスキップ'}
            </button>
          )}
          {roomState.phase === 'submission' && me.selectedCard === null && (
            <button className="styled-button primary" onClick={handleSubmit} disabled={selectedCard === null}>
              カードを提出
            </button>
          )}
          {me.selectedCard !== null && roomState.phase === 'submission' && (
             <div className="waiting-text">相手の提出を待っています...</div>
          )}
        </div>
        
        <div className="my-cards">
          {me.hand.map((card) => (
             <div key={card.id} onClick={() => handleCardClick(card)}>
               <Card value={card} selected={selectedCard && selectedCard.id === card.id} disabled={roomState.phase !== 'submission' || me.selectedCard !== null} customCardBack={customCardBack} />
             </div>
          ))}
        </div>
        <div className="player-stats">
          <div className="name">{me.name} （あなた）</div>
          <div className="points">{me.points} PT</div>
        </div>
      </div>
    </div>
  );
}

export default Game;
