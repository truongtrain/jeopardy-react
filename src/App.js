import './App.css';
import './index.scss';
import React, { useState, useEffect, useReducer } from 'react';
import { FullScreen, useFullScreenHandle } from 'react-full-screen';
import Podium from './components/Podium';
import Monitor from './components/Monitor';
import Name from './components/Name';
import Board from './components/Board';
import sampleGame from './resources/sample_game.json';

export const ScoreContext = React.createContext();
export const StartTimerContext = React.createContext();
export const PlayerContext = React.createContext();
export const GameInfoContext = React.createContext();

let availableClueNumbers = new Array(30).fill(true);
let showData = {};
let stats = { numCorrect: 0, numClues: 0, coryatScore: 0, battingAverage: 0 };
let player = { name: '', finalResponse: '', wager: 0, conceded: false};
let response = { seconds: 0, interval: {}, countdown: false};
let msg = new SpeechSynthesisUtterance();
const initialGameInfo = {round: -1, imageUrl: 'logo', weakest: '', lastCorrect: '', disableAnswer: false};

function reducer(state, action) {
  switch (action.type) {
    case 'increment_round': {
      state.round = action.round;
      state.disableAnswer = false;
      state.imageUrl = '';
      return state;
    }
    case 'update_image':
      state.imageUrl = action.imageUrl;
      return state;
    case 'set_weakest_contestant':
      state.weakest = action.weakest;
      return state;
    case 'set_last_correct_contestant':
      state.lastCorrect = action.lastCorrect;
      state.disableAnswer = false;
      return state;
    case 'disable_player_answer':
      state.disableAnswer = true;
      return state;
    case 'enable_player_answer':
      state.disableAnswer = false;
      return state;
    default:
      return state;
  }
}

const App = () => {
  const [gameInfo, dispatchGameInfo] = useReducer(reducer, initialGameInfo);
  const [responseTimerIsActive, setResponseTimerIsActive] = useState(false);
  const [disableClue, setDisableClue] = useState(false);
  const [scores, setScores] = useState(null);
  const [message, setMessage] = useState({ line1: '', line2: '' });
  const [board, setBoard] = useState(null);
  const [answered, setAnswered] = useState([]);
  const handle = useFullScreenHandle(); 

  useEffect(() => {
    fetch('http://localhost:5000/game/3769')
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        showData = data;
        setBoard(showData.jeopardy_round);
      },
      () => {
        // load sample game if service not available
        showData = sampleGame;
        setBoard(showData.jeopardy_round);
      })
  }, []);

  // determines how fast the player clicks after the clue is read
  useEffect(() => {
    if (responseTimerIsActive) {
      response.interval = setInterval(() => response.seconds += 0.01, 10);
    } else {
      clearInterval(response.interval);
    }
    return () => clearInterval(response.interval);
  }, [responseTimerIsActive]);

  function loadBoard(playerNameParam) {
    player.name = playerNameParam;
    loadContestants(playerNameParam);
    dispatchGameInfo({ type: 'increment_round', round: 0});
  }

  function startRound() {
    if (gameInfo.round === 0) {
      dispatchGameInfo({ type: 'increment_round', round: 1});
      displayClueByNumber(1);
    } else if (gameInfo.round === 1) {
      setUpDoubleJeopardyBoard();
    } else if (gameInfo.round === 1.5) {
      dispatchGameInfo({ type: 'increment_round', round: 2});
      displayClueByNumber(1);
    } else if (gameInfo.round === 2) {
      showFinalJeopardyCategory();
    }
  }

  function loadContestants(playerNameParam) {
    dispatchGameInfo({ type: 'set_weakest_contestant', weakest: showData.weakest_contestant});
    let filteredContestants = showData.contestants.filter(
      contestant => contestant !== showData.weakest_contestant
    );
    filteredContestants.push(playerNameParam);
    let tempContestants = {};
    filteredContestants.forEach(
      contestant => tempContestants[contestant] = { score: 0, response: '', wager: null }
    );
    setScores(tempContestants);
  }

  function setUpDoubleJeopardyBoard() {
    dispatchGameInfo({ type: 'increment_round', round: 1.5});
    let thirdPlace = player.name;
    Object.keys(scores).forEach(contestant => {
      if (scores[contestant].score < scores[thirdPlace].score) {
        thirdPlace = contestant;
      }
    });
    dispatchGameInfo({ type: 'set_last_correct_contestant', lastCorrect: thirdPlace});
    setBoard(showData.double_jeopardy_round);
    availableClueNumbers = new Array(30).fill(true);
    setMessageLines('');
    setDisableClue(false);
  }

  function setMessageLines(text1, text2 = '') {
    setMessage({
      line1: text1,
      line2: text2
    });
  }

  function handleIncorrectResponses(incorrectContestants, clue, scoreChange) {
    let incorrectMessage = '';
    clue.response.incorrect_responses = clue.response.incorrect_responses.filter(response =>
      !response.includes(gameInfo.weakest + ':'));
    for (let i = 0; i < incorrectContestants.length; i++) {
      if (incorrectContestants[i] !== gameInfo.weakest && !answered.includes(incorrectContestants[i])) {
        incorrectMessage += clue.response.incorrect_responses[i];
        scores[incorrectContestants[i]].score -= scoreChange;
        answered.push(incorrectContestants[i]);
        readText('No');
        response.seconds = 0;
      }
      break;
    }
    if (clue.daily_double_wager > 0 || player.conceded) {
      setMessageLines(incorrectMessage, clue.response.correct_response);
    } else {
      setMessageLines(incorrectMessage);
    }
    setScores(scores);

  }

  function handleCorrectResponse(correctContestant, scoreChange, clue, nextClueNumber, nextClue, row, col) {
    dispatchGameInfo({ type: 'set_last_correct_contestant', lastCorrect: correctContestant});
    scores[correctContestant].score += scoreChange;
    setScores(scores);
    setBoardState(row, col, 'closed');
    setMessageLines(correctContestant + ': What is ' + clue.response.correct_response + '?');
    if (nextClueNumber > 0 && nextClue) {
      setTimeout(() => {
        setMessageLines(correctContestant + ': ' + nextClue.category + ' for $' + nextClue.value);
      }, 2000);
      response.seconds = 0;
      setTimeout(() => displayNextClue(), 4000);
    }
  }

  function getOpponentDailyDoubleWager(clue) {
    // don't change opponent score if this is not the same opponent who answered
    // the daily double in the actual broadcast game 
    if (clue.response.correct_contestant && clue.response.correct_contestant !== gameInfo.lastCorrect) {
      return 0;
    }
    const currentScore = scores[gameInfo.lastCorrect].score;
    if (gameInfo.round === 1) {
      if (clue.daily_double_wager > currentScore) {
        if (currentScore > 1000) {
          return currentScore;
        }
        return 1000;
      }
    } else if (gameInfo.round === 2) {
      if (clue.daily_double_wager > currentScore) {
        if (currentScore > 1000) {
          return currentScore;
        }
        return 2000;
      }
    }
    return clue.daily_double_wager;
  }

  function updateOpponentScores(row, col) {
    const clue = board[col][row];
    // don't update opponent score if this is the player's daily double
    if (isPlayerDailyDouble(row, col)) {
      return;
    }
    const nextClueNumber = getNextClueNumber();
    let message;
    let nextClue;
    if (nextClueNumber > 0) {
      nextClue = getClue(nextClueNumber);
    }
    if (nextClue) {
      message = gameInfo.lastCorrect + ': ' + nextClue.category + ' for $' + nextClue.value;
    }
    const incorrectContestants = clue.response.incorrect_contestants
      .filter(contestant => contestant !== gameInfo.weakest)
      .filter(contestant => !answered.includes(contestant));
    let correctContestant = clue.response.correct_contestant;
    if (correctContestant === gameInfo.weakest) {
      correctContestant = '';
    }
    let scoreChange = clue.daily_double_wager > 0 ? getOpponentDailyDoubleWager(clue) : clue.value;
    // handle triple stumpers
    if (!correctContestant) {
      if (incorrectContestants.length > 0) {
        handleIncorrectResponses(incorrectContestants, clue, scoreChange);
      } else {
        setMessageLines(clue.response.correct_response);
      }
      // go to next clue selected by opponent
      if (nextClueNumber > 0 && gameInfo.lastCorrect !== player.name) {
        setTimeout(() => setMessageLines(message), 2500);
        setTimeout(() => displayNextClue(), 4500);
      }
    } else if (incorrectContestants.length > 0) {
      handleIncorrectResponses(incorrectContestants, clue, scoreChange);
      if (player.conceded) {
        setTimeout(() => handleCorrectResponse(correctContestant, scoreChange, clue, nextClueNumber, nextClue, row, col), 3000);
      }
    } else { // no incorrect responses
      handleCorrectResponse(correctContestant, scoreChange, clue, nextClueNumber, nextClue, row, col);
    }
  }

  function displayNextClue() {
    setResponseTimerIsActive(false);
    setAnswered([]);
    setMessageLines('');
    const nextClueNumber = getNextClueNumber();
    if (nextClueNumber > 0) {
      displayClueByNumber(nextClueNumber);
    } else {
      dispatchGameInfo({ type: 'update_image', imageUrl: 'logo'});
    }
  }

  function displayClueImage(row, col) {
    const url = board[col][row].url;
    if (url) {
      dispatchGameInfo({ type: 'update_image', imageUrl: url});
      setMessageLines('');
    } else {
      dispatchGameInfo({ type: 'update_image', imageUrl: ''});
    }
  }

  function enterFullScreen() {
    if (!handle.active && window.innerWidth > 1000) {
      handle.enter();
    }
  }

  function displayClueByNumber(clueNumber) {
    enterFullScreen();
    player.conceded = false;
    dispatchGameInfo({ type: 'enable_player_answer'});
    setAnswered([]);
    updateAvailableClueNumbers(clueNumber);
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 5; row++) {
        if (board[col][row].number === clueNumber) {
          if (!isPlayerDailyDouble(row, col) && board[col][row].daily_double_wager > 0) {
            if (gameInfo.lastCorrect !== player.name) {
              setMessageLines('Daily Double', gameInfo.lastCorrect + ': I will wager $' + board[col][row].daily_double_wager);
            }
          }
          setBoardState(row, col, 'clue');
          if (isPlayerDailyDouble(row, col) && !board[col][row].url) {
            setMessageLines(board[col][row].text);
          }
          readClue(row, col);
          return;
        }
      }
    }
  }

  function getNextClueNumber() {
    for (let i = 1; i <= 30; i++) {
      if (availableClueNumbers[i - 1] === true) {
        const clue = getClue(i);
        // if this is a daily double that was not answered by the contestant in the televised game, skip this clue
        if (clue && clue.daily_double_wager > 0 && !isContestantsDailyDouble(clue, gameInfo.lastCorrect)) {
          continue;
        }
        return i;
      }
    }
    return -1;
  }

  function isContestantsDailyDouble(clue, contestant) {
    return clue.response.correct_contestant === contestant || clue.response.incorrect_contestants.includes(contestant);
  }

  function updateAvailableClueNumbers(clueNumber) {
    availableClueNumbers[clueNumber - 1] = false;
  }

  function getClue(clueNumber) {
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 5; row++) {
        if (board && board[col][row].number === clueNumber) {
          return board[col][row];
        }
      }
    }
    return null;
  }

  function readClue(row, col) {
    setDisableClue(true);
    stats.numClues += 1;
    let clue;
    if (gameInfo.round <= 1) {
      clue = showData.jeopardy_round[col][row];
    } else if (gameInfo.round === 2 || gameInfo.round === 1.5) {
      clue = showData.double_jeopardy_round[col][row];
    }
    displayClueImage(row, col);
    msg.text = clue.text;
    window.speechSynthesis.speak(msg);
    msg.addEventListener('end', function clearClue() {
      dispatchGameInfo({ type: 'update_image', imageUrl: ''});
      response.seconds = 0;
      if (isPlayerDailyDouble(row, col) && board[col][row].daily_double_wager > 0) {
        setBoardState(row, col, 'eye');
      } else if (board[col][row].daily_double_wager > 0) {
        concede(row, col);
      } else if (board[col][row].visible === 'clue') {
        setBoardState(row, col, 'buzzer');
      }
      setResponseTimerIsActive(true);
      msg.removeEventListener('end', clearClue, true);
    }, true);
  }

  function setBoardState(row, col, state) {
    const board_copy = [...board];
    board[col][row].visible = state;
    setBoard(board_copy);
  }

  function isPlayerDailyDouble(row, col) {
    return gameInfo.lastCorrect === player.name && board[col][row].daily_double_wager > 0;
  }

  function concede(row, col) {
    setBoardState(row, col, 'closed');
    setResponseTimerIsActive(false);
    player.conceded = true;
    updateOpponentScores(row, col);
    if (gameInfo.lastCorrect === player.name) {
      setDisableClue(false);
    }
  }

  function readText(text) {
    msg.text = text;
    window.speechSynthesis.speak(msg);
    // keep the buzzer disabled for 500ms
    setTimeout(() => {
      dispatchGameInfo({ type: 'enable_player_answer'});
      setResponseTimerIsActive(true);
    }, 500);
  }

  function showFinalJeopardyCategory() {
    dispatchGameInfo({ type: 'increment_round', round: 3});
    setMessageLines('');
    msg.text = 'The final jeopardy category is ' + showData.final_jeopardy.category + '. How much will you wager';
    window.speechSynthesis.speak(msg);
  }

  if (!board) {
    return <h1 className='center-screen'>Welcome to JEOPARDY!</h1>;
  }
  return (
    gameInfo.round === -1 ? <Name loadBoard={loadBoard} /> :
    <FullScreen handle={handle}>
      <ScoreContext.Provider value={scores}>
        <StartTimerContext.Provider value={response.countdown}>
          <PlayerContext.Provider value={player.name}>
            <GameInfoContext.Provider value={{ state: gameInfo, dispatch: dispatchGameInfo}}>
      <main>
        <meta name='viewport' content='width=device-width, initial-scale=1' />
          <Podium />
        <div id='monitor-container' onClick={startRound}>
          <Monitor message={message} imageUrl={gameInfo.imageUrl} />
        </div>
        <Board board={board} displayClueByNumber={displayClueByNumber}
          disableClue={disableClue}
          setMessageLines={setMessageLines} updateOpponentScores={updateOpponentScores}
          enterFullScreen={enterFullScreen} updateAvailableClueNumbers={updateAvailableClueNumbers}
          readClue={readClue} setBoardState={setBoardState} concede={concede} readText={readText}
          player={player} showData={showData} setScores={setScores}
          stats={stats} msg={msg} response={response}
          setResponseTimerIsActive={setResponseTimerIsActive}
          setDisableClue={setDisableClue}
          answered={answered} setAnswered={setAnswered}/>
      </main>
      </GameInfoContext.Provider>
      </PlayerContext.Provider>
      </StartTimerContext.Provider>
      </ScoreContext.Provider>
    </FullScreen>
  );
}

export default App;
