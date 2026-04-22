import React from 'react';

function Card({ value, hidden, selected, disabled, animate }) {
  const val = typeof value === 'object' && value !== null ? value.value : value;
  const isJoker = val === 0;
  
  let displayValue = val;
  if (isJoker) displayValue = 'JOKER';
  else if (val === 1) displayValue = 'A';
  else if (val === 11) displayValue = 'J';
  else if (val === 12) displayValue = 'Q';
  else if (val === 13) displayValue = 'K';

  return (
    <div className={`playing-card ${hidden ? 'hidden-card' : ''} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${animate ? 'animate-' + animate : ''}`}>
      {hidden ? (
        <div className="card-back"></div>
      ) : (
        <div className={`card-face ${isJoker ? 'joker' : ''}`}>
          <span className="top-left">{displayValue}</span>
          <span className="center">{isJoker ? '🃏' : '♠'}</span>
          <span className="bottom-right">{displayValue}</span>
        </div>
      )}
    </div>
  );
}

export default Card;
