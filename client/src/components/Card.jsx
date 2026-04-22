import React from 'react';

function Card({ value, hidden, selected, disabled, animate, customCardBack }) {
  const val = typeof value === 'object' && value !== null ? value.value : value;
  const isJoker = val === 0;
  
  let displayValue = val;
  let illustration = null;

  if (isJoker) {
    displayValue = 'JOKER';
    illustration = '/assets/card_joker.png';
  } else if (val === 1) {
    displayValue = 'A';
    illustration = '/assets/card_ace.png';
  } else if (val === 11) {
    displayValue = 'J';
    illustration = '/assets/card_jack.png';
  } else if (val === 12) {
    displayValue = 'Q';
    illustration = '/assets/card_queen.png';
  } else if (val === 13) {
    displayValue = 'K';
    illustration = '/assets/card_king.png';
  }

  return (
    <div className={`playing-card ${hidden ? 'hidden-card' : ''} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${animate ? 'animate-' + animate : ''}`}>
      {hidden ? (
        <div 
          className="card-back" 
          style={customCardBack ? { backgroundImage: `url(${customCardBack})`, backgroundSize: 'cover' } : { backgroundImage: `url(/assets/card_back_default.png)`, backgroundSize: 'cover' }}
        ></div>
      ) : (
        <div className={`card-face ${isJoker ? 'joker' : ''} ${illustration ? 'with-illustration' : ''}`}>
          <span className="top-left">{displayValue}</span>
          <div className="card-center">
            {illustration ? (
              <img src={illustration} alt={displayValue} className="card-illustration" />
            ) : (
              <span className="suit">♠</span>
            )}
          </div>
          <span className="bottom-right">{displayValue}</span>
        </div>
      )}
    </div>
  );
}

export default Card;
