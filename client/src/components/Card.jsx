import React from 'react';

function Card({ value, hidden, selected, disabled, animate, customCardBack }) {
  const val = typeof value === 'object' && value !== null ? value.value : value;
  const isJoker = val === 0;
  
  let displayValue = val;
  let illustration = null;

  if (isJoker) {
    displayValue = 'J';
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
          className="card-back-content" 
          style={customCardBack ? { backgroundImage: `url(${customCardBack})` } : { backgroundImage: `url(/assets/card_back_default.png)` }}
        ></div>
      ) : (
        <div className={`card-face-content ${isJoker ? 'joker' : ''} ${illustration ? 'is-special' : ''}`}>
          <div className="card-corner top-left">
            <span className="corner-val">{isJoker ? 'JOKER' : displayValue}</span>
            {!isJoker && <span className="mini-suit">♠</span>}
          </div>
          
          <div className="card-center-area">
            {illustration ? (
              <img src={illustration} alt={displayValue} className="premium-illustration" />
            ) : (
              <div className="standard-face">
                <span className="main-suit">♠</span>
                <span className="main-value">{displayValue}</span>
              </div>
            )}
          </div>

          <div className="card-corner bottom-right">
            <span className="corner-val">{isJoker ? 'JOKER' : displayValue}</span>
            {!isJoker && <span className="mini-suit">♠</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default Card;
