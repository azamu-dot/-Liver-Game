import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Peer from 'peerjs';
import Room from './components/Room';
import Game from './components/Game';
import './index.css';

const serverUrl = import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:3001`;
const socket = io(serverUrl);

function App() {
  const [roomState, setRoomState] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [joined, setJoined] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showRules, setShowRules] = useState(false);

  // WebRTC State
  const [myPeerId, setMyPeerId] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const myPeerRef = useRef(null);
  const callMadeRef = useRef(false);

  useEffect(() => {
    const initWebRTC = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(stream);

        const peer = new Peer();
        myPeerRef.current = peer;

        peer.on('open', (id) => {
          setMyPeerId(id);
        });

        peer.on('call', (call) => {
          call.answer(stream);
          call.on('stream', (rStream) => {
            setRemoteStream(rStream);
          });
        });
      } catch (err) {
        console.warn('Microphone access denied or error:', err);
      }
    };
    initWebRTC();

    socket.on('roomState', (state) => {
      setRoomState(state);
    });

    socket.on('timerUpdate', (time) => {
      setTimer(time);
    });

    socket.on('error', (msg) => {
      alert(msg);
      setJoined(false);
    });

    return () => {
      socket.off('roomState');
      socket.off('timerUpdate');
      socket.off('error');
    };
  }, []);

  useEffect(() => {
    if (roomState && roomState.players.length === 2 && localStream && myPeerRef.current && !callMadeRef.current) {
      const me = roomState.players.find(p => p.id === socket.id);
      const opponent = roomState.players.find(p => p.id !== socket.id);
      
      // Player 1 initiates the call
      if (me && opponent && opponent.peerId && roomState.players[0].id === me.id) {
        callMadeRef.current = true;
        const call = myPeerRef.current.call(opponent.peerId, localStream);
        if (call) {
          call.on('stream', (rStream) => {
            setRemoteStream(rStream);
          });
        }
      }
    }
  }, [roomState, localStream]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!localStream.getAudioTracks()[0].enabled);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (roomId.trim() && playerName.trim()) {
      socket.emit('joinRoom', { roomId, playerName, peerId: myPeerId });
      setJoined(true);
    }
  };

  const AudioPlayer = ({ stream }) => {
    const audioRef = useRef();
    useEffect(() => {
      if (audioRef.current && stream) {
        audioRef.current.srcObject = stream;
      }
    }, [stream]);
    return <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />;
  };

  const renderRulesModal = () => (
    <div className="modal-overlay" onClick={() => setShowRules(false)}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
        <h2>ライバーゲームの遊び方</h2>
        <div className="rules-scroll">
          <ul className="rules-list">
            <li><span className="rule-badge">基本</span> お互い50ポイントからスタート。どちらかの手札がなくなった時点でポイントが多い方の勝利。0ポイント以下になった時点で強制敗北です。</li>
            <li><span className="rule-badge">進行</span> 3分の議論フェーズ（スキップ可）の後、1分の提出フェーズで手札(1〜13＋ジョーカー)からカードを1枚提出します。</li>
            <li><span className="rule-badge">勝敗</span> 大きい数字が勝ち。負けた方は「自分が出したカードの数字」分ポイントが減ります（勝者はダメージなし）。同じ数字は引き分けです。</li>
            <li><span className="rule-badge special">特例① 高コスト吸収</span> 「11, 12, 13」で勝利した場合、相手にダメージを与えるだけでなく、そのダメージ分自分のポイントが回復します。</li>
            <li><span className="rule-badge special">特例② 1の逆剋</span> 「1」は最弱ですが、「11, 12, 13」に対してのみ勝利します。この時、負けた側は50ポイント失います（勝者の回復はなし）。</li>
            <li><span className="rule-badge special">特例③ ジョーカー</span> 出せば無条件で勝利し、相手が出したカードを「自分の手札」として奪います。ただし相手にダメージは与えません。ジョーカー同士は引き分けで捨て札になります。</li>
          </ul>
        </div>
        <button className="styled-button primary close-btn" onClick={() => setShowRules(false)}>閉じる</button>
      </div>
    </div>
  );

  if (!joined || !roomState) {
    return (
      <div className="app-container setup-container">
        <h1 className="title">LIVER GAME</h1>
        
        <div className="setup-description glass-panel">
          <p className="highlight-text">【ルームIDについて】</p>
          <p>対戦相手と合流するための「合言葉」です。任意の好きな文字を入力してください。<br/>同じルームIDを入力したプレイヤー同士でマッチングしてゲームが始まります。</p>
          <p style={{ marginTop: '10px', color: '#66fcf1', fontWeight: 'bold' }}>※ ボイスチャット機能を使うため、ブラウザのマイク許可を「ON」にしてください。</p>
        </div>

        <form onSubmit={handleJoin} className="setup-form glass-panel">
          <input
            type="text"
            placeholder="ルームID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            required
            className="styled-input"
          />
          <input
            type="text"
            placeholder="プレイヤー名"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            required
            className="styled-input"
          />
          <button type="submit" className="styled-button primary">入室する</button>
        </form>

        <button className="styled-button secondary btn-rules" onClick={() => setShowRules(true)}>遊び方・ルールを見る</button>

        {showRules && renderRulesModal()}
      </div>
    );
  }

  return (
    <div className="app-container">
      {remoteStream && <AudioPlayer stream={remoteStream} />}
      {roomState.phase === 'waiting' && <Room roomState={roomState} openRules={() => setShowRules(true)} />}
      {roomState.phase !== 'waiting' && (
        <Game
          roomState={roomState}
          timer={timer}
          socket={socket}
          myId={socket.id}
          toggleMute={toggleMute}
          isMuted={isMuted}
          openRules={() => setShowRules(true)}
        />
      )}
      {showRules && renderRulesModal()}
    </div>
  );
}

export default App;
