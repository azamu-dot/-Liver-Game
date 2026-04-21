import React from 'react';

function Room({ roomState, openRules }) {
  return (
    <div className="room-container glass-panel">
      <h2>ルームID: {roomState.id}</h2>
      <p className="subtitle">対戦相手を待っています...</p>
      <div className="players-list">
        {roomState.players.map((p, index) => (
          <div key={index} className="player-card">
            <span className="player-name">{p.name}</span>
            <span className={`status ${p.connected ? 'online' : 'offline'}`}>
              {p.connected ? '入室済み' : 'オフライン'}
            </span>
          </div>
        ))}
      </div>
      <button className="styled-button secondary btn-rules" onClick={openRules} style={{marginTop: '20px'}}>遊び方・ルールを見る</button>
      <div className="spinner"></div>
    </div>
  );
}

export default Room;
