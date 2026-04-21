import React from 'react';

function Room({ roomState }) {
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
      <div className="spinner"></div>
    </div>
  );
}

export default Room;
