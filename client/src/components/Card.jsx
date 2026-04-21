import React from 'react';

function Card({ value, hidden, selected, disabled, animate }) {
  const isJoker = value === 0;
  
  let displayValue = value;
  if (isJoker) displayValue = 'JOKER';
  else if (value === 1) displayValue = 'A';
  else if (value === 11) displayValue = 'J';
  else if (value === 12) displayValue = 'Q';
  else if (value === 13) displayValue = 'K';

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
